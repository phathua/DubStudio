#!/usr/bin/env python3
"""Experimental, local project preparation CLI; no model inference is bundled."""

import argparse
import datetime
import importlib.util
import json
from pathlib import Path
import platform
import shutil
import sys


def create_project(video: Path, destination: Path, name: str) -> None:
    video = video.expanduser().resolve(strict=True)
    if not video.is_file():
        raise ValueError("Video must be a regular file")
    if destination.suffix.lower() != ".dub":
        raise ValueError("Project destination must end in .dub")
    if not name.strip():
        raise ValueError("Project name must not be empty")
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    project = {
        "version": 2, "name": name.strip(), "createdAt": now, "updatedAt": now,
        "videoPath": str(video),
        "media": [{"id": "initial-video", "path": str(video), "kind": "video"}],
        "speakers": [], "segments": [],
    }
    # Exclusive creation protects existing projects and unrelated files.
    with destination.open("x", encoding="utf-8") as output:
        json.dump(project, output, ensure_ascii=False, indent=2)
        output.write("\n")


def diagnose() -> dict:
    return {
        "platform": platform.system(), "architecture": platform.machine(),
        "python": platform.python_version(),
        "ffmpeg": bool(shutil.which("ffmpeg")),
        "ffprobe": bool(shutil.which("ffprobe")),
        "fasterWhisperInstalled": importlib.util.find_spec("faster_whisper") is not None,
        "demucsInstalled": importlib.util.find_spec("demucs") is not None,
        "pipelineImplemented": False,
        "note": "Detection does not verify models, compatibility, performance, or quality. "
                "Separation, ASR, diarization, translation and TTS are not run by this CLI.",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    create = sub.add_parser("import-video", help="Create a .dub project referencing a local video")
    create.add_argument("video", type=Path)
    create.add_argument("output", type=Path)
    create.add_argument("--name", help="Project name (defaults to video filename)")
    sub.add_parser("diagnose", help="Report prerequisites; this does not run inference")
    args = parser.parse_args()
    try:
        if args.command == "import-video":
            create_project(args.video, args.output, args.name or args.video.stem)
            print(f"Created {args.output}. Import this .dub file in DubStudio to open it.")
            print("No AI processing has been performed.")
        else:
            print(json.dumps(diagnose(), indent=2))
        return 0
    except (OSError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
