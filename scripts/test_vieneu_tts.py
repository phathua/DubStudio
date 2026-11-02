import tempfile
import unittest
from pathlib import Path
from vieneu_tts import synthesize


class VieneuValidationTests(unittest.TestCase):
    def test_invalid_text_does_not_create_output(self):
        with tempfile.TemporaryDirectory() as root:
            output = Path(root) / 'audio'
            with self.assertRaises(ValueError):
                synthesize({'segments': [{'start': 0, 'end': 1, 'translation': ''}]}, output, 'Mai Anh', root)
            self.assertFalse(output.exists())

    def test_existing_output_is_never_reused(self):
        with tempfile.TemporaryDirectory() as root:
            output = Path(root) / 'audio'
            output.mkdir()
            with self.assertRaises(FileExistsError):
                synthesize({'segments': [{'start': 0, 'end': 1, 'translation': 'Xin chào'}]}, output, 'Mai Anh', root)
