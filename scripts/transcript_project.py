#!/usr/bin/env python3
"""Write a separate DubStudio project containing a transcript's dialogue."""
import argparse
import json
import math
from pathlib import Path
import sys
import uuid


def add_transcript(project, transcript):
    if project.get('version') != 2 or not isinstance(project.get('segments'), list):
        raise ValueError('Expected a version 2 DubStudio project')
    segments = transcript.get('segments')
    if not isinstance(segments, list):
        raise ValueError('Expected transcript segments')
    if project['segments']:
        raise ValueError('Project already contains dialogue; refusing to replace it')
    items = []
    for segment in segments:
        start, end = float(segment['start']), float(segment['end'])
        text = segment['text']
        if not isinstance(text, str) or not text.strip() or not math.isfinite(start) or not math.isfinite(end) or not 0 <= start < end:
            raise ValueError('Invalid transcript segment')
        translation = segment.get('translation', '')
        if not isinstance(translation, str):
            raise ValueError('Invalid translation')
        items.append({'id': str(uuid.uuid4()), 'start': start, 'end': end, 'text': text,
                      'translation': translation, 'speakerId': None})
    return {**project, 'segments': items}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('project', type=Path)
    parser.add_argument('transcript', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    try:
        if args.output.suffix.lower() != '.dub':
            raise ValueError('Output must end in .dub')
        with args.project.open(encoding='utf-8') as f:
            project = json.load(f)
        with args.transcript.open(encoding='utf-8') as f:
            transcript = json.load(f)
        result = add_transcript(project, transcript)
        with args.output.open('x', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
            f.write('\n')
        print(f"Saved {len(result['segments'])} dialogue lines to {args.output}.")
        print('Word timestamps remain in the transcript JSON; speakers are unassigned.')
        return 0
    except (OSError, ValueError, TypeError, KeyError) as exc:
        print('Error: ' + str(exc), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
