const { awscdk } = require('projen');
const { Stability } = require('projen/lib/cdk');
const { UpgradeDependenciesSchedule } = require('projen/lib/javascript');

const AUTOMATION_TOKEN = 'PROJEN_GITHUB_TOKEN';

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.91.0',
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

  defaultReleaseBranch: 'master',
  python: {
    distName: 'cdk-s3-node-sass-mirror',
    module: 'cdk_s3_node_sass_mirror',
  },
  context: {
    '@aws-cdk/core:newStyleStackSynthesis': 'true',
    'whitelist': ['87.123.55.147/32'],
  },
});


const common_exclude = ['.history/', '.venv', '.idea', '__pycache__/', 'layer/python/'];
project.npmignore.exclude(...common_exclude);
project.gitignore.exclude(...common_exclude);
project.synth();