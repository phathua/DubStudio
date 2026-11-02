import platform
import tempfile
import unittest
from pathlib import Path
from tts import synthesize


@unittest.skipUnless(platform.system() == 'Darwin', 'macOS speech backend')
class VoiceValidationTests(unittest.TestCase):
    def test_invalid_text_does_not_create_directory(self):
        with tempfile.TemporaryDirectory() as root:
            output = Path(root) / 'audio'
            with self.assertRaises(ValueError):
                synthesize({'segments': [{'start': 0, 'end': 1, 'translation': ''}]}, output)
            self.assertFalse(output.exists())

    def test_existing_directory_is_never_reused(self):
        with tempfile.TemporaryDirectory() as root:
            output = Path(root) / 'audio'
            output.mkdir()
            with self.assertRaises(FileExistsError):
                synthesize({'segments': [{'start': 0, 'end': 1, 'translation': 'Xin chào'}]}, output)
