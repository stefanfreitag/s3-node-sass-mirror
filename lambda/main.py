import json
import logging
import os
import sys

import boto3 as boto3
import requests
from botocore.exceptions import ClientError

from utils import get_release_by_tag

OWNER = "sass"
REPOSITORY = "node-sass"
S3_BUCKET = "<undefined"


def upload_file(filename: str, bucket_name: str, bucket_directory: str) -> bool:
    """
    Upload a file to a S3 bucket. The file name is taken from the provided url.
    :param filename: The path to the file to upload
    :param bucket_directory
    :param bucket_name: The name of the S3 bucket
    """

    session = boto3.Session(profile_name="cdk")
    s3_client = session.client("s3")
    try:
        logging.info("Uploading " + filename + " ...")
        s3_client.upload_file(filename, bucket_name, bucket_directory + "/" + filename)
        logging.info("Upload of file  " + filename + " done.")
    except ClientError as e:
        print(e)
        return False
    return True


def check_existence(tag: str, bucket_name: str) -> bool:
    session = boto3.Session()
    s3_client = session.client("s3")
    try:
        s3_client.head_bucket(Bucket=bucket_name)
    except ClientError as error:
        logging.error(error)
    try:
        logging.info("Checking for node-sass version in S3 bucket " + S3_BUCKET)
        # TODO
        # file_name = os.path.basename(meta_info.download_url)
        # response = s3_client.head_object(Key=file_name, Bucket=S3_BUCKET)

        return True
    except ClientError:
        logging.error("Not found")
        print("Not found")
        return False


def do_download(asset: dict, directory: str):
    _response = requests.get(asset["browser_download_url"], allow_redirects=True)
    _local_file = directory+ str(asset["name"])
    open(directory + str(asset["name"]), "wb").write(_response.content)
    logging.info("Downloaded " + asset["browser_download_url"] + " local file " + _local_file)


def main(event, context):
    """

    :param event:
    :param context:
    :return:
    """
    global S3_BUCKET

    path = event["path"]
    if path == "/v1.0/mirror":
        if (
            event["queryStringParameters"] is None
            or event["queryStringParameters"]["tag"] is None
        ):
            return {
                "statusCode": 400,
                "body": json.dumps("Missing query parameter 'tag'"),
            }

        S3_BUCKET = os.environ["BUCKET_NAME"]
        logging.info("S3 Bucket used as target: " + S3_BUCKET)
        tag = event["queryStringParameters"]["tag"]
        try:
            release = get_release_by_tag(owner=OWNER, repository=REPOSITORY, tag=tag)
            rel_assets = filter(is_relevant_asset, release["assets"])
            for asset in rel_assets:
                if not exists_file(asset["name"]):
                    do_download(asset, "/tmp/")
                else:
                    logging.info("Local copy exists for " + asset["name"])
                upload_file("/tmp/" + asset["name"], S3_BUCKET, REPOSITORY + "/" +tag)
        except KeyError as identifier:
            print("Key error for " + str(identifier))

        return {"statusCode": 200, "body": json.dumps("Hello from S3 mirror")}
    else:
        return {"statusCode": 404, "body": json.dumps("Invalid path specified")}


def exists_file(name: str):
    # TODO: Add temp directory
    return os.path.isfile(name)


def is_relevant_asset(asset: dict):
    """
    Returns if an asset is relevant for this process. For being relevant the asset name needs to contain
    "windows" or "linux"
    :param asset:
    :return:
    """
    return "linux" in asset["name"] or "windows" in asset["name"]


if __name__ == "__main__":
    root = logging.getLogger()
    root.setLevel(logging.DEBUG)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    handler.setFormatter(formatter)
    root.addHandler(handler)

    os.environ["BUCKET_NAME"] = "stefanfreitag1977-demo-bucket"
    event = {"path": "/v1.0/mirror", "queryStringParameters": {"tag": "v4.13.1"}}
    context = None
    main(event, context)
