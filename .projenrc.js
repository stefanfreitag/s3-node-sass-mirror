const { AwsCdkTypeScriptApp, Stability } = require('projen');

const project = new AwsCdkTypeScriptApp({
  cdkVersion: "1.81.0",
  name: "s3-node-sass-mirror",
  authorAddress: "stefan.freitag@udo.edu",
  authorName: "Stefan Freitag",
  description:"Can be used to setup a node-sass mirror in an S3 bucket.",
  keywords: [
    "cdk", "gradle", "s3", "node-sass"
  ],
  antitamper: false,
  catalog:{
    twitter: 'stefanfreitag',
    announce: false
  },
  dependabot: false,
  stability: Stability.EXPERIMENTAL,

  cdkDependencies:[
    "@aws-cdk/aws-apigateway",
    "@aws-cdk/aws-iam",
    "@aws-cdk/aws-lambda",
    "@aws-cdk/aws-logs",
    "@aws-cdk/aws-s3",
  ],
  python: {
    distName:'cdk-s3-node-sass-mirror',
    module: 'cdk_s3_node_sass_mirror',
  },
});
project.gitignore.exclude("__pycache__/", "layer-code/python/");
project.synth();
