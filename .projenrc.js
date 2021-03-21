const { AwsCdkTypeScriptApp, Stability } = require('projen');

const AUTOMATION_TOKEN = 'PROJEN_GITHUB_TOKEN';

const project = new AwsCdkTypeScriptApp({
  cdkVersion: '1.94.1',
  name: 's3-node-sass-mirror',
  authorAddress: 'stefan.freitag@udo.edu',
  authorName: 'Stefan Freitag',
  description: 'Can be used to setup a node-sass mirror in an S3 bucket.',
  keywords: [
    'cdk', 'gradle', 's3', 'node-sass',
  ],
  antitamper: false,
  catalog: {
    twitter: 'stefanfreitag',
    announce: false,
  },
  dependabot: false,
  stability: Stability.EXPERIMENTAL,
  defaultReleaseBranch: 'master',
  cdkDependencies: [
    '@aws-cdk/aws-apigateway',
    '@aws-cdk/aws-iam',
    '@aws-cdk/aws-lambda',
    '@aws-cdk/aws-logs',
    '@aws-cdk/aws-s3',
    '@aws-cdk/aws-sqs',
    '@aws-cdk/aws-lambda-event-sources',
    '@aws-cdk/pipelines',
    '@aws-cdk/aws-codebuild',
    '@aws-cdk/aws-codepipeline',
    '@aws-cdk/aws-codepipeline-actions',
  ],
  python: {
    distName: 'cdk-s3-node-sass-mirror',
    module: 'cdk_s3_node_sass_mirror',
  },
  context: {
    '@aws-cdk/core:newStyleStackSynthesis': 'true',
    'whitelist': ['87.123.55.147/32'],
  },
});

// create a custom projen and yarn upgrade workflow
// source: https://github.com/aws-samples/amazon-eks-cicd-codebuild/blob/master/.projenrc.js
const workflow = project.github.addWorkflow('ProjenYarnUpgrade');

workflow.on({
  schedule: [{
    cron: '11 0 1 * *',
  }],
  workflow_dispatch: {}, // allow manual triggering
});

workflow.addJobs({
  upgrade: {
    'runs-on': 'ubuntu-latest',
    'steps': [
      { uses: 'actions/checkout@v2' },
      {
        uses: 'actions/setup-node@v1',
        with: {
          'node-version': '10.17.0',
        },
      },
      { run: 'yarn upgrade' },
      { run: 'yarn projen:upgrade' },
      // submit a PR
      {
        name: 'Create Pull Request',
        uses: 'peter-evans/create-pull-request@v3',
        with: {
          'token': '${{ secrets.' + AUTOMATION_TOKEN + ' }}',
          'commit-message': 'chore: upgrade projen',
          'branch': 'auto/projen-upgrade',
          'title': 'chore: upgrade projen and yarn',
          'body': 'This PR upgrades projen and yarn upgrade to the latest version',
          'labels': 'auto-merge',
        },
      },
    ],
  },
});


project.gitignore.exclude('__pycache__/', 'layer/python/');
project.synth();