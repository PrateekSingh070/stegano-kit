import type { EncodeOptions, ImageLike } from './types';
import {
  resolveEncodeOpts,
  textToBytes,
  buildBitStream,
  getChannelIndices,
  maxPayloadBytes,
  encrypt,
} from './utils';

/**
 * Encode a secret message into raw RGBA pixel data using LSB steganography.
 *
 * @param imageData - Object with `width`, `height`, and `data` (Uint8ClampedArray of RGBA pixels).
 *                    In the browser, pass the result of `ctx.getImageData(...)`.
 * @param message   - The secret string to hide.
 * @param options   - Optional encoding parameters.
 * @returns A new ImageData-like object with the message embedded.
 */
export async function encode(
  imageData: ImageLike,
  message: string,
  options?: EncodeOptions,
): Promise<ImageLike> {
  const { bitsPerChannel, channels, password } = resolveEncodeOpts(options);

  let payload = textToBytes(message);
  if (password) {
    payload = await encrypt(payload, password);
  }

  const capacity = maxPayloadBytes(imageData, bitsPerChannel, channels.length);
  if (payload.length > capacity) {
    throw new RangeError(
      `Message too large: ${payload.length} bytes, but image can hold at most ${capacity} bytes ` +
        `with current settings (${bitsPerChannel} bits/channel, channels: ${channels.join(',')}).`,
    );
  }

  const bits = buildBitStream(payload);
  const channelIdx = getChannelIndices(channels as Array<'r' | 'g' | 'b' | 'a'>);
  const out = new Uint8ClampedArray(imageData.data);

  const mask = 0xff << bitsPerChannel;
  let bitPos = 0;

  outer: for (let px = 0; px < imageData.width * imageData.height; px++) {
    const base = px * 4;
    for (const ci of channelIdx) {
      if (bitPos >= bits.length) break outer;

      let value = 0;
      for (let b = bitsPerChannel - 1; b >= 0; b--) {
        if (bitPos < bits.length) {
          value |= bits[bitPos++] << b;
        }
      }
      out[base + ci] = (out[base + ci] & mask) | value;
    }
  }

  return { width: imageData.width, height: imageData.height, data: out };
}
