# DubStudio roadmap

This document distinguishes working functionality from planned work. Update it with each feature.

## Current foundation

- [x] Tauri desktop shell, English/Vietnamese, light/dark themes, recent projects.
- [x] Versioned `.dub` projects; read legacy `.dubstudio` projects and save a new copy.
- [x] Dubbing workspace with media references, preview, editable speakers and script, resizable panels, and local autosave.
- [x] User-initiated Google AI Studio text translation, subject to API access and configuration; transcript text is sent to Google.
- [x] Experimental CLI adapters for whisper.cpp and Demucs, and a verified on-demand download of the Whisper tiny model. External inference runtimes remain prerequisites; this is not yet an integrated processing pipeline.
- [ ] Complete editing timeline: draggable clips, audio mixing, waveform generation and synchronization.
- [ ] Local ASR with word timestamps, diarization, voice suggestions, TTS and source separation.
- [ ] Local translation, automatic runtime and model selection, license checks and hardware benchmarking.
- [ ] Video rendering/export, subtitle modes and end-to-end dubbing workflow.
- [ ] Safe credential storage via system keychain, log export, CLI, MCP and extension API.

## Architecture

React renders the interface. Rust owns project persistence and native commands; a project is versioned JSON referencing media files at their original paths. Experimental CLI adapters can invoke external inference tools but are not yet integrated into the desktop workflow. Keep future adapters isolated by task, run them in bounded cancellable workers, and avoid keeping large media or models in memory unnecessarily.

Processing dependencies and model weights belong in a managed, versioned application data cache, not in the Tauri bundle. When a processing task needs a missing component, the future pipeline should select a compatible, licensed build for the OS and architecture, check disk space and verify its integrity before installing it. Downloads must be visible, cancellable, resumable where supported, and reusable across projects; failures must not be reported as successful processing. Hardware selection must use measured resource limits and language support, with a user override and a safe fallback. Downloading a runtime alone does not implement or validate an inference pipeline.

## Milestones

1. Validate workspace persistence and playback on macOS and Windows; improve timeline and missing-file recovery.
2. Add explicitly downloaded and verified ASR/diarization models and editable time-aligned transcript.
3. Benchmark translation, TTS and separation candidates for each supported language and license; integrate compatible runtimes with transparent resource limits.
4. Add audio mixing, render/export, automated end-to-end tests and reproducible CPU/RAM/GPU/disk benchmarks on 8 GB machines.
5. Add subtitle/voiceover/karaoke modes, then stable CLI/MCP and an extension interface with scoped permissions.

Never mark a feature or model as supported solely because an upstream project claims support. Record version, license, platform, language, measured hardware and test results. Do not commit tokens, media, personal data or generated logs.
