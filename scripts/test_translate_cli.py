import io
import json
import unittest

from translate_cli import translate


class Response(io.BytesIO):
    def __init__(self):
        super().__init__(json.dumps({'status': 'completed', 'steps': [
            {'type': 'model_output', 'content': [{'type': 'text', 'text': 'Bạn khỏe không?'}]}
        ]}).encode())


class Opener:
    def open(self, request, timeout):
        self.request = request
        return Response()


class TranslateTests(unittest.TestCase):
    def test_keeps_word_timestamps_and_requires_supported_target(self):
        opener = Opener()
        data = {'language': 'en', 'segments': [{'start': 0, 'end': 1.5, 'text': 'How are you?',
                'words': [{'start': 0, 'end': 0.3, 'text': 'How'}]}]}
        result = translate(data, 'vi', 'test', opener)
        self.assertEqual(result['segments'][0]['translation'], 'Bạn khỏe không?')
        self.assertEqual(result['segments'][0]['words'], data['segments'][0]['words'])
        request = json.loads(opener.request.data)
        self.assertFalse(request['store'])
        self.assertIn('1.50 seconds', request['system_instruction'])
        with self.assertRaises(ValueError):
            translate(data, 'invalid', 'test', opener)


if __name__ == '__main__':
    unittest.main()
