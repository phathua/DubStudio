"""Download pinned, verified assets outside the app bundle.

The catalog is deliberately static: never execute a downloaded file, and never
trust a checksum obtained from the same request as an executable or model.
"""
import hashlib
import os
from pathlib import Path
import platform
import tempfile
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, build_opener


ASSETS = {
    # OpenAI Whisper tiny, converted to ggml by whisper.cpp. This is a small
    # test model, not an automatically selected quality recommendation.
    "whisper-tiny": {
        "url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-tiny.bin",
        "sha256": "be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21",
        "size": 77691713,
        "filename": "ggml-tiny.bin",
    },
}


def data_dir():
    system = platform.system()
    if system == "Darwin":
        base = Path.home() / "Library" / "Application Support"
    elif system == "Windows":
        base = Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local")
    else:
        base = Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local" / "share")
    return base / "com.vixlab.dubstudio" / "assets"


class SecureRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        if urlparse(newurl).scheme != "https":
            raise ValueError("Refusing redirect to a non-HTTPS URL")
        return super().redirect_request(request, fp, code, msg, headers, newurl)


def digest_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def prepare_asset(name, root=None, opener=None):
    if name not in ASSETS:
        raise ValueError("Unknown asset: " + name)
    asset = ASSETS[name]
    if urlparse(asset["url"]).scheme != "https":
        raise ValueError("Asset URL must use HTTPS")
    root = Path(root) if root is not None else data_dir()
    root.mkdir(parents=True, exist_ok=True)
    destination = root / asset["filename"]
    if destination.is_file() and destination.stat().st_size == asset["size"] and digest_file(destination) == asset["sha256"]:
        return destination
    open_url = opener or build_opener(SecureRedirect()).open
    temp_name = None
    try:
        with tempfile.NamedTemporaryFile(prefix=".download-", dir=root, delete=False) as temp:
            temp_name = temp.name
            digest = hashlib.sha256()
            count = 0
            with open_url(asset["url"], timeout=60) as response:
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    count += len(chunk)
                    if count > asset["size"]:
                        raise ValueError("Download is larger than the pinned size")
                    digest.update(chunk)
                    temp.write(chunk)
            if count != asset["size"] or digest.hexdigest() != asset["sha256"]:
                raise ValueError("Asset size or SHA-256 does not match pinned metadata")
        os.replace(temp_name, destination)
        temp_name = None
        return destination
    except URLError as exc:
        raise OSError("Download failed; check the network connection") from exc
    finally:
        if temp_name is not None:
            Path(temp_name).unlink(missing_ok=True)
