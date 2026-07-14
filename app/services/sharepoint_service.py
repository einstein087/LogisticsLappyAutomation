"""
SharePoint / Microsoft Graph integration.

Uploads a file to the configured SharePoint document library using the
Microsoft Graph API with OAuth2 client-credentials flow.
"""

import logging
import os
import requests as http

logger = logging.getLogger(__name__)

_TOKEN_URL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
_GRAPH_UPLOAD = (
    "https://graph.microsoft.com/v1.0/sites/{site}/drives/{drive}/root:/{folder}/{filename}:/content"
)


def _get_access_token(cfg: dict) -> str:
    tenant = cfg["SHAREPOINT_TENANT_ID"]
    url = _TOKEN_URL.format(tenant=tenant)
    resp = http.post(
        url,
        data={
            "grant_type": "client_credentials",
            "client_id": cfg["SHAREPOINT_CLIENT_ID"],
            "client_secret": cfg["SHAREPOINT_CLIENT_SECRET"],
            "scope": "https://graph.microsoft.com/.default",
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def upload_report(cfg: dict, file_path: str, filename: str) -> str:
    """
    Upload *file_path* to SharePoint and return the item's web URL.
    Returns an empty string and logs a warning when SharePoint is not configured.
    """
    required = ("SHAREPOINT_TENANT_ID", "SHAREPOINT_CLIENT_ID", "SHAREPOINT_CLIENT_SECRET",
                 "SHAREPOINT_SITE_ID", "SHAREPOINT_DRIVE_ID")
    if not all(cfg.get(k) for k in required):
        logger.warning("SharePoint not fully configured – skipping upload of %s", filename)
        return ""

    try:
        token = _get_access_token(cfg)
        url = _GRAPH_UPLOAD.format(
            site=cfg["SHAREPOINT_SITE_ID"],
            drive=cfg["SHAREPOINT_DRIVE_ID"],
            folder=cfg["SHAREPOINT_FOLDER_PATH"],
            filename=filename,
        )
        with open(file_path, "rb") as fh:
            resp = http.put(
                url,
                headers={"Authorization": "Bearer " + token,
                         "Content-Type": "application/octet-stream"},
                data=fh,
                timeout=60,
            )
        resp.raise_for_status()
        web_url = resp.json().get("webUrl", "")
        logger.info("Report uploaded to SharePoint: %s", web_url)
        return web_url
    except Exception as exc:  # noqa: BLE001
        logger.error("SharePoint upload failed: %s", exc)
        return ""
