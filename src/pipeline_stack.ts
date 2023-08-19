import { Stack, StackProps, Stage, StageProps } from 'aws-cdk-lib';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import { NodeSassMirrorStack } from './node_sass_mirror';


export class NodeSassMirrorApp extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);
    new NodeSassMirrorStack(this, 'node-sass-mirror-dev', {
      whitelist: [],
    });
  }
}


export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    //const sourceArtifact = new Artifact();
    //const cloudAssemblyArtifact = new Artifact();

    ///const pipeline =
    new CodePipeline(this, 'node-sass-mirror-app-pipeline', {
      crossAccountKeys: false,
      //TODO: cloudAssemblyArtifact,
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection('my-org/my-app', 'main', {
          connectionArn: 'arn:aws:codestar-connections:us-east-1:222222222222:connection/7d2469ff-514a-4e4f-9003-5ca4a43cdc41', // Created using the AWS console * });',
        }),
        commands: [
          'npm ci',
          'npm run build',
          'npx cdk synth',
        ],
      }),
      /**      sourceAction: new GitHubSourceAction({
        actionName: 'GitHub',
        output: sourceArtifact,
        oauthToken: SecretValue.secretsManager('my-github-token', { jsonField: 'my-github-token' }),
        trigger: GitHubTrigger.POLL,
        owner: 'stefanfreitag',
        repo: 's3-node-sass-mirror',
      }),
 */
      /**
      synthAction: SimpleSynthAction.standardYarnSynth({
        sourceArtifact,
        cloudAssemblyArtifact,
        buildCommand: 'npm run build',

      }),
       */
    });
    /**
    pipeline.addApplicationStage(new NodeSassMirrorApp(this, 'dev-stage', {
      env: devEnv,
    }));
*/
  }
}