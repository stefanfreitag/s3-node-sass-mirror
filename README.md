# S3 node-sass mirror

## Installing/ Uninstalling the application

```sh
cdk deploy --profile <AWS profile name>
```

```sh
cdk destroy --profile <AWS profile name>
```

## Fetching the API key value

```sh
aws apigateway get-api-keys --name-query api-key --include-value --profile <AWS profile name>
```

Use the content of the field `value`.

## Using the API gateway to trigger mirroring of a specific node-sass release

```sh
curl -X POST  -H "x-api-key: <api-key-value>" https://<api-gw-id>.execute-api.eu-central-1.amazonaws.com/prod/v1.0/mirror?tag=v4.13.1
```

## ToDos

- Return proper return values from Lambda
- Remove uploaded files to avoid `No space left on device` errors
- Investigate on An error occurred (403) when calling the HeadBucket operation: Forbidden
- Update python code to make use of sqs records (tag = record['messageAttributes']["tag"]['stringValue'])
