import '@aws-cdk/assert/jest';
import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import { App } from '@aws-cdk/core';
import { NodeSassMirrorStack } from '../src/main';

test('Stack contains required AWS Lambda', () => {
  const app = new App();
  const stack = new NodeSassMirrorStack(app, 'test');


  expectCDK(stack).to(
    haveResource('AWS::Lambda::Function', {
      Runtime: 'python3.8',
      Handler: 'main.main',
      Description: 'Upload a node-sass version to an S3 bucket',
      Timeout: 300,
      MemorySize: 256,
    }),
  );


  expectCDK(stack).to(
    haveResource('AWS::Lambda::LayerVersion', {
      CompatibleRuntimes: [
        'python3.8',
      ],
      Description: 'A layer containing dependencies for the node-sass mirror',
      LicenseInfo: 'Apache-2.0',
    }),
  );
});


test('Stack contains required AWS S3 Bucket', () => {
  const app = new App();
  const stack = new NodeSassMirrorStack(app, 'test');


  expectCDK(stack).to(
    haveResource('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    }),
  );
});
