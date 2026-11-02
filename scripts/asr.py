"""Local whisper.cpp adapter. Word boundaries are experimental estimates."""

import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import wave


def normalize(raw, duration=None):
    """Convert whisper.cpp -ml 1 -sow JSON segments to grouped utterances."""
    words = []
    for item in raw.get("transcription", []):
        text = item.get("text", "").strip()
        offsets = item.get("offsets", {})
        start, end = offsets.get("from"), offsets.get("to")
        if not text or text == "[BLANK_AUDIO]" or not isinstance(start, (int, float)) or not isinstance(end, (int, float)):
            continue
        if start < 0 or end < start:
            continue
        if duration is not None:
            if start >= duration * 1000:
                continue
            end = min(end, duration * 1000)
        words.append({"start": start / 1000, "end": end / 1000, "text": text})
    segments = []
    current = []
    for word in words:
        if current and (word["start"] - current[-1]["end"] > 1.0 or word["end"] - current[0]["start"] > 10):
            segments.append(current)
            current = []
        current.append(word)
        if word["text"].endswith((".", "?", "!", "。", "？", "！")):
            segments.append(current)
            current = []
    if current:
        segments.append(current)
    return {
        "language": raw.get("result", {}).get("language"),
        "timestampQuality": "experimental; verify against audio",
        "timingDiagnostics": {
            "zeroDurationWords": sum(w["start"] == w["end"] for w in words),
            "wordsOverThreeSeconds": sum(w["end"] - w["start"] > 3 for w in words),
            "outOfOrderWords": sum(words[i]["start"] < words[i - 1]["start"] for i in range(1, len(words))),
        },
        "segments": [{"start": group[0]["start"], "end": group[-1]["end"],
                      "text": " ".join(w["text"] for w in group), "words": group}
                     for group in segments],
    }


def transcribe(source, output, model, language="auto"):
    source, output, model = Path(source), Path(output), Path(model)
    if not source.is_file() or not model.is_file():
        raise ValueError("Input audio/video or model not found")
    if output.exists():
        raise FileExistsError(f"Output already exists: {output}")
    ffmpeg, whisper = shutil.which("ffmpeg"), shutil.which("whisper-cli")
    if not ffmpeg or not whisper:
        raise RuntimeError("Install ffmpeg and whisper-cli and make both available in PATH")
    with tempfile.TemporaryDirectory(prefix="dubstudio-asr-") as temp:
        wav = Path(temp) / "audio.wav"
        result = Path(temp) / "transcript"
        subprocess.run([ffmpeg, "-nostdin", "-v", "error", "-i", str(source), "-vn", "-ac", "1",
                        "-ar", "16000", "-c:a", "pcm_s16le", str(wav)], check=True)
        with wave.open(str(wav), "rb") as audio:
            duration = audio.getnframes() / audio.getframerate()
        subprocess.run([whisper, "-m", str(model), "-f", str(wav), "-l", language,
                        "-ml", "1", "-sow", "-oj", "-of", str(result)], check=True)
        raw = json.loads(result.with_suffix(".json").read_text(encoding="utf-8"))
        transcript = normalize(raw, duration)
        with output.open("x", encoding="utf-8") as file:
            json.dump(transcript, file, ensure_ascii=False, indent=2)
            file.write("\n")
    return transcript
