import json
from pathlib import Path
import tempfile
import unittest

from dubstudio import create_project


class ProjectTests(unittest.TestCase):
    def test_import_and_preserve_existing_project(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            video = root / "clip.mp4"
            video.write_bytes(b"video")
            project = root / "project.dub"
            create_project(video, project, "Clip")
            data = json.loads(project.read_text())
            self.assertEqual(data["version"], 2)
            self.assertEqual(data["videoPath"], str(video.resolve()))
            self.assertEqual(data["media"][0]["path"], data["videoPath"])
            self.assertEqual(data["segments"], [])
            with self.assertRaises(FileExistsError):
                create_project(video, project, "Other")
            self.assertEqual(json.loads(project.read_text())["name"], "Clip")

    def test_reject_missing_video_and_wrong_extension(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaises(FileNotFoundError):
                create_project(root / "missing.mp4", root / "x.dub", "X")
            video = root / "clip.mp4"
            video.touch()
            with self.assertRaises(ValueError):
                create_project(video, root / "x.txt", "X")


if __name__ == "__main__":
    unittest.main()
