# NourishNet — Deployment Guide

This guide describes how to deploy the NourishNet foundation stack to AWS, connect the React frontend to AWS Amplify Hosting, wire up environment variables, and tear environments down when they are no longer needed.

The infrastructure is defined with the AWS CDK in the [`infra/`](../infra) workspace. The CDK app provisions a single stack per environment — `NourishNetFoundationStack-<environment>` — containing the Cognito User Pool, DynamoDB single table, API Gateway HTTP API, Lambda functions, CloudWatch dashboard/alarm, and the Amplify Hosting app.

Supported environments are `dev`, `staging`, and `prod`. All examples below use `dev` and `prod`; substitute `staging` wherever appropriate.

---

## Prerequisites

Before deploying, make sure the following are installed and configured.

### Node.js 20

The project targets the Node.js 20 runtime (Lambda functions run on `nodejs20.x`). Use Node.js 20 locally to match.

```bash
node --version   # should report v20.x
```

### AWS CLI

Install the AWS CLI and configure credentials for the target account and region. The CDK uses the default credential chain, so any valid profile or environment configuration works.

```bash
aws --version
aws configure            # set access key, secret, and default region
aws sts get-caller-identity   # confirm the active account and identity
```

Ensure your default region is the region you intend to deploy into — the DynamoDB table, Cognito pool, and other resources are regional.

### AWS CDK

The CDK toolkit is available through the `infra/` workspace (`npx cdk`). Before the first deployment into a given account/region, bootstrap the environment. Run this from the `infra/` workspace directory:

```bash
cd infra
npx cdk bootstrap aws://<account-id>/<region>
```

Replace `<account-id>` with your 12-digit AWS account ID (from `aws sts get-caller-identity`) and `<region>` with your target region. Bootstrapping is a one-time step per account/region.

---

## Deploying with the CDK

All CDK commands run from the `infra/` workspace directory.

### Build before synth or deploy

`infra/cdk.json` sets the CDK app entry point to compiled JavaScript:

```json
{ "app": "node cdk.out/bin/app.js" }
```

Because the app is run as compiled JS (not via `ts-node`), you must compile the TypeScript to `cdk.out/` **before** every synth or deploy. The infra `build` script runs `tsc` using `infra/tsconfig.json` (which sets `outDir` to `cdk.out`):

```bash
cd infra
npm run build        # tsc → emits cdk.out/bin/app.js and cdk.out/lib/*.js
```

Re-run `npm run build` whenever you change any file under `infra/bin/` or `infra/lib/`.

### Environment selection

The CDK app reads the target environment from the `environment` context parameter and defaults to `dev` when it is not supplied:

```typescript
const environment = app.node.tryGetContext('environment') ?? 'dev';
```

The stack is named `NourishNetFoundationStack-<environment>`, and every resource is tagged with `Project=NourishNet` and `Environment=<environment>`.

### Deploy to dev

```bash
cd infra
npm run build
npx cdk synth  --context environment=dev
npx cdk deploy --context environment=dev
```

This creates (or updates) the `NourishNetFoundationStack-dev` stack.

### Deploy to prod

```bash
cd infra
npm run build
npx cdk synth  --context environment=prod
npx cdk deploy --context environment=prod
```

This creates (or updates) the `NourishNetFoundationStack-prod` stack.

