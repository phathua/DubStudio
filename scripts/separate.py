"""Optional local Demucs adapter. It never installs or downloads weights."""

import argparse
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


def separate_audio(source: Path, destination: Path, model_repo: Path, python: str = sys.executable) -> tuple[Path, Path]:
    """Create a new directory containing vocals.wav and no_vocals.wav.

    `model_repo` must contain an already installed Demucs htdemucs model repo.
    Use CPU and a bounded segment size; this does not guarantee a memory limit.
    """
    source = source.expanduser().resolve(strict=True)
    model_repo = model_repo.expanduser().resolve(strict=True)
    destination = destination.expanduser().absolute()
    if not source.is_file():
        raise ValueError("Input must be an existing audio file")
    if not model_repo.is_dir():
        raise ValueError("Demucs model repository must be a directory")
    if destination.exists():
        raise FileExistsError("Output directory already exists")
    if not destination.parent.is_dir():
        raise ValueError("Output parent directory does not exist")
    if not shutil.which("ffmpeg"):
        raise OSError("FFmpeg is required for Demucs audio input")
    try:
        available = subprocess.run(
            [python, "-c", "import demucs"], capture_output=True, check=False, timeout=30
        )
    except (FileNotFoundError, subprocess.TimeoutExpired) as error:
        raise OSError("Could not start the configured Python runtime") from error
    if available.returncode:
        raise OSError("Demucs is not installed in the selected Python runtime")

    # An explicit local repository prevents Demucs fetching weights on its own.
    with tempfile.TemporaryDirectory(prefix=".dubstudio-separation-", dir=destination.parent) as temporary:
        root = Path(temporary)
        process = subprocess.run(
            [python, "-m", "demucs", "--repo", str(model_repo), "-n", "htdemucs", "-d", "cpu", "--segment", "7", "--two-stems", "vocals", "-o", str(root), str(source)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        if process.returncode:
            raise OSError("Demucs failed; verify the local model, available memory and media")
        produced = root / "htdemucs" / source.stem
        vocals = produced / "vocals.wav"
        background = produced / "no_vocals.wav"
        if not vocals.is_file() or not background.is_file():
            raise OSError("Demucs finished without both expected audio stems")
        if not vocals.stat().st_size or not background.stat().st_size:
            raise OSError("Demucs produced an empty audio stem")
        # Reserve the destination atomically; never replace another directory.
        destination.mkdir()
        try:
            vocals.rename(destination / "vocals.wav")
            background.rename(destination / "no_vocals.wav")
        except OSError:
            (destination / "vocals.wav").unlink(missing_ok=True)
            (destination / "no_vocals.wav").unlink(missing_ok=True)
            destination.rmdir()
            raise
    return destination / "vocals.wav", destination / "no_vocals.wav"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--model-repo", type=Path, required=True, help="Local Demucs model repository")
    parser.add_argument("--python", default=sys.executable, help="Python executable with Demucs installed")
    args = parser.parse_args()
    try:
        vocals, background = separate_audio(args.audio, args.output, args.model_repo, args.python)
    except (OSError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    print(f"Vocal stem: {vocals}\nBackground stem: {background}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
