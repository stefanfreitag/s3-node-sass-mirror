import * as path from 'path';
import { LambdaIntegration, RestApi } from '@aws-cdk/aws-apigateway';
import { PolicyStatement, Effect, AnyPrincipal } from '@aws-cdk/aws-iam';
import { Code, Function, LayerVersion, Runtime } from '@aws-cdk/aws-lambda';
import { RetentionDays } from '@aws-cdk/aws-logs';
import { BlockPublicAccess, Bucket, BucketEncryption, BucketPolicy } from '@aws-cdk/aws-s3';
import { App, Construct, Duration, RemovalPolicy, Stack, StackProps } from '@aws-cdk/core';

export interface NodeSassMirrorProperties extends StackProps{
  /**
   * IP addresses (CIDR format) that can access the mirrored content.
   */
  readonly whitelist: Array<string>;

}

export class NodeSassMirrorStack extends Stack {
  constructor(scope: Construct, id: string, props: NodeSassMirrorProperties = {
    whitelist: [],
  }) {
    super(scope, id, props);

    const bucket = this.createBucket(props.whitelist);
    const layer = this.createLambdaLayer();
    const f = this.createFunction(layer, bucket);
    bucket.grantPut(f);
    this.prepareApiGw(f);
  }


  private prepareApiGw(f: Function) {
    const gw = new RestApi(this, 'api-gw', {
      description: 'S3 Mirror API Gateway',
    });
    const integration = new LambdaIntegration(f);


    const v1Resource = gw.root.addResource('v1.0');
    const notifyResource = v1Resource.addResource('mirror');

    const apiKey = gw.addApiKey('ApiKey', {
      apiKeyName: 'api-key',
    });

    const rNotify = notifyResource.addMethod('POST', integration, { apiKeyRequired: true });

    const plan = gw.addUsagePlan('UsagePlan', {
      name: 'api-key-usage-plan',
      apiKey: apiKey,
      throttle: {
        rateLimit: 10,
        burstLimit: 2,
      },
    });

    plan.addApiStage({
      stage: gw.deploymentStage,
      throttle: [
        {
          method: rNotify,
          throttle: {
            rateLimit: 5,
            burstLimit: 2,
          },
        },
      ],
    });
    return { gw, apiKey };
  }


  private createFunction(layer: LayerVersion, bucket: Bucket) {

    return new Function(this, 'fnMirror', {

      runtime: Runtime.PYTHON_3_8,
      description: 'Upload a node-sass version to an S3 bucket',
      code: Code.fromAsset(path.join(__dirname, '../lambda')),
      handler: 'main.main',
      timeout: Duration.minutes(5),
      memorySize: 256,
      logRetention: RetentionDays.ONE_WEEK,
      layers: [layer],
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });
  }


  private createLambdaLayer(): LayerVersion {
    return new LayerVersion(this, 'NodeSassMirrorLayer', {
      code: Code.fromAsset(path.join(__dirname, '../layer')),
      compatibleRuntimes: [Runtime.PYTHON_3_8],
      license: 'Apache-2.0',
      description: 'A layer containing dependencies for the node-sass mirror',
    });
  }

  createBucket(whitelist: Array<string>): Bucket {
    const bucket = new Bucket(this, 'bucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      publicReadAccess: false,
      versioned: false,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const bucketContentStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:GetObject'],
      resources: [bucket.bucketArn + '/*'],
      principals: [new AnyPrincipal()],
      conditions: {
        IpAddress: {
          'aws:SourceIp': whitelist,
        },
      },
    });

    const bucketStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:ListBucket', 's3:GetBucketLocation'],
      resources: [bucket.bucketArn],
      principals: [new AnyPrincipal()],
      conditions: {
        IpAddress: {
          'aws:SourceIp': whitelist,
        },
      },
    });

    const bucketPolicy = new BucketPolicy(this, 'bucketPolicy', {
      bucket: bucket,
    });

    bucketPolicy.document.addStatements(
      bucketContentStatement,
      bucketStatement,
    );
    return bucket;
  }

}

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new NodeSassMirrorStack(app, 'my-stack-dev', {
  env: devEnv,
  whitelist: ['87.122.211.250/32'],
});
app.synth();