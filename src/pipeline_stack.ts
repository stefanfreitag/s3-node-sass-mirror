import { Artifact } from '@aws-cdk/aws-codepipeline';
import { GitHubSourceAction, GitHubTrigger } from '@aws-cdk/aws-codepipeline-actions';
import { Stack, StackProps, Construct, SecretValue, Stage, StageProps } from '@aws-cdk/core';
import { CdkPipeline, SimpleSynthAction } from '@aws-cdk/pipelines';
import { devEnv } from './main';
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

    const sourceArtifact = new Artifact();
    const cloudAssemblyArtifact = new Artifact();

    const pipeline = new CdkPipeline(this, 'node-sass-mirror-app-pipeline', {
      crossAccountKeys: false,
      cloudAssemblyArtifact,

      sourceAction: new GitHubSourceAction({
        actionName: 'GitHub',
        output: sourceArtifact,
        oauthToken: SecretValue.secretsManager('my-github-token', { jsonField: 'my-github-token' }),
        trigger: GitHubTrigger.POLL,
        owner: 'stefanfreitag',
        repo: 's3-node-sass-mirror',
      }),

      synthAction: SimpleSynthAction.standardYarnSynth({
        sourceArtifact,
        cloudAssemblyArtifact,
        buildCommand: 'npm run build',
      }),
    });

    pipeline.addApplicationStage(new NodeSassMirrorApp(this, 'dev-stage', {
      env: devEnv,
    }));

  }
}