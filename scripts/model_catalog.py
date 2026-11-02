"""Inspect model candidates; this does not install, select, or run a model."""
import argparse
import json
from pathlib import Path

CATALOG = Path(__file__).with_name('model_catalog.json')


def assess(model, language=None, ram_gb=None, vram_gb=None, commercial=False):
    reasons = []
    unsupported = []
    if language:
        language = language.lower().split('-')[0].split('_')[0]
        langs = model['verified_languages']
        if langs is None or language not in langs:
            if model['language_list_complete']:
                unsupported.append('language not supported by this checkpoint')
            else:
                reasons.append('language support not verified')
    for label, available in [('ram', ram_gb), ('vram', vram_gb)]:
        if available is not None:
            minimum = model[label + '_min_gb']
            if minimum is None:
                reasons.append(label.upper() + ' requirement not verified')
            elif available < minimum:
                unsupported.append(label.upper() + ' below verified minimum')
    if commercial:
        lic = model['weights_license']
        if lic == 'cc-by-nc-4.0':
            unsupported.append('weights are noncommercial')
        elif lic not in ('apache-2.0', 'mit'):
            reasons.append('commercial weights license requires review')
    return {'assessment': 'incompatible' if unsupported else ('unverified' if reasons else 'no_known_conflict'),
            'reasons': unsupported + reasons, 'runtime_integration': model['runtime_integration']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--category')
    parser.add_argument('--language')
    parser.add_argument('--ram-gb', type=float)
    parser.add_argument('--vram-gb', type=float, help='GPU VRAM; omit for CPU instead of setting 0')
    parser.add_argument('--commercial', action='store_true')
    args = parser.parse_args()
    if any(n is not None and n < 0 for n in (args.ram_gb, args.vram_gb)):
        parser.error('memory values must be non-negative')
    models = json.loads(CATALOG.read_text(encoding='utf-8'))['models']
    results = [{**m, **assess(m, args.language, args.ram_gb, args.vram_gb, args.commercial)}
               for m in models if not args.category or m['category'] == args.category]
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
