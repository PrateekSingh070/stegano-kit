# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-28

### Added
- **CLI tool** — `stegano` command for encode/decode/capacity/detect from the terminal
- **Detection module** — `detect()` function for steganalysis using magic header scan and chi-square analysis
- Node.js PNG support via CLI (reads/writes PNG files directly)
- 6 new tests for detection module (20 total)

### Dependencies
- Added `commander` for CLI argument parsing
- Added `pngjs` for Node.js PNG file I/O

## [1.0.0] - 2026-03-27

### Added
- Core LSB steganography encoding and decoding
- Configurable bits-per-channel (1–4) for capacity vs. stealth tradeoff
- Channel selection — use any combination of R, G, B, A
- AES-256-GCM encryption via Web Crypto (PBKDF2 key derivation)
- `capacity()` function to check how much data an image can hold
- Full TypeScript types with strict mode
- 14 unit tests covering round-trips, edge cases, unicode, and capacity limits
- Interactive browser demo (`examples/index.html`)
- CI pipeline (GitHub Actions) testing Node 18/20/22
- NPM publish workflow on GitHub Release
