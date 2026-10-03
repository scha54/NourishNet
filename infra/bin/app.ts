import * as cdk from 'aws-cdk-lib';
import { NourishNetFoundationStack } from '../lib/nourishnet-foundation-stack';

const app = new cdk.App();

const environment = (app.node.tryGetContext('environment') ?? 'dev') as
  | 'dev'
  | 'staging'
  | 'prod';

new NourishNetFoundationStack(app, `NourishNetFoundationStack-${environment}`, {
  environment,
  tags: {
    Project: 'NourishNet',
    Environment: environment,
  },
});

cdk.Tags.of(app).add('Project', 'NourishNet');
