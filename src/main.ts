import { App } from '@aws-cdk/core';
import { PipelineStack } from './pipeline_stack';

export const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new PipelineStack(app, 'PipelineStack', {
  env: devEnv,
});

app.synth();
