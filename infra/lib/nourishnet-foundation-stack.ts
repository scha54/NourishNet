import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import { CorsHttpMethod, HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Construct } from 'constructs';

export interface NourishNetFoundationStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'prod';
}

/**
 * NourishNet Foundation Stack
 *
 * Provisions all AWS resources required by Spec 1 — Foundation:
 *   - Cognito User Pool + Client + Groups          (Tasks 5.2)
 *   - DynamoDB single-table + GSI1 + GSI2          (Task 5.3)
 *   - API Gateway HTTP API + Cognito authorizer    (Task 5.4)
 *   - Lambda health-handler + api-handler          (Task 5.5)
 *   - CloudWatch Dashboard + Alarm + Amplify App   (Task 5.6)
 *
 * Constructs are added in Tasks 5.2 – 5.6. This file is the
 * stub created in Task 5.1 to satisfy the CDK entry-point import.
 */
export class NourishNetFoundationStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly table: dynamodb.Table;
  public readonly httpApi: HttpApi;
  public readonly cognitoAuthorizer: HttpJwtAuthorizer;

  constructor(scope: Construct, id: string, props: NourishNetFoundationStackProps) {
    super(scope, id, props);

    // Tag all resources in this stack with Project and Environment.
    cdk.Tags.of(this).add('Project', 'NourishNet');
    cdk.Tags.of(this).add('Environment', props.environment);

    // ── Task 5.2: Cognito User Pool and Client ────────────────────────────────

    const isProd = props.environment === 'prod';

    // Req 10.1: UserPool named NourishNetUserPool-<environment>
    // Req 10.2: Password policy — min 12 chars, uppercase, lowercase, digit, symbol
    // Req 10.6: Email sign-in alias
    // Req 10.7: Deletion protection on prod
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `NourishNetUserPool-${props.environment}`,
      signInAliases: { email: true },
      autoVerify: { email: true },
      selfSignUpEnabled: true,
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      deletionProtection: isProd,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Req 10.4: UserPoolClient with USER_PASSWORD_AUTH + REFRESH_TOKEN_AUTH
    // Req 10.5: No client secret (public client)
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: false,
        adminUserPassword: false,
      },
      accessTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    // Req 10.3: Four groups — Donors, Organizations, Volunteers, Admins
    const groups = ['Donors', 'Organizations', 'Volunteers', 'Admins'] as const;
    for (const groupName of groups) {
      new cognito.CfnUserPoolGroup(this, `Group${groupName}`, {
        userPoolId: this.userPool.userPoolId,
        groupName,
      });
    }

    // CDK Outputs (stubs — completed fully in Task 5.6)
    new cdk.CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: this.userPoolClient.userPoolClientId });

    // ── Task 5.3: DynamoDB Table with GSI1 and GSI2 ──────────────────────────

    // Req 11.1: Table named NourishNetTable-<env>, PK=PK (String), SK=SK (String)
    // Req 11.2: PAY_PER_REQUEST billing mode
    // Req 11.3: Point-in-time recovery enabled
    // Req 11.4: DynamoDB Streams with NEW_AND_OLD_IMAGES
    // Req 11.7: Deletion protection on prod
    this.table = new dynamodb.Table(this, 'Table', {
      tableName: `NourishNetTable-${props.environment}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      deletionProtection: isProd,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Req 11.5: GSI1 — GSI1PK (String) / GSI1SK (String), on-demand billing
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    // Req 11.6: GSI2 — GSI2PK (String) / GSI2SK (String), on-demand billing
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
    });

    new cdk.CfnOutput(this, 'TableName', { value: this.table.tableName });

    // ── Task 5.4: API Gateway with Cognito JWT Authorizer ────────────────────

    // Req 13.1: HttpApi named NourishNetApi-<env>
    // Req 13.3: CORS — allow frontend origin (placeholder *), Authorization +
    //           Content-Type headers, GET/POST/PUT/DELETE/OPTIONS methods
    // Req 13.5: $default stage with auto-deploy (createDefaultStage: true is the CDK default)
    this.httpApi = new HttpApi(this, 'HttpApi', {
      apiName: `NourishNetApi-${props.environment}`,
      createDefaultStage: true,
      corsPreflight: {
        // Placeholder: replaced with Amplify App URL in Task 5.6
        allowOrigins: ['*'],
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.PUT,
          CorsHttpMethod.DELETE,
          CorsHttpMethod.OPTIONS,
        ],
      },
    });

    // Req 13.2: Cognito JWT authorizer referencing NourishNetUserPool-<env>
    // jwtIssuer is the Cognito User Pool provider URL
    // jwtAudience is the User Pool Client ID (the intended recipient of the JWT)
    this.cognitoAuthorizer = new HttpJwtAuthorizer(
      'CognitoAuthorizer',
      this.userPool.userPoolProviderUrl,
      {
        authorizerName: `CognitoAuthorizer-${props.environment}`,
        jwtAudience: [this.userPoolClient.userPoolClientId],
      },
    );

    // Req 13.4: All routes will be prefixed /v1/ — enforced per route in Task 5.5

    // CDK Output — ApiUrl
    new cdk.CfnOutput(this, 'ApiUrl', { value: this.httpApi.apiEndpoint });

    // ── Task 5.5: Lambda Functions and Routes ────────────────────────────────

    // Handler entry points — these are TypeScript sources that import from the
    // backend domain/ and repositories/ layers, so they must be bundled (not
    // shipped as raw .ts). NodejsFunction uses esbuild to transpile each entry
    // point and its imports into a single CommonJS artifact the nodejs20.x
    // runtime can load.
    //
    // __dirname resolves to cdk.out/lib at runtime (the compiled JS location),
    // so we go up 3 levels (lib → cdk.out → infra → repo root) to reach
    // backend/src/handlers.
    const handlersDir = path.join(__dirname, '../../../backend/src/handlers');
    const healthHandlerEntry = path.join(handlersDir, 'health.ts');
    const apiHandlerEntry = path.join(handlersDir, 'api-handler.ts');

    // Shared esbuild bundling options. The AWS SDK v3 is available in the
    // nodejs20.x runtime, so we keep it external to shrink the bundle.
    const bundling = {
      format: OutputFormat.CJS,
      target: 'node20',
      externalModules: ['@aws-sdk/*'],
    };

    // ── health-handler Lambda ────────────────────────────────────────────────

    // Req 14.2: Dedicated IAM role with only the permissions health-handler needs.
    // Security steering: no wildcard actions or resources.
    const healthHandlerRole = new iam.Role(this, 'HealthHandlerRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        // Allow writing logs to CloudWatch
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Req 14.2: health-handler only needs dynamodb:DescribeTable on the specific table ARN.
    healthHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['dynamodb:DescribeTable'],
        resources: [this.table.tableArn],
      }),
    );

    // Req 14.4: Dedicated LogGroup with 30-day retention.
    const healthHandlerLogGroup = new logs.LogGroup(this, 'HealthHandlerLogGroup', {
      logGroupName: `/aws/lambda/health-handler-${props.environment}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Req 14.1: nodejs20.x runtime. Req 14.6: 10s timeout, 256 MB memory.
    // Req 14.3: TABLE_NAME and ENVIRONMENT as env vars.
    const healthHandler = new NodejsFunction(this, 'HealthHandler', {
      functionName: `health-handler-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: healthHandlerEntry,
      handler: 'handler',
      bundling,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      role: healthHandlerRole,
      logGroup: healthHandlerLogGroup,
      environment: {
        TABLE_NAME: this.table.tableName,
        ENVIRONMENT: props.environment,
      },
    });

    // ── api-handler Lambda (placeholder) ─────────────────────────────────────

    // Req 14.2: Dedicated IAM role — separate from health-handler role.
    const apiHandlerRole = new iam.Role(this, 'ApiHandlerRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Req 14.2: api-handler needs read/write access on the table and both GSIs.
    // Security steering: no wildcard resources — each resource ARN is explicit.
    const gsi1Arn = `${this.table.tableArn}/index/GSI1`;
    const gsi2Arn = `${this.table.tableArn}/index/GSI2`;

    // Table-level permissions (GetItem, PutItem, UpdateItem, Query)
    apiHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:Query',
        ],
        resources: [this.table.tableArn, gsi1Arn, gsi2Arn],
      }),
    );

    // Req 14.4: Dedicated LogGroup with 30-day retention.
    const apiHandlerLogGroup = new logs.LogGroup(this, 'ApiHandlerLogGroup', {
      logGroupName: `/aws/lambda/api-handler-${props.environment}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Req 14.1, 14.3, 14.6 — same runtime/timeout/memory as health-handler.
    const apiHandler = new NodejsFunction(this, 'ApiHandler', {
      functionName: `api-handler-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: apiHandlerEntry,
      handler: 'handler',
      bundling,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      role: apiHandlerRole,
      logGroup: apiHandlerLogGroup,
      environment: {
        TABLE_NAME: this.table.tableName,
        USER_POOL_ID: this.userPool.userPoolId,
        ENVIRONMENT: props.environment,
      },
    });

    // ── API Gateway Routes ───────────────────────────────────────────────────

    // Req 17.1: GET /v1/health → health-handler, no authorizer.
    this.httpApi.addRoutes({
      path: '/v1/health',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('HealthHandlerIntegration', healthHandler),
      // authorizationType: NONE is the default when no authorizer is provided
    });

    // ANY /v1/{proxy+} → api-handler with Cognito JWT authorizer.
    this.httpApi.addRoutes({
      path: '/v1/{proxy+}',
      methods: [HttpMethod.ANY],
      integration: new HttpLambdaIntegration('ApiHandlerIntegration', apiHandler),
      authorizer: this.cognitoAuthorizer,
    });

    // ── Task 5.6: CloudWatch Dashboard, Alarm, and Amplify Hosting ──────────

    // ── CloudWatch Dashboard (Req 16.2) ──────────────────────────────────────
    // Dashboard named NourishNet-<env> with Lambda invocation counts,
    // error rates, and p99 durations for both Lambdas.

    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `NourishNet-${props.environment}`,
    });

    // Metrics — health-handler
    const healthInvocations = healthHandler.metricInvocations({ period: cdk.Duration.minutes(5) });
    const healthErrors = healthHandler.metricErrors({ period: cdk.Duration.minutes(5) });
    const healthDuration = healthHandler.metricDuration({
      period: cdk.Duration.minutes(5),
      statistic: cloudwatch.Stats.p(99),
    });

    // Metrics — api-handler
    const apiInvocations = apiHandler.metricInvocations({ period: cdk.Duration.minutes(5) });
    const apiErrors = apiHandler.metricErrors({ period: cdk.Duration.minutes(5) });
    const apiDuration = apiHandler.metricDuration({
      period: cdk.Duration.minutes(5),
      statistic: cloudwatch.Stats.p(99),
    });

    // Row 1: Invocation counts for both Lambdas
    const invocationsWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Invocations',
      width: 12,
      left: [healthInvocations, apiInvocations],
    });

    // Row 1: Error rates for both Lambdas
    const errorsWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Errors',
      width: 12,
      left: [healthErrors, apiErrors],
    });

    // Row 2: p99 duration for both Lambdas
    const durationWidget = new cloudwatch.GraphWidget({
      title: 'Lambda p99 Duration (ms)',
      width: 24,
      left: [healthDuration, apiDuration],
    });

    dashboard.addWidgets(invocationsWidget, errorsWidget);
    dashboard.addWidgets(durationWidget);

    // ── CloudWatch Alarm (Req 16.3 + 16.4) ───────────────────────────────────
    // Alarm triggers when combined error rate > 5% over a 5-minute period.
    // Uses a MathExpression: (healthErrors + apiErrors) / (healthInvocations + apiInvocations) > 0.05
    //
    // We need separate metrics with unique IDs for the MathExpression.
    const healthErrorsM1 = healthHandler.metricErrors({ period: cdk.Duration.minutes(5) });
    const healthInvocationsM2 = healthHandler.metricInvocations({ period: cdk.Duration.minutes(5) });
    const apiErrorsM3 = apiHandler.metricErrors({ period: cdk.Duration.minutes(5) });
    const apiInvocationsM4 = apiHandler.metricInvocations({ period: cdk.Duration.minutes(5) });

    const errorRateExpression = new cloudwatch.MathExpression({
      expression: '(m1 + m3) / (m2 + m4)',
      usingMetrics: {
        m1: healthErrorsM1,
        m2: healthInvocationsM2,
        m3: apiErrorsM3,
        m4: apiInvocationsM4,
      },
      period: cdk.Duration.minutes(5),
      label: 'Combined Lambda Error Rate',
    });

    const errorRateAlarm = new cloudwatch.Alarm(this, 'LambdaErrorRateAlarm', {
      alarmName: `NourishNet-LambdaErrorRate-${props.environment}`,
      alarmDescription: 'Triggers when combined Lambda error rate exceeds 5% over 5 minutes',
      metric: errorRateExpression,
      threshold: 0.05,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    // Req 16.4: On prod, connect alarm to an SNS topic for alert delivery.
    if (isProd) {
      const alertTopic = new sns.Topic(this, 'AlertTopic', {
        topicName: `NourishNet-Alerts-${props.environment}`,
        displayName: 'NourishNet Production Alerts',
      });
      errorRateAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
    }

    // ── Amplify Hosting App (Req 15.1 – 15.4) ────────────────────────────────
    // L1 CfnApp construct — @aws-cdk/aws-amplify-alpha is not in this project.
    // SPA rewrite: /* → /index.html (200) for client-side routing.
    //
    // HTTPS enforcement (Req 15.4): Amplify Hosting serves all traffic over
    // HTTPS and redirects HTTP → HTTPS automatically on its managed domains.
    // A custom rule with an `http://` source is rejected by the Amplify API
    // ("HTTP URLs cannot be used in custom rules"), so we rely on the
    // platform's built-in HTTPS redirect rather than a hand-rolled rule.
    const amplifyApp = new amplify.CfnApp(this, 'AmplifyApp', {
      name: `NourishNet-${props.environment}`,
      customRules: [
        {
          // SPA rewrite: all paths → /index.html with 200 (Req 15.3)
          source: '/<*>',
          target: '/index.html',
          status: '200',
        },
      ],
    });

    // Req 15.1 / 9.4: Tags are applied via cdk.Tags.of(this) at the top of
    // the constructor, so the Amplify App inherits them automatically.

    // CfnOutput: AmplifyAppUrl (the default Amplify-generated domain)
    new cdk.CfnOutput(this, 'AmplifyAppUrl', {
      value: `https://${amplifyApp.attrDefaultDomain}`,
      description: 'Amplify Hosting default domain for the NourishNet frontend',
    });
  }
}
