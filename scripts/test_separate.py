import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from types import SimpleNamespace

from separate import separate_audio


class SeparationTests(unittest.TestCase):
    def test_uses_local_repo_and_commits_only_complete_stems(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "audio.wav"
            source.write_bytes(b"audio")
            repo = root / "models"
            repo.mkdir()
            output = root / "result"
            calls = []

            def fake_run(args, **kwargs):
                calls.append(args)
                if "-m" in args:
                    folder = Path(args[args.index("-o") + 1]) / "htdemucs" / "audio"
                    folder.mkdir(parents=True)
                    (folder / "vocals.wav").write_bytes(b"voice")
                    (folder / "no_vocals.wav").write_bytes(b"background")
                return SimpleNamespace(returncode=0)

            with patch("separate.shutil.which", return_value="ffmpeg"), patch("separate.subprocess.run", side_effect=fake_run):
                vocals, background = separate_audio(source, output, repo)
            self.assertEqual(vocals.read_bytes(), b"voice")
            self.assertEqual(background.read_bytes(), b"background")
            self.assertEqual(calls[1][calls[1].index("--repo") + 1], str(repo.resolve()))
            self.assertEqual(calls[1][calls[1].index("--segment") + 1], "7")
            with self.assertRaises(FileExistsError):
                separate_audio(source, output, repo)

    def test_failed_process_keeps_output_absent(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "audio.wav"
            source.touch()
            with patch("separate.shutil.which", return_value="ffmpeg"), patch("separate.subprocess.run", side_effect=[SimpleNamespace(returncode=0), SimpleNamespace(returncode=1)]):
                with self.assertRaises(OSError):
                    separate_audio(source, root / "result", root)
            self.assertFalse((root / "result").exists())


if __name__ == "__main__":
    unittest.main()
