# stegano-kit

Lightweight, zero-dependency steganography library for the browser and Node.js. Hide secret messages inside images using LSB (Least Significant Bit) encoding, with optional AES-256 encryption.

```
npm install stegano-kit
```

## Why?

Existing JS steganography packages are either abandoned, browser-only, lack TypeScript support, or have heavy dependencies. `stegano-kit` is:

- **Tiny** — under 8 KB bundled, zero runtime dependencies
- **Typed** — first-class TypeScript with full type exports
- **Flexible** — configurable bits-per-channel (1–4), channel selection (R/G/B/A)
- **Secure** — optional AES-256-GCM encryption via Web Crypto
- **Universal** — works in browsers (Canvas API) and Node.js (raw pixel buffers)

## Quick Start

### Browser

```js
import { encode, decode, capacity } from 'stegano-kit';

// Load image onto a canvas
const img = document.getElementById('source-image');
const canvas = document.createElement('canvas');
canvas.width = img.naturalWidth;
canvas.height = img.naturalHeight;
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);

// Check capacity
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
console.log(capacity(imageData));
// → { totalBytes: 3742, readable: '3.7 KB', width: 100, height: 100 }

// Encode a secret message
const encoded = await encode(imageData, 'Attack at dawn 🌅');
ctx.putImageData(new ImageData(encoded.data, encoded.width, encoded.height), 0, 0);

// Decode
const decoded = await decode(encoded);
console.log(decoded); // → "Attack at dawn 🌅"
```

### Node.js (with raw pixel data)

```js
const { encode, decode } = require('stegano-kit');

// Create or load RGBA pixel data from your image library of choice
const imageData = {
  width: 200,
  height: 200,
  data: new Uint8ClampedArray(200 * 200 * 4), // your pixel data
};

const encoded = await encode(imageData, 'Secret message');
const secret = await decode(encoded);
```

## API

### `encode(imageData, message, options?)`

Embeds a secret string into image pixel data.

| Parameter   | Type         | Description                              |
| ----------- | ------------ | ---------------------------------------- |
| `imageData` | `ImageLike`  | Object with `width`, `height`, and `data` (Uint8ClampedArray RGBA) |
| `message`   | `string`     | The secret text to hide                  |
| `options`   | `EncodeOptions` | Optional settings (see below)         |

Returns `Promise<ImageLike>` — a new pixel buffer with the message embedded.

### `decode(imageData, options?)`

Extracts a hidden message from image pixel data.

| Parameter   | Type         | Description                              |
| ----------- | ------------ | ---------------------------------------- |
| `imageData` | `ImageLike`  | Encoded image pixel data                 |
| `options`   | `DecodeOptions` | Must match encoding options           |

Returns `Promise<string>` — the decoded secret.

### `capacity(imageData, options?)`

Calculates how many bytes of secret data the image can hold.

Returns `CapacityInfo`:

```ts
{
  totalBytes: number;  // max payload size in bytes
  readable: string;    // human-friendly string like "12.4 KB"
  width: number;
  height: number;
}
```

## Options

```ts
interface EncodeOptions {
  bitsPerChannel?: number;        // 1–4, default: 1
  channels?: ('r'|'g'|'b'|'a')[]; // default: ['r','g','b']
  password?: string;               // enables AES-256-GCM encryption
}
```

| Option           | Default         | Description                        |
| ---------------- | --------------- | ---------------------------------- |
| `bitsPerChannel` | `1`             | More bits = more capacity, but more visible artifacts |
| `channels`       | `['r','g','b']` | Which color channels to use        |
| `password`       | `undefined`     | If set, payload is encrypted with AES-256-GCM |

> **Tip:** `bitsPerChannel: 1` with RGB channels is virtually invisible to the human eye. Increase to 2 for ~2x capacity if minor color shifts are acceptable.

## Encryption

Pass a `password` to both `encode` and `decode` to encrypt the payload with AES-256-GCM (PBKDF2 key derivation, 100k iterations):

```js
const encoded = await encode(imageData, 'Top secret', { password: 'my-key' });
const decoded = await decode(encoded, { password: 'my-key' });
```

Without the correct password, `decode` will throw.

## How It Works

1. Your message is converted to bytes (UTF-8), optionally encrypted
2. A bit stream is constructed: `[32-bit magic header][32-bit payload length][payload bits]`
3. Each bit is written into the least significant bit(s) of selected color channels
4. On decode, the magic header is verified, length is read, and payload is extracted

The image looks identical to the naked eye — pixel values change by at most ±1 (with default 1-bit encoding).

## Limitations

- Input must be raw RGBA pixel data (`Uint8ClampedArray`). Use Canvas API in browsers, or a library like `sharp`/`jimp` in Node.js to get pixel buffers.
- JPEG re-compression destroys hidden data. Always save encoded images as PNG.
- Alpha channel encoding (`channels: ['r','g','b','a']`) may cause issues with transparent images.

## License

MIT © [Prateek Singh](https://github.com/PrateekSingh070)
