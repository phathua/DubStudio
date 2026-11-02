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

It does not install Demucs or download model weights. The same Demucs model was
also run manually on a 4-minute video on an M1 Mac; quality has not been validated
and runtime or memory use may differ substantially on other inputs and hardware.

For a local draft, `render.py` accepts a manifest containing `segments` with
`start`, `end` and an absolute `audioPath` to each PCM WAV. It renders H.264
480p video and AAC audio with FFmpeg. Speech is sped up by at most 1.35×, then
trimmed to the time slot if it still does not fit; the JSON report identifies
trimmed clips. These are rough timings, not lip sync.

```sh
python3 scripts/render.py source.mp4 voices/manifest.json preview.mp4 --backing no_vocals.wav --fallback-vocals vocals.wav
```

`--fallback-vocals` restores original speech in periods without dubbed clips;
the separated backing may still contain residual speech. Without `--backing`,
the original audio is reduced in volume, so original dialogue may still be
audible throughout. The output path must not already exist.
With both `--backing` and `--fallback-vocals`, separated vocals are kept outside
the translated clips. Separation artifacts and abrupt transitions may be audible.

`translate_batch.py` can instead translate groups of lines after explicit consent;
it saves a `.partial` checkpoint beside the output so interrupted runs can resume
with the same source and target language. The checkpoint contains transcript text.

On macOS, an installed system voice can synthesize translated lines locally:

```sh
python3 scripts/tts.py translated.json /path/to/new-audio-directory --voice Linh
```

This produces WAV files and a manifest with measured durations and warnings for
lines longer than their slots. It does not perform speaker detection, voice
cloning, automatic time fitting, or video rendering. The `Linh` voice must be
installed in macOS; other operating systems need a different TTS backend. A
failed run may leave partial files in the new output directory.

For an experimental local Vietnamese neural voice, install the external
`vieneu` SDK (tested with 3.8.3, Python 3.11) in a separate environment and run:

```sh
python scripts/vieneu_tts.py translated.json /path/to/new-audio-directory \
  --cache-dir /path/to/persistent-model-cache --voice 'Mai Anh' --download
```

`--download` explicitly allows missing model assets to be fetched on first use;
omit it for offline reuse. The SDK and model assets are not bundled in the
Tauri application. This experimental CLI does not yet verify or pin the files
it downloads. Review the licenses of the model, codec, and voice assets before
redistribution or commercial use. Synthesis uses one selected voice for all
lines and does not detect speakers or automatically fit audio to the timeline.
