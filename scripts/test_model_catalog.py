import json
import unittest
from model_catalog import CATALOG, assess


class CatalogTest(unittest.TestCase):
    def setUp(self):
        self.models = {m['id']: m for m in json.loads(CATALOG.read_text())['models']}

    def test_user_model_families_are_discoverable_and_not_integrated(self):
        self.assertEqual(len(self.models), 27)
        self.assertTrue(all(m['runtime_integration'] == 'not_integrated' for m in self.models.values()))

    def test_partial_language_list_does_not_imply_unsupported(self):
        result = assess(self.models['piper'], language='ko', ram_gb=8)
        self.assertEqual(result['assessment'], 'unverified')
        self.assertIn('language support not verified', result['reasons'])
        self.assertIn('RAM requirement not verified', result['reasons'])

    def test_aligner_vietnamese_not_supported(self):
        result = assess(self.models['qwen3-aligner'], language='vi')
        self.assertEqual(result['assessment'], 'incompatible')

    def test_license_never_confuses_unknown_and_noncommercial(self):
        self.assertEqual(assess(self.models['nllb'], commercial=True)['assessment'], 'incompatible')
        self.assertEqual(assess(self.models['demucs'], commercial=True)['assessment'], 'unverified')
        self.assertEqual(assess(self.models['kokoro'], commercial=True)['assessment'], 'no_known_conflict')

    def test_vieneu_turbo_languages_and_model_card_license(self):
        model = self.models['vieneu']
        self.assertEqual(model['weights_license'], 'apache-2.0')
        self.assertEqual(model['verified_languages'], ['vi', 'en'])
        self.assertIn('VieNeu-TTS-v3-Turbo', model['license_source'])
        self.assertEqual(assess(model, language='vi', ram_gb=8)['assessment'], 'unverified')

    def test_no_known_conflict_is_not_integration(self):
        result = assess(self.models['kokoro'], commercial=True)
        self.assertEqual(result['runtime_integration'], 'not_integrated')


if __name__ == '__main__':
    unittest.main()
