import * as path from 'path';
import { Aws, CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { AwsIntegration, PassthroughBehavior, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AnyPrincipal, Effect, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Function, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { BlockPublicAccess, Bucket, BucketEncryption, BucketPolicy } from 'aws-cdk-lib/aws-s3';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

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
    const f: Function = this.createFunction(layer, bucket);
    const messageQueue = this.createQueue();

    //Allow function to upload data to the S3 bucket
    bucket.grantPut(f);
    bucket.grantRead(f);

    //Link the API Gateway to the SQS message queue
    const role = this.createApiGwRole(messageQueue);
    this.prepareApiGw(messageQueue, role);
    //Link the SQS message queue to the Lambda function
    const source = new SqsEventSource(messageQueue);
    f.addEventSource(source);

    new CfnOutput(this, 'bucket_name', {
      description: 'S3 bucket name',
      value: bucket.bucketRegionalDomainName,
    });
  }

  private createQueue() {
    const dlq = new Queue(this, 'deadletterQueue', {
      retentionPeriod: Duration.days(7),
    });

    return new Queue(this, 'processingQueue', {
      visibilityTimeout: Duration.seconds(300),

      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 1,
      },
    });
  }

  private createApiGwRole(messageQueue: Queue):Role {
    const credentialsRole = new Role(this, 'Role', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });

    credentialsRole.attachInlinePolicy(
      new Policy(this, 'SendMessagePolicy', {
        statements: [
          new PolicyStatement({
            actions: ['sqs:SendMessage'],
            effect: Effect.ALLOW,
            resources: [messageQueue.queueArn],
          }),
        ],
      }),
    );
    return credentialsRole;
  }
  private prepareApiGw(messageQueue: Queue, role: Role) {


    const gw = new RestApi(this, 'api-gw', {
      description: 'S3 Mirror API Gateway',
    });


    const v1Resource = gw.root.addResource('v1.0');
    const mirrorResource = v1Resource.addResource('mirror');

    const apiKey = gw.addApiKey('ApiKey', {
    });
    new CfnOutput(this, 'api_key', {
      description: 'API key identifier',
      value: apiKey.keyId,
    });

    const template= '&MessageBody=This+is+a+test+message&MessageAttribute.1.Name=tag&MessageAttribute.1.Value.StringValue=$input.params(\'tag\')&MessageAttribute.1.Value.DataType=String';

    const method = mirrorResource.addMethod('POST',
      new AwsIntegration({
        service: 'sqs',
        path: `${Aws.ACCOUNT_ID}/${messageQueue.queueName}`,

        integrationHttpMethod: 'POST',
        options: {
          credentialsRole: role,
          passthroughBehavior: PassthroughBehavior.NEVER,
          requestParameters: {
            'integration.request.header.Content-Type': '\'application/x-www-form-urlencoded\'',
          },
          requestTemplates: {
            'application/json': 'Action=SendMessage'+template,
          },
          integrationResponses: [
            {
              statusCode: '200',
              responseTemplates: {
                'application/json': '{"done": true}',
              },
            },
          ],
        },
      }), { methodResponses: [{ statusCode: '200' }], apiKeyRequired: true },

    );


    const plan = gw.addUsagePlan('UsagePlan', {
      name: 'api-key-usage-plan',
      throttle: {
        rateLimit: 10,
        burstLimit: 2,
      },
    });
    plan.addApiKey(apiKey);
    plan.addApiStage({
      stage: gw.deploymentStage,
      throttle: [
        {
          method: method,
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
