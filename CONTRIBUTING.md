# Contributing to stegano-kit

Thanks for your interest in contributing! Here's how to get started.

## Setup

```bash
git clone https://github.com/PrateekSingh070/stegano-kit.git
cd stegano-kit
npm install
```

## Development

```bash
npm test          # run tests once
npm run test:watch # run tests in watch mode
npm run build      # build the package
npm run lint       # type-check with tsc
```

## Making Changes

1. Fork the repo and create a branch from `main`
2. Write your code — follow the existing style (TypeScript strict mode, no `any`)
3. Add or update tests for any new functionality
4. Run `npm test` and make sure everything passes
5. Open a PR with a clear description of what you changed and why

## What We're Looking For

- Bug fixes with a test that reproduces the issue
- Performance improvements (especially for large images)
- New encoding strategies (beyond LSB)
- Better Node.js integration (e.g. helpers for `sharp` or `jimp`)
- Documentation improvements

## Code Style

- TypeScript strict mode
- No runtime dependencies
- Prefer pure functions
- All public API functions must have JSDoc comments

## Reporting Bugs

Use the [bug report template](https://github.com/PrateekSingh070/stegano-kit/issues/new?template=bug_report.yml) and include:
- Steps to reproduce
- Expected vs actual behavior
- Environment (browser/Node.js, version)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
