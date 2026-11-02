<div align="center">
  <img src="public/logo.png" alt="DubStudio logo" width="96" />
  <h1>DubStudio</h1>
  <p>A desktop workspace for dubbing projects.</p>
  <p>macOS · Windows · English · Tiếng Việt</p>
</div>

[Tiếng Việt](README.vi.md)

DubStudio is an open-source Tauri application for organizing dubbing projects. The current build provides a project workspace, media preview, editable speakers and dialogue, and optional online translation of an individual line with Google AI Studio.

**Development status:** ASR, automatic speaker recognition, local translation, speech synthesis, source separation, timeline editing and video export are not implemented. The workspace timeline is a view of project content, not a full editor. See the [roadmap](docs/ROADMAP.md) and [model evaluation list](docs/MODELS.md).

## Getting started

Install Node.js 24, pnpm 11, Rust, and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform. Then run:

```sh
pnpm install --frozen-lockfile
pnpm tauri dev
```

Alternatively, double-click `Dev.command` on macOS or `Dev.bat` on Windows. To build and install, use `Build and Install.command` or `Build and Install.bat`. The macOS script installs in `/Applications`; Windows builds an NSIS installer and runs it silently for the current user. Applications are not signed or notarized.

## Google translation

Translation is optional and sends the selected dialogue text to Google only after the user confirms. Google may use free-tier content to improve its products; quotas, availability and pricing can change. See [Google's pricing and terms](https://ai.google.dev/gemini-api/docs/pricing). DubStudio sets `store=false` on the Interactions API request.

Set `GOOGLE_API_KEY` in the application process environment. During development only, the app also reads `GOOGLE_API_KEY` from a local `.env` file in the repository root if no environment variable is set. `.env` is ignored by Git but is plaintext: protect the file, do not share or publish it, and do not put the key in `VITE_` variables or frontend code. Production builds do not read `.env`; system keychain integration is planned. Never bundle a shared key in a public release.

## Projects

New `.dub` files contain versioned JSON with media references, speakers and editable dialogue. Media remains at its original location. Legacy `.dubstudio` files can be opened and saved to a new `.dub` file; the original is retained. Settings and recent projects live in the operating system's application-data directory.

## Development and tests

```sh
pnpm build
pnpm test
cargo test --manifest-path src-tauri/Cargo.toml
pnpm tauri build
```

`src/` contains the React interface; `src-tauri/` contains native project and translation code. Do not commit credentials, personal media, generated logs or model weights. Contributions should include relevant tests and accurately describe user-visible behavior.

## License

[MIT](LICENSE). Third-party models, voices, runtimes and media may have separate licenses.
