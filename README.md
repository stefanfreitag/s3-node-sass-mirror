# S3 node-sass mirror

This stack can be used to setup a very basic mirror for node-sass releases.
The internal structure of the stack  is shown in the diagram below

![Overview](docs/overview.png "Overview")

- The S3 bucket contains the assets and the required folder structure is mimicked by the creation of corresponding keys. <br>Access to the bucket content is granted via whitelisting CIDR blocks.
- To decouple client requests and their processing a queue is introduced. This approach provides also an easy way to scale horizontally
- The Lambda function is doing the hard work: it downloads the assets from Github and uploads them to the bucket. It contains logic to avoid the upload of already existing files.<br>_At present is downloads only Linux and Windows related assets._

## Installing/ Uninstalling the application

### Install 

- Install the Python libraries for the Lambda layer

  ```sh
  cd layer
  ./install.sh
  ```

- Install all dependencies required to build the application

  ```sh
   npm install
  cdk deploy --profile <AWS profile name>
  ```

### Uninstall

If no longer required, uninstall by executing

```sh
cdk destroy --profile <AWS profile name>
```

## Useful information

- Before deploying the stack revisit the whitelisting section. Only to the addresses contained in the whitelist the mirrored files will be available for download.

  ```sh
  new NodeSassMirrorStack(app, 'my-stack-dev', {
   env: devEnv,
   whitelist: ['87.123.53.81/32'],
  });
  ```

- Clients connecting to the API Gateway need to provide an API key as part of their request.<br>This key is deployed as part of this stack and can be fetched by querying for its identifier. To do so replace `<api-key-id>` with the identifier returned in the `Outputs` section after deployment of the stack.

  ```sh 
  aws apigateway get-api-key --api-key <api-key-id> --include-value --profile <AWS profile name>
  ```

   From the returned object use the content of the field `value`. It needs to go into the header section of requests sent to the API Gateway, i.e. for `curl` `-H "x-api-key: <api-key-value>"`.

- Another element in the `Output` section is the regional domain name of the S3 bucket. It is needed when downloading files from the bucket.

## Example

Mirroring the node-sass release version 4.13.1 can be triggered by

```sh
curl -X POST  -H "x-api-key: <api-key-value>" https://<api-gw-id>.execute-api.eu-central-1.amazonaws.com/prod/v1.0/mirror?tag=v4.13.1
```

After a short while the files will be available for download under the URL of the S3 bucket, e.g. `https://<some_bucket_name>.s3.eu-central-1.amazonaws.com`. The "folder" structure in the bucket is
`node-nass/<version>/<file>`.

Hence the download of `linux-x64-64_binding.node`  using `wget` looks similar to
 
```sh
wget https://<some_bucket_name>.s3.eu-central-1.amazonaws.com/node-sass/v5.0.0/linux-x64-64_binding.node
```

## ToDos

- Return proper return values from Lambda
- Add detection for messages in dead letter queue

## Links

- [AWS S3](https://aws.amazon.com/s3/)
- [AWS SQS Metadata](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-message-metadata.html)
- [GitHub REST Release API](https://docs.github.com/en/free-pro-team@latest/rest)
- [Node Sass Releases](https://api.github.com/repos/sass/node-sass/releases)
- [What is my IP?](https://www.whatismyip.com/)