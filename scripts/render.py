#!/usr/bin/env python3
"""Render a draft video from timestamped WAV clips using local FFmpeg."""

import argparse
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import wave


def render(video, manifest, output, backing=None, fallback_vocals=None, video_ready=False):
    video, output = Path(video), Path(output)
    if not video.is_file():
        raise ValueError("Video file not found")
    if output.suffix.lower() != ".mp4" or output.exists():
        raise ValueError("Output must be a new .mp4 file")
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("FFmpeg was not found in PATH")
    segments = manifest.get("segments")
    if not isinstance(segments, list) or not segments:
        raise ValueError("Manifest has no speech segments")
    command = [ffmpeg, "-nostdin", "-v", "error", "-i", str(video)]
    if backing:
        backing = Path(backing)
        if not backing.is_file():
            raise ValueError("Backing audio not found")
        command.extend(["-i", str(backing)])
    if fallback_vocals:
        fallback_vocals = Path(fallback_vocals)
        if not backing or not fallback_vocals.is_file():
            raise ValueError("Fallback vocals require an existing backing and vocals file")
        command.extend(["-i", str(fallback_vocals)])
    filters = [f"[{1 if backing else 0}:a:0]aresample=48000,aformat=channel_layouts=stereo,volume={1 if backing else 0.18}[base]"]
    inputs = ["[base]"]
    notes = []
    for index, segment in enumerate(segments):
        start, end = float(segment["start"]), float(segment["end"])
        audio_path = Path(segment["audioPath"])
        if not math.isfinite(start) or not math.isfinite(end) or not 0 <= start < end or not audio_path.is_file():
            raise ValueError(f"Invalid timing or missing audio in segment {index}")
        with wave.open(str(audio_path), "rb") as audio:
            duration = audio.getnframes() / audio.getframerate()
        if duration <= 0:
            raise ValueError(f"Empty audio in segment {index}")
        slot = end - start
        rate = min(1.35, max(1.0, duration / slot))
        truncated = duration / rate > slot + 0.02
        notes.append({"index": index, "spokenSeconds": round(duration, 3),
                      "slotSeconds": round(slot, 3), "speed": round(rate, 3), "truncated": truncated})
        command.extend(["-i", str(audio_path)])
        input_id = index + 1 + bool(backing) + bool(fallback_vocals)
        filters.append(f"[{input_id}:a:0]aresample=48000,aformat=channel_layouts=stereo,"
                       f"atempo={rate:.6f},atrim=duration={slot:.6f},asetpts=PTS-STARTPTS,"
                       f"adelay={round(start * 1000)}:all=1[voice{index}]")
        inputs.append(f"[voice{index}]")
    if fallback_vocals:
        spoken_windows = "+".join(f"between(t,{float(s['start']):.6f},{float(s['end']):.6f})" for s in segments)
        filters.append(f"[2:a:0]aresample=48000,aformat=channel_layouts=stereo,"
                       f"volume='if({spoken_windows},0,1)':eval=frame[restore]")
        inputs.append("[restore]")
    filters.append("".join(inputs) + f"amix=inputs={len(inputs)}:duration=first:normalize=0,alimiter=limit=0.95[mix]")
    output.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=".dubstudio-render-", suffix=".mp4", dir=output.parent)
    os.close(fd)
    try:
        command.extend(["-filter_complex", ";".join(filters), "-map", "0:v:0", "-map", "[mix]"])
        command.extend(["-c:v", "copy"] if video_ready else
                       ["-vf", "scale=-2:480", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23"])
        command.extend(["-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", "-y", temporary])
        subprocess.run(command, check=True)
        os.link(temporary, output)  # Fails if destination already exists.
    finally:
        os.unlink(temporary)
    return notes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--backing", type=Path, help="Separated music/effects WAV; otherwise quiet original audio")
    parser.add_argument("--fallback-vocals", type=Path, help="Restore original vocals outside dubbed segments (requires --backing)")
    parser.add_argument("--video-ready", action="store_true", help="Copy an already suitable video stream without re-encoding")
    args = parser.parse_args()
    try:
        with args.manifest.open(encoding="utf-8") as f:
            notes = render(args.video, json.load(f), args.output, args.backing, args.fallback_vocals, args.video_ready)
        print(json.dumps({"output": str(args.output), "clips": notes,
                          "usingSeparatedBacking": args.backing is not None,
                          "originalVocalsRestoredOutsideDub": args.fallback_vocals is not None,
                          "note": "Separation may leave residual speech; timings and translations require review."},
                         ensure_ascii=False, indent=2))
        return 0
    except (OSError, ValueError, KeyError, TypeError, RuntimeError, subprocess.CalledProcessError, wave.Error) as error:
        print("Error: " + str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
