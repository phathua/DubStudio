# Experimental project CLI

Requires Python 3.9 or newer. It uses only the Python standard library.

```sh
python3 scripts/dubstudio.py diagnose
python3 scripts/dubstudio.py import-video /path/to/video.mp4 /path/to/project.dub --name "My project"
python3 -m unittest discover -s scripts -p 'test_*.py'
```

Import the resulting `.dub` file using **Import existing project** in DubStudio.
The video remains in its original location; the project holds a reference to it.
Creation never overwrites an existing file. The CLI does not register the project
in recent projects or open the application automatically.

This command does not validate media codecs or run separation, ASR, diarization,
translation, voice selection or TTS. `diagnose` reports executable and Python
module presence only; it does not download, select, or benchmark models.
