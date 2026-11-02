#!/usr/bin/env python3
"""Synthesize translated transcript lines with an installed macOS voice.

This is a local baseline, not speaker detection or voice cloning. It creates a
new output directory containing individual WAV files and a render manifest.
"""
import argparse
import json
import math
from pathlib import Path
import platform
import shutil
import subprocess
import sys
import tempfile
import wave


def synthesize(transcript, output_dir, voice='Linh'):
    if platform.system() != 'Darwin':
        raise RuntimeError('macOS speech synthesis is available on macOS only')
    if not shutil.which('say') or not shutil.which('afconvert'):
        raise RuntimeError('The macOS say and afconvert tools are required')
    segments = transcript.get('segments')
    if not isinstance(segments, list) or not segments:
        raise ValueError('Transcript must contain translated segments')
    lines = []
    for segment in segments:
        text = segment.get('translation')
        start, end = float(segment['start']), float(segment['end'])
        if not isinstance(text, str) or not text.strip():
            raise ValueError('Every segment must contain a non-empty translation')
        if not math.isfinite(start) or not math.isfinite(end) or not 0 <= start < end:
            raise ValueError('Invalid segment timing')
        lines.append((segment, text.strip(), start, end))
    output_dir = Path(output_dir).expanduser().absolute()
    # Exclusive directory creation ensures generated files never overwrite user data.
    output_dir.mkdir(parents=False, exist_ok=False)
    result = {**transcript, 'ttsEngine': 'macos-say', 'ttsVoice': voice, 'segments': []}
    with tempfile.TemporaryDirectory(prefix='dubstudio-tts-') as temp:
        for i, (segment, text, start, end) in enumerate(lines):
            text_file = Path(temp) / 'line.txt'
            aiff = Path(temp) / 'line.aiff'
            wav = output_dir / ('line-%05d.wav' % (i + 1))
            text_file.write_text(text, encoding='utf-8')
            subprocess.run(['say', '-v', voice, '-f', str(text_file), '-o', str(aiff)], check=True, timeout=120)
            subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@22050', '-c', '1', str(aiff), str(wav)], check=True, timeout=120)
            with wave.open(str(wav), 'rb') as audio:
                duration = audio.getnframes() / audio.getframerate()
            if duration <= 0:
                raise RuntimeError('Speech synthesis generated empty audio')
            result['segments'].append({**segment, 'audioPath': str(wav), 'audioDuration': duration,
                                       'exceedsSlot': duration > end - start})
    manifest = output_dir / 'manifest.json'
    with manifest.open('x', encoding='utf-8') as file:
        json.dump(result, file, ensure_ascii=False, indent=2)
        file.write('\n')
    return manifest, result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('transcript', type=Path)
    parser.add_argument('output_dir', type=Path, help='A new directory for WAV files and manifest')
    parser.add_argument('--voice', default='Linh', help='An installed macOS voice (default: Linh)')
    args = parser.parse_args()
    try:
        with args.transcript.open(encoding='utf-8') as file:
            transcript = json.load(file)
        manifest, result = synthesize(transcript, args.output_dir, args.voice)
        over = sum(segment['exceedsSlot'] for segment in result['segments'])
        print('Saved %d lines to %s. %d exceed their allotted time; review before rendering.' %
              (len(result['segments']), manifest, over))
        return 0
    except (OSError, ValueError, TypeError, KeyError, RuntimeError, subprocess.SubprocessError) as exc:
        print('Error: ' + str(exc), file=sys.stderr)
        print('Any partial output directory was left in place; remove it manually before retrying.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
