import hashlib
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import assets


class AssetTests(unittest.TestCase):
    def test_download_verifies_and_reuses(self):
        content = b"model"
        entry = {"url": "https://example.com/model", "sha256": hashlib.sha256(content).hexdigest(),
                 "size": len(content), "filename": "model.bin"}
        with tempfile.TemporaryDirectory() as directory, patch.dict(assets.ASSETS, {"test": entry}):
            path = assets.prepare_asset("test", directory, lambda *a, **k: io.BytesIO(content))
            self.assertEqual(path.read_bytes(), content)
            assets.prepare_asset("test", directory, lambda *a, **k: self.fail("unnecessary download"))
            path.write_bytes(b"bad")
            with self.assertRaises(ValueError):
                assets.prepare_asset("test", directory, lambda *a, **k: io.BytesIO(b"wrong"))
            self.assertEqual(path.read_bytes(), b"bad")
            self.assertEqual(list(Path(directory).glob(".download-*")), [])

    def test_unknown_and_insecure_are_rejected(self):
        with self.assertRaises(ValueError):
            assets.prepare_asset("unknown")
        with patch.dict(assets.ASSETS, {"bad": {"url": "http://example.com"}}):
            with self.assertRaises(ValueError):
                assets.prepare_asset("bad")


if __name__ == "__main__":
    unittest.main()
