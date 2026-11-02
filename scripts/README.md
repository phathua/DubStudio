# Experimental project CLI

Requires Python 3.9 or newer. It uses only the Python standard library.

```sh
python3 scripts/dubstudio.py diagnose
python3 scripts/dubstudio.py import-video /path/to/video.mp4 /path/to/project.dub --name "My project"
python3 scripts/dubstudio.py transcribe /path/to/vocals.wav /path/to/transcript.json --model /path/to/ggml-tiny.bin
python3 -m unittest discover -s scripts -p 'test_*.py'
```

Import the resulting `.dub` file using **Import existing project** in DubStudio.
The video remains in its original location; the project holds a reference to it.
Creation never overwrites an existing file. The CLI does not register the project
in recent projects or open the application automatically.

`transcribe` requires FFmpeg and a compatible whisper.cpp `whisper-cli` in PATH.
It accepts `--download-model` instead of `--model` to download the pinned,
verified multilingual tiny model (about 78 MB); that model is a small starting
point, not a claim of optimal quality. Input may be a separated vocal stem or
the original media. No separation or speaker detection is performed by this
command. Output is a separate JSON file; it is not automatically imported into
the project. Whisper.cpp word timestamps are experimental estimates and must be
checked against the audio. `diagnose` only reports executable/module presence;
it does not establish compatibility, benchmark models, or perform inference.

An existing ASR transcript in JSON (`language` and `segments` with `start`, `end`,
`text`, and optional `words`) can be translated separately. This sends the text
and neighboring lines to Google, so it requires an explicit flag and a Google
API key in the environment. It never overwrites the output file:

```sh
python3 scripts/translate_cli.py transcript.json translated.json --target vi --send-to-google
```

The result preserves the original timestamps and word data. Duration is a prompt
target only, not a measured TTS duration, lip sync, or a guarantee of accuracy.
To open the dialogue in DubStudio, create a separate project copy (the source
project must not already contain dialogue):

```sh
python3 scripts/transcript_project.py project.dub translated.json project-with-dialogue.dub
```

The project format currently stores line timing, not individual word timing;
keep the transcript JSON for word timings. Speakers remain unassigned.

There is also an experimental Demucs adapter that invokes a separately installed
Python runtime and a local `htdemucs` model repository:

```sh
python3 scripts/separate.py /path/to/audio.wav /path/to/new-output --model-repo /path/to/models --python /path/to/python
```

It does not install Demucs or download model weights. The adapter has only been
tested with a simulated process, so resource use and quality are not verified.
