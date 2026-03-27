import { describe, it, expect } from 'vitest';
import { encode, decode, capacity } from '../src/index';
import type { ImageLike } from '../src/types';

function createBlankImage(w: number, h: number): ImageLike {
  return {
    width: w,
    height: h,
    data: new Uint8ClampedArray(w * h * 4).fill(255),
  };
}

function createRandomImage(w: number, h: number): ImageLike {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.floor(Math.random() * 256);
  }
  return { width: w, height: h, data };
}

describe('encode & decode', () => {
  it('round-trips a simple message on a blank image', async () => {
    const img = createBlankImage(100, 100);
    const secret = 'Hello, steganography!';
    const encoded = await encode(img, secret);
    const decoded = await decode(encoded);
    expect(decoded).toBe(secret);
  });

  it('round-trips on a random-noise image', async () => {
    const img = createRandomImage(200, 200);
    const secret = 'Hidden in noise 🎭';
    const encoded = await encode(img, secret);
    const decoded = await decode(encoded);
    expect(decoded).toBe(secret);
  });

  it('handles empty string', async () => {
    const img = createBlankImage(50, 50);
    const encoded = await encode(img, '');
    const decoded = await decode(encoded);
    expect(decoded).toBe('');
  });

  it('handles long messages up to capacity', async () => {
    const img = createBlankImage(200, 200);
    const cap = capacity(img);
    const secret = 'A'.repeat(cap.totalBytes - 1);
    const encoded = await encode(img, secret);
    const decoded = await decode(encoded);
    expect(decoded).toBe(secret);
  });

  it('throws when message exceeds capacity', async () => {
    const img = createBlankImage(10, 10);
    const cap = capacity(img);
    const secret = 'X'.repeat(cap.totalBytes + 100);
    await expect(encode(img, secret)).rejects.toThrow(RangeError);
  });

  it('round-trips with 2 bits per channel', async () => {
    const img = createRandomImage(100, 100);
    const opts = { bitsPerChannel: 2 as const };
    const secret = 'Using more bits per channel!';
    const encoded = await encode(img, secret, opts);
    const decoded = await decode(encoded, opts);
    expect(decoded).toBe(secret);
  });

  it('round-trips using only the red channel', async () => {
    const img = createRandomImage(150, 150);
    const opts = { channels: ['r' as const] };
    const secret = 'Red channel only';
    const encoded = await encode(img, secret, opts);
    const decoded = await decode(encoded, opts);
    expect(decoded).toBe(secret);
  });

  it('round-trips using all 4 RGBA channels', async () => {
    const img = createRandomImage(100, 100);
    const opts = { channels: ['r' as const, 'g' as const, 'b' as const, 'a' as const] };
    const secret = 'All four channels!';
    const encoded = await encode(img, secret, opts);
    const decoded = await decode(encoded, opts);
    expect(decoded).toBe(secret);
  });

  it('decode fails with wrong options', async () => {
    const img = createBlankImage(100, 100);
    const encoded = await encode(img, 'secret', { bitsPerChannel: 2 });
    await expect(decode(encoded, { bitsPerChannel: 1 })).rejects.toThrow();
  });

  it('does not visibly alter the image (LSB-1 changes ≤ 1 per channel)', async () => {
    const img = createRandomImage(100, 100);
    const encoded = await encode(img, 'subtle');
    for (let i = 0; i < img.data.length; i++) {
      expect(Math.abs(encoded.data[i] - img.data[i])).toBeLessThanOrEqual(1);
    }
  });

  it('handles unicode / emoji messages', async () => {
    const img = createBlankImage(100, 100);
    const secret = '日本語テスト 🇯🇵 مرحبا';
    const encoded = await encode(img, secret);
    const decoded = await decode(encoded);
    expect(decoded).toBe(secret);
  });
});

describe('capacity', () => {
  it('returns correct capacity for default settings', () => {
    const img = createBlankImage(100, 100);
    const cap = capacity(img);
    // 100*100 pixels * 3 channels * 1 bit = 30000 bits, minus 64 header bits = 29936 bits = 3742 bytes
    expect(cap.totalBytes).toBe(3742);
    expect(cap.width).toBe(100);
    expect(cap.height).toBe(100);
    expect(cap.readable).toContain('KB');
  });

  it('capacity increases with more bits per channel', () => {
    const img = createBlankImage(100, 100);
    const cap1 = capacity(img, { bitsPerChannel: 1 });
    const cap2 = capacity(img, { bitsPerChannel: 2 });
    expect(cap2.totalBytes).toBeGreaterThan(cap1.totalBytes);
  });

  it('capacity increases with more channels', () => {
    const img = createBlankImage(100, 100);
    const cap3 = capacity(img, { channels: ['r', 'g', 'b'] });
    const cap4 = capacity(img, { channels: ['r', 'g', 'b', 'a'] });
    expect(cap4.totalBytes).toBeGreaterThan(cap3.totalBytes);
  });
});
