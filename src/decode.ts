import type { DecodeOptions, ImageLike } from './types';
import {
  resolveDecodeOpts,
  getChannelIndices,
  readUint32,
  bytesToText,
  MAGIC,
  HEADER_BITS,
  decrypt,
} from './utils';

/**
 * Decode a hidden message from RGBA pixel data.
 *
 * @param imageData - Object with `width`, `height`, and `data` (Uint8ClampedArray of RGBA pixels).
 * @param options   - Must match the options used during encoding.
 * @returns The decoded secret string.
 */
export async function decode(
  imageData: ImageLike,
  options?: DecodeOptions,
): Promise<string> {
  const { bitsPerChannel, channels, password } = resolveDecodeOpts(options);
  const channelIdx = getChannelIndices(channels as Array<'r' | 'g' | 'b' | 'a'>);

  const extractBits = (count: number, startBit: number): { bits: Uint8Array; nextBit: number } => {
    const bits = new Uint8Array(count);
    let bitPos = startBit;
    let written = 0;
    let px = Math.floor(bitPos / (channelIdx.length * bitsPerChannel));
    let channelOffset = Math.floor((bitPos % (channelIdx.length * bitsPerChannel)) / bitsPerChannel);
    let bitInChannel = bitPos % bitsPerChannel;

    outer: for (; px < imageData.width * imageData.height; px++) {
      const base = px * 4;
      for (; channelOffset < channelIdx.length; channelOffset++) {
        const val = imageData.data[base + channelIdx[channelOffset]];
        for (; bitInChannel < bitsPerChannel; bitInChannel++) {
          if (written >= count) break outer;
          const shift = bitsPerChannel - 1 - bitInChannel;
          bits[written++] = (val >>> shift) & 1;
          bitPos++;
        }
        bitInChannel = 0;
      }
      channelOffset = 0;
    }

    return { bits, nextBit: bitPos };
  };

  // Read magic header
  const { bits: magicBits, nextBit: afterMagic } = extractBits(HEADER_BITS, 0);
  const magic = readUint32(magicBits, 0);
  if (magic !== MAGIC) {
    throw new Error(
      'No hidden message found (magic header mismatch). ' +
        'Make sure decode options match the ones used during encoding.',
    );
  }

  // Read payload length
  const { bits: lenBits, nextBit: afterLen } = extractBits(HEADER_BITS, afterMagic);
  const payloadLen = readUint32(lenBits, 0);

  if (payloadLen < 0 || payloadLen > imageData.width * imageData.height) {
    throw new Error('Invalid payload length detected. The image may not contain a hidden message.');
  }

  // Read payload bytes
  const { bits: payloadBits } = extractBits(payloadLen * 8, afterLen);
  const bytes = new Uint8Array(payloadLen);
  for (let i = 0; i < payloadLen; i++) {
    let byte = 0;
    for (let b = 7; b >= 0; b--) {
      byte |= payloadBits[i * 8 + (7 - b)] << b;
    }
    bytes[i] = byte;
  }

  if (password) {
    const decrypted = await decrypt(bytes, password);
    return bytesToText(decrypted);
  }

  return bytesToText(bytes);
}
