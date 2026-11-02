#!/usr/bin/env python3
"""Experimental VieNeu v3 Turbo CPU synthesis; SDK and models are external."""
import argparse
import json
import math
import os
from pathlib import Path
import sys
import wave


def synthesize(transcript, output_dir, voice, cache_dir, download=False):
    segments = transcript.get('segments')
    if not isinstance(segments, list) or not segments:
        raise ValueError('Transcript must contain translated segments')
    for segment in segments:
        text = segment.get('translation')
        start, end = float(segment['start']), float(segment['end'])
        if not isinstance(text, str) or not text.strip() or not math.isfinite(start) or not math.isfinite(end) or not 0 <= start < end:
            raise ValueError('Invalid translation or timing')
    output_dir = Path(output_dir).expanduser().absolute()
    if output_dir.exists():
        raise FileExistsError('Output directory already exists')
    # Set before importing the SDK: it imports huggingface_hub during initialization.
    os.environ['HF_HOME'] = str(Path(cache_dir).expanduser().absolute())
    if download:
        os.environ.pop('HF_HUB_OFFLINE', None)
    else:
        os.environ['HF_HUB_OFFLINE'] = '1'
    from vieneu import Vieneu
    engine = Vieneu(backend='onnx')
    voices = [name for _, name in engine.list_preset_voices()]
    if voice not in voices:
        raise ValueError('Voice is not available: ' + voice)
    output_dir.mkdir(parents=False, exist_ok=False)
    result = {**transcript, 'ttsEngine': 'vieneu-v3-turbo-onnx', 'ttsVoice': voice, 'segments': []}
    for index, segment in enumerate(segments):
        audio = engine.infer(segment['translation'].strip(), voice=voice)
        wav = output_dir / ('line-%05d.wav' % (index + 1))
        engine.save(audio, str(wav))
        with wave.open(str(wav), 'rb') as sound:
            duration = sound.getnframes() / sound.getframerate()
        if duration <= 0:
            raise RuntimeError('Speech synthesis generated empty audio')
        result['segments'].append({**segment, 'audioPath': str(wav), 'audioDuration': duration,
                                   'exceedsSlot': duration > float(segment['end']) - float(segment['start'])})
        print('Synthesized %d/%d' % (index + 1, len(segments)), flush=True)
    manifest = output_dir / 'manifest.json'
    with manifest.open('x', encoding='utf-8') as file:
        json.dump(result, file, ensure_ascii=False, indent=2)
        file.write('\n')
    return manifest, result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('transcript', type=Path)
    parser.add_argument('output_dir', type=Path, help='A new directory for WAV files and manifest')
    parser.add_argument('--cache-dir', required=True, type=Path, help='Persistent external model cache')
    parser.add_argument('--download', action='store_true', help='Allow the SDK to download missing model assets')
    parser.add_argument('--voice', default='Mai Anh', help='Installed VieNeu preset name')
    args = parser.parse_args()
    try:
        with args.transcript.open(encoding='utf-8') as file:
            transcript = json.load(file)
        manifest, result = synthesize(transcript, args.output_dir, args.voice, args.cache_dir, args.download)
        over = sum(segment['exceedsSlot'] for segment in result['segments'])
        print('Saved %d lines to %s. %d exceed their allotted time.' % (len(result['segments']), manifest, over))
        return 0
    except Exception as exc:
        print('Error: %s: %s' % (type(exc).__name__, exc), file=sys.stderr)
        print('Partial output, if any, was left in place.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
