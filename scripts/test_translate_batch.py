import io
import json
import unittest
from translate_batch import translate_batch


class Opener:
    def __init__(self, items):
        self.items = items

    def open(self, request, timeout):
        body = json.loads(request.data)
        assert body['store'] is False
        return io.BytesIO(json.dumps({'status': 'completed', 'steps': [{'type': 'model_output',
            'content': [{'type': 'text', 'text': json.dumps(self.items)}]}]}).encode())


class BatchTests(unittest.TestCase):
    def test_preserves_order_and_timing(self):
        source = {'segments': [{'start': 1, 'end': 2, 'text': 'Hello'},
                               {'start': 3, 'end': 4, 'text': 'Thanks'}]}
        result = translate_batch(source, 'vi', 'test', opener=Opener([
            {'id': 1, 'translation': 'Cảm ơn'}, {'id': 0, 'translation': 'Xin chào'}]))
        self.assertEqual(result['segments'][0]['translation'], 'Xin chào')
        self.assertEqual(result['segments'][1]['start'], 3)
        with self.assertRaises(RuntimeError):
            translate_batch(source, 'vi', 'test', opener=Opener([{'id': 0, 'translation': 'A'}]))


if __name__ == '__main__':
    unittest.main()
