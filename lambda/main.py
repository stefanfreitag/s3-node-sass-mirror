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
S3_BUCKET = "<undefined>"


def upload_file(filename: str, bucket_name: str, bucket_directory: str) -> bool:
    """
    Upload a file to a S3 bucket. The file name is taken from the provided url.
    :param filename: The path to the file to upload
    :type filename: string
    :param bucket_directory
    :type bucket_directory: string
    :param bucket_name: The name of the S3 bucket
    :type bucket_name: string
    """

    session = boto3.Session()
    s3_client = session.client("s3")
    try:
        logging.info("Uploading " + filename + " ...")
        s3_client.upload_file(
            filename, bucket_name, bucket_directory + "/" + os.path.basename(filename)
        )
        logging.info("Upload of file  " + filename + " done.")
    except ClientError as e:
        print(e)
        return False
    return True


def is_existing(bucket_name: str, key: str) -> bool:
    """
    Checks if the key exists in the bucket.
    :param bucket_name: Name of the S3 bucket to check
    :type bucket_name: string
    :param key: The key to check for.
    :type key: string
    :return:
    """
    if not bucket_name:
        raise RuntimeError("Missing bucket name.")
    if not key:
        raise RuntimeError("Missing key.")
    session = boto3.Session()
    s3_client = session.client("s3")
    try:
        s3_client.head_bucket(Bucket=bucket_name)
    except ClientError as error:
        logging.error(error)
    try:
        logging.info("Checking for key " + key + " in S3 bucket " + S3_BUCKET)
        s3_client.head_object(Key=key, Bucket=S3_BUCKET)
        return True
    except ClientError:
        logging.info("Bucket " + bucket_name + " does not contain " + key)
        return False


def do_download(asset: dict, directory: str):
    """

    :param asset:
    :param directory: The directory to download the asset to.
    :type directory: string
    :return:
    """
    if not directory:
        raise RuntimeError("Missing directory information.")
    _response = requests.get(asset["browser_download_url"], allow_redirects=True)
    _local_file = directory + str(asset["name"])
    open(directory + str(asset["name"]), "wb").write(_response.content)
    logging.info(
        "Downloaded " + asset["browser_download_url"] + " local file " + _local_file
    )


def main(event, context):
    """

    :param event:
    :param context:
    :return:
    """
    global S3_BUCKET
    S3_BUCKET = os.environ["BUCKET_NAME"]
    logging.info("S3 Bucket used as target: " + S3_BUCKET)

    for record in event["Records"]:
        tag = record["messageAttributes"]["tag"]["stringValue"]
        release = get_release_by_tag(owner=OWNER, repository=REPOSITORY, tag=tag)
        if release is not None:
            rel_assets = filter(is_relevant_asset, release["assets"])
            for asset in rel_assets:
                if not exists_file(asset["name"]):
                    do_download(asset, "/tmp/")
                else:
                    logging.info("Local copy exists for " + asset["name"])
                if not is_existing(
                    S3_BUCKET, REPOSITORY + "/" + tag + "/" + asset["name"]
                ):
                    upload_file(
                        "/tmp/" + asset["name"], S3_BUCKET, REPOSITORY + "/" + tag
                    )
                os.remove("/tmp/" + asset["name"])
        else:
            raise RuntimeError("No releases found for tag " + tag + ".")


def exists_file(name: str):
    return os.path.isfile(name)


def is_relevant_asset(asset: dict):
    """
    Returns if an asset is relevant for this process. For being relevant the asset name needs to contain "windows" or "linux"
    :param asset: The asset information as it is available in the samples directory.
    :type asset: dict
    :return:
    """
    return "linux" in asset["name"] or "win32" in asset["name"]


def configure_logging():
    root = logging.getLogger()
    root.setLevel(logging.DEBUG)
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    handler.setFormatter(formatter)
    root.addHandler(handler)


if __name__ == "__main__":
    configure_logging()
    os.environ["AWS_PROFILE"] = "cdk"
    os.environ["BUCKET_NAME"] = "stefanfreitag1977-demo-bucket"
    event = {"Records": [{"messageAttributes": {"tag": {"stringValue": "v4.13.1"}}}]}
    context = None
    main(event, context)