> **Prod safety:** In the `prod` environment the stack enables **deletion protection** on the Cognito User Pool and the DynamoDB table, and sets their removal policy to `RETAIN`. This prevents accidental deletion of production user accounts and data. See [Teardown](#teardown) for how this affects `cdk destroy`.

---

## Amplify Hosting Deployment

The CDK stack provisions an AWS Amplify Hosting app named `NourishNet-<environment>` to serve the built output of the [`frontend/`](../frontend) workspace (a Vite + React single-page application). The app is configured with:

- An **SPA rewrite rule** — `/<*>` → `/index.html` (status `200`) — so client-side routing works for deep links.
- An **HTTPS redirect rule** — `http://<*>` → `https://<*>` (status `301`) — so all traffic is served over HTTPS.

Provisioning the Amplify app via CDK creates the app shell, but connecting a source repository and running the first build is a **post-deployment step** performed in the Amplify console:

1. Open the **AWS Amplify** console in the deployment region and select the `NourishNet-<environment>` app.
2. **Connect a repository branch** — choose your Git provider, authorise access, and select the repository and branch to deploy (for example, `main` for prod).
3. Confirm the build settings produce the frontend output. The frontend is built with:

   ```bash
   cd frontend
   npm run build        # tsc && vite build → outputs to frontend/dist
   ```

   Amplify serves the contents of `frontend/dist`.
4. **Trigger the initial build.** Amplify will build and deploy the branch, then serve it at the app's default domain (exposed as the `AmplifyAppUrl` stack output).
5. Set the frontend environment variables in the Amplify console before or during the first build — see [Environment Variable Configuration](#environment-variable-configuration).

---

## Environment Variable Configuration

Configuration flows in one direction: **CDK stack outputs → `.env.local` (local dev) / Amplify environment settings (production)**.

### CDK stack outputs

After a successful `cdk deploy`, the stack prints the following `CfnOutput` values (also visible in the CloudFormation console under the stack's **Outputs** tab):

| Stack output | Description |
|--------------|-------------|
| `ApiUrl` | Base URL of the API Gateway HTTP API |
| `UserPoolId` | Cognito User Pool ID |
| `UserPoolClientId` | Cognito User Pool App Client ID (public client, no secret) |
| `TableName` | DynamoDB table name (`NourishNetTable-<environment>`) |
| `AmplifyAppUrl` | Default Amplify Hosting domain serving the frontend |

### Frontend environment variables

The Vite frontend reads these variables at build time (declared in `frontend/src/vite-env.d.ts`). Map each stack output to the corresponding Vite variable:

| Frontend variable | Source stack output | Notes |
|-------------------|---------------------|-------|
| `VITE_API_URL` | `ApiUrl` | Must be an HTTPS URL — the API client rejects HTTP endpoints |
| `VITE_USER_POOL_ID` | `UserPoolId` | |
| `VITE_USER_POOL_CLIENT_ID` | `UserPoolClientId` | |
| `VITE_ENVIRONMENT` | — | Set to the environment name (`dev`, `staging`, or `prod`) |

### Local development

Copy the deployed stack outputs into `frontend/.env.local`:

```bash
# frontend/.env.local
VITE_API_URL=https://<ApiUrl>
VITE_USER_POOL_ID=<UserPoolId>
VITE_USER_POOL_CLIENT_ID=<UserPoolClientId>
VITE_ENVIRONMENT=dev
```

Then run the dev server:

```bash
cd frontend
npm run dev
```

### Production

Set the same four variables in the Amplify console under **App settings → Environment variables** for the `NourishNet-<environment>` app, using the outputs from the matching stack (for example, use the `prod` stack outputs for the prod Amplify app). Trigger a new build so Amplify picks up the values.

> **Never commit secrets or environment config.** The repository `.gitignore` excludes all `.env*` files at the root level (only `.env.example` is tracked), per the security steering. Do not commit `frontend/.env.local` or paste real IDs/URLs into source control.

---

## Teardown

Tear an environment down with `cdk destroy` from the `infra/` workspace. Rebuild first if you have changed any infra source since the last build.

### Dev

```bash
cd infra
npm run build
npx cdk destroy --context environment=dev
```

Because the `dev` environment uses `RemovalPolicy.DESTROY` for the Cognito User Pool and DynamoDB table (and does not enable deletion protection), the stack and its resources are removed cleanly.

### Prod

Production is protected against accidental deletion, so a plain `cdk destroy` will **fail** until the protections are removed. Before destroying the `prod` stack:

1. **Disable deletion protection** on the Cognito User Pool and the DynamoDB table (via the AWS console or CLI), since the `prod` stack sets `deletionProtection: true` on both.
2. **Account for retained data.** The `prod` User Pool and table use `RemovalPolicy.RETAIN`, so they are not deleted automatically with the stack — remove them manually if that is truly intended.
3. **Review backups and point-in-time recovery (PITR).** The DynamoDB table has PITR enabled. Confirm you have any required backups/exports before deleting, as destroying the table removes its continuous backups.

Only after these considerations:

```bash
cd infra
npm run build
npx cdk destroy --context environment=prod
```

> Destroying a production environment removes user accounts and redistribution data. Treat this as a high-risk, irreversible operation and confirm with your team before proceeding.
