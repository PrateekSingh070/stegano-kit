import { describe, it, expect } from 'vitest';
import { encode, detect } from '../src/index';
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

describe('detect', () => {
  it('detects stegano-kit encoded data via magic header', async () => {
    const img = createBlankImage(100, 100);
    const encoded = await encode(img, 'Secret message');
    const result = detect(encoded);
    expect(result.hasHiddenData).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.method).toBe('lsb');
  });

  it('detects data encoded with single channel', async () => {
    const img = createRandomImage(100, 100);
    const encoded = await encode(img, 'Red only', { channels: ['r'] });
    const result = detect(encoded);
    expect(result.hasHiddenData).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('detects data encoded with RGBA channels', async () => {
    const img = createRandomImage(100, 100);
    const encoded = await encode(img, 'All channels', {
      channels: ['r', 'g', 'b', 'a'],
    });
    const result = detect(encoded);
    expect(result.hasHiddenData).toBe(true);
  });

  it('returns no detection on a clean random image', () => {
    const img = createRandomImage(200, 200);
    const result = detect(img);
    expect(result.hasHiddenData).toBe(false);
  });

  it('returns no detection on a clean blank image', () => {
    const img = createBlankImage(100, 100);
    const result = detect(img);
    expect(result.hasHiddenData).toBe(false);
  });

  it('provides details string in the result', async () => {
    const img = createBlankImage(100, 100);
    const encoded = await encode(img, 'test');
    const result = detect(encoded);
    expect(result.details).toBeDefined();
    expect(result.details!.length).toBeGreaterThan(0);
  });
});
