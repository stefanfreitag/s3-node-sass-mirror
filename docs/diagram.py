# diagram.py
from diagrams import Diagram, Edge
from diagrams.aws.compute import Lambda
from diagrams.aws.storage import S3

from diagrams.aws.network import APIGateway

from diagrams.aws.integration import SQS

from diagrams.onprem.network import Internet

from diagrams.elastic.elasticsearch import Beats, Elasticsearch, Kibana, Logstash


with Diagram("node-sass mirror", show=False, outformat="png", filename="overview"):

    inet = Internet("Internet")
    s3_bucket = S3(label="S3 Bucket")
    gw = APIGateway(label="API Gateway")
    lambda_function = Lambda("Lambda function")
    message_queue = SQS(label="Processing Queue")
    dl_queue = SQS(label="Dead Letter Queue")
    inet >> gw >> message_queue
    message_queue >> dl_queue
    message_queue >> Edge(label="triggers") >> lambda_function
    lambda_function >> Edge(label="uploads asset to ") >> s3_bucket
    s3_bucket >> Edge(label="download for whitelisted addresses") >> inet
