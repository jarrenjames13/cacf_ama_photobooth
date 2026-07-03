"""
Shared S3 upload helper.

The boto3 client is created lazily (on first upload) rather than at import
time, so the app can still start, serve pages, and hit the gallery/DB
endpoints even before .env has real AWS credentials in it. The error only
surfaces when someone actually tries to upload a photo.
"""
import os
from functools import lru_cache

import boto3


class S3ConfigError(RuntimeError):
    """Raised when a required S3 environment variable is missing from .env."""


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise S3ConfigError(f"Missing required environment variable: {name} (check your .env file)")
    return value


@lru_cache
def _get_client():
    return boto3.client(
        "s3",
        region_name=_require_env("AWS_REGION"),
        aws_access_key_id=_require_env("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=_require_env("AWS_SECRET_ACCESS_KEY"),
    )


def upload_file_to_s3(file_bytes: bytes, key: str, content_type: str) -> str:
    """Uploads bytes to S3 under `key` and returns the public object URL."""
    bucket = _require_env("S3_BUCKET")
    region = _require_env("AWS_REGION")
    prefix = _require_env("AWS_PREFIX")
    client = _get_client()
    client.put_object(
        Bucket=bucket,
        Key=f"{prefix}/{key}",
        Body=file_bytes,
        ContentType=content_type,
    )
    return f"https://{bucket}.s3.{region}.amazonaws.com/{prefix}/{key}"