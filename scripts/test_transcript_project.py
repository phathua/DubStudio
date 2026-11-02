import unittest
from transcript_project import add_transcript


class TranscriptProjectTests(unittest.TestCase):
    def test_copies_dialogue_without_inventing_speakers(self):
        project = {'version': 2, 'segments': []}
        result = add_transcript(project, {'segments': [{'start': 0, 'end': 2, 'text': 'Hello', 'translation': 'Xin chào'}]})
        self.assertEqual(result['segments'][0]['translation'], 'Xin chào')
        self.assertIsNone(result['segments'][0]['speakerId'])
        self.assertEqual(project['segments'], [])
        with self.assertRaises(ValueError):
            add_transcript(result, {'segments': []})


if __name__ == '__main__':
    unittest.main()
