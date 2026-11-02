import json
from pathlib import Path
import tempfile
import unittest
import wave
from unittest.mock import patch

from asr import normalize, transcribe


class AsrTests(unittest.TestCase):
    def test_normalizes_word_timestamps_and_groups(self):
        result = normalize({"result": {"language": "en"}, "transcription": [
            {"offsets": {"from": 150, "to": 340}, "text": " How"},
            {"offsets": {"from": 340, "to": 580}, "text": " are"},
            {"offsets": {"from": 580, "to": 900}, "text": " you?"},
        ]})
        self.assertEqual(result["language"], "en")
        self.assertEqual(result["segments"][0]["text"], "How are you?")
        self.assertEqual(result["segments"][0]["words"][2]["start"], 0.58)
        self.assertEqual(result["timingDiagnostics"]["zeroDurationWords"], 0)
        filtered = normalize({"transcription": [
            {"offsets": {"from": 100, "to": 200}, "text": "[BLANK_AUDIO]"},
            {"offsets": {"from": 900, "to": 1200}, "text": "word"},
            {"offsets": {"from": 1200, "to": 1400}, "text": "late"},
        ]}, duration=1)
        self.assertEqual(filtered["segments"][0]["end"], 1)
        self.assertEqual(len(filtered["segments"][0]["words"]), 1)

    @patch("asr.shutil.which", side_effect=lambda name: name)
    @patch("asr.subprocess.run")
    def test_processes_and_saves_transcript(self, run, _which):
        def run_command(command, check):
            if command[0] == "ffmpeg":
                with wave.open(command[-1], "wb") as audio:
                    audio.setnchannels(1)
                    audio.setsampwidth(2)
                    audio.setframerate(16000)
                    audio.writeframes(b"\0\0" * 16000)
            if command[0] == "whisper-cli":
                path = Path(command[command.index("-of") + 1] + ".json")
                path.write_text(json.dumps({"result": {"language": "en"}, "transcription": [
                    {"offsets": {"from": 0, "to": 100}, "text": " Hi."}
                ]}))
        run.side_effect = run_command
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            video, model, output = root / "video.mp4", root / "model.bin", root / "out.json"
            video.touch()
            model.touch()
            result = transcribe(video, output, model)
            self.assertEqual(result["segments"][0]["words"][0]["text"], "Hi.")
            self.assertEqual(json.loads(output.read_text())["language"], "en")
            with self.assertRaises(FileExistsError):
                transcribe(video, output, model)


if __name__ == "__main__":
    unittest.main()
