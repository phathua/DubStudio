<div align="center">
  <img src="public/logo.png" alt="DubStudio logo" width="120" />
  <h1>DubStudio</h1>
  <p>A little space for your big ideas.</p>
  <p>Lightweight desktop project management, built for the future of dubbing.</p>
  <p><strong>macOS · Windows · English · Tiếng Việt</strong></p>
</div>

## What is DubStudio?

DubStudio is an open-source desktop foundation for organizing dubbing projects. Create a blank project, attach a video for future AI workflows, or bring an existing DubStudio project back into your recent list. Projects and settings stay on your computer.

> **Current scope:** AI processing and project editing are not implemented yet. Videos are referenced at their original location, not copied into the project. Moving or deleting a video may break its reference.

## Features

- Real `.dubstudio` project files and a persistent recent-project list
- Search, sort, grid and list views; clear warnings for missing files
- English and Vietnamese, with light, dark and system appearance
- Custom desktop windows, startup screen and adaptive menus
- Tauri 2, Rust, React and TypeScript

## Getting started

Prerequisites: Node.js 24, pnpm 11, Rust and the platform dependencies described in the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). On macOS, install Xcode Command Line Tools. On Windows, install the required Microsoft C++ build tools and WebView2.

```sh
pnpm install --frozen-lockfile
pnpm tauri dev
```

To produce a distributable for the current operating system:

```sh
pnpm tauri build
```

The bundle is written under `src-tauri/target/release/bundle/`. Building a Windows installer requires Windows; building a macOS app requires macOS. Signing and notarization are not configured.

## Development

```sh
pnpm build          # Type-check and build the interface
pnpm test           # Interface logic tests
cargo test --manifest-path src-tauri/Cargo.toml
```

`src/` contains the interface, translations and styles. `src-tauri/` contains the native application, project persistence, window configuration and icons. `public/` contains the shared logo. CI builds and tests on macOS and Windows.

## Project files and privacy

A `.dubstudio` file is versioned JSON containing the project name, creation/update dates and an optional absolute video path. Settings and recent-project references live in the operating system's application-data directory. Removing a project from the recent list does not delete its project or video file. Import accepts DubStudio project files only.

## Contributing

Issues and contributions are welcome. Please keep changes focused, run the checks above, and explain user-visible changes in your pull request. Do not include personal media, credentials or application data in contributions.

## License

[MIT](LICENSE). The supplied DubStudio logo is included as part of this repository.
