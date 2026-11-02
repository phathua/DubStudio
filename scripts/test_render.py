import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch
import wave

from render import render


class RenderTests(unittest.TestCase):
    @patch("render.shutil.which", return_value="ffmpeg")
    @patch("render.subprocess.run")
    def test_reports_clipping_and_wont_overwrite(self, process, _which):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            video, audio, output = root / "video.mp4", root / "speech.wav", root / "result.mp4"
            video.touch()
            with wave.open(str(audio), "wb") as wav:
                wav.setnchannels(1)
                wav.setsampwidth(2)
                wav.setframerate(8000)
                wav.writeframes(b"\0\0" * 16000)
            manifest = {"segments": [{"start": 1, "end": 2, "audioPath": str(audio)}]}
            process.side_effect = lambda command, check: Path(command[-1]).write_bytes(b"rendered")
            notes = render(video, manifest, output)
            self.assertTrue(notes[0]["truncated"])
            self.assertEqual(notes[0]["speed"], 1.35)
            self.assertEqual(output.read_bytes(), b"rendered")
            with self.assertRaises(ValueError):
                render(video, manifest, output)
            self.assertEqual(output.read_bytes(), b"rendered")


if __name__ == "__main__":
    unittest.main()
