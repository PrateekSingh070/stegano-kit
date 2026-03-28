import type { ImageLike } from './types';
import { MAGIC } from './utils';

export interface DetectResult {
  /** Whether the image likely contains hidden steganographic data */
  hasHiddenData: boolean;
  /** Confidence score from 0 to 1 */
  confidence: number;
  /** Detected encoding method */
  method: string;
  /** Additional analysis details */
  details?: string;
}

/**
 * Analyze an image for signs of LSB steganographic data.
 *
 * Uses two approaches:
 * 1. Magic header detection — checks if the stegano-kit magic bytes are present in LSB positions
 * 2. Chi-square analysis — statistical test on LSB distribution to detect non-random patterns
 */
export function detect(imageData: ImageLike): DetectResult {
  const magicResult = detectMagicHeader(imageData);
  if (magicResult.hasHiddenData) {
    return magicResult;
  }

  const chiResult = chiSquareAnalysis(imageData);
  return chiResult;
}

function detectMagicHeader(imageData: ImageLike): DetectResult {
  const bits: number[] = [];

  for (let px = 0; px < Math.min(imageData.width * imageData.height, 32); px++) {
    const base = px * 4;
    for (let c = 0; c < 3; c++) {
      bits.push(imageData.data[base + c] & 1);
      if (bits.length >= 32) break;
    }
    if (bits.length >= 32) break;
  }

  if (bits.length < 32) {
    return { hasHiddenData: false, confidence: 0, method: 'none', details: 'Image too small to analyze' };
  }

  let value = 0;
  for (let i = 0; i < 32; i++) {
    value = (value << 1) | bits[i];
  }
  value = value >>> 0;

  if (value === MAGIC) {
    return {
      hasHiddenData: true,
      confidence: 0.99,
      method: 'lsb',
      details: 'stegano-kit magic header detected in LSB positions (RGB, 1 bit/channel)',
    };
  }

  const channelConfigs: Array<{ channels: number[]; name: string }> = [
    { channels: [0], name: 'R only' },
    { channels: [1], name: 'G only' },
    { channels: [2], name: 'B only' },
    { channels: [0, 1, 2, 3], name: 'RGBA' },
  ];

  for (const config of channelConfigs) {
    const configBits: number[] = [];
    for (let px = 0; px < imageData.width * imageData.height; px++) {
      const base = px * 4;
      for (const c of config.channels) {
        configBits.push(imageData.data[base + c] & 1);
        if (configBits.length >= 32) break;
      }
      if (configBits.length >= 32) break;
    }

    if (configBits.length >= 32) {
      let v = 0;
      for (let i = 0; i < 32; i++) {
        v = (v << 1) | configBits[i];
      }
      if ((v >>> 0) === MAGIC) {
        return {
          hasHiddenData: true,
          confidence: 0.99,
          method: 'lsb',
          details: `stegano-kit magic header detected (${config.name})`,
        };
      }
    }
  }

  return { hasHiddenData: false, confidence: 0, method: 'none' };
}

/**
 * Chi-square test on LSB distribution.
 * Natural images have roughly random LSBs, but embedded data can shift the distribution.
 */
function chiSquareAnalysis(imageData: ImageLike): DetectResult {
  const sampleSize = Math.min(imageData.width * imageData.height * 3, 100_000);
  const pairs = new Map<number, [number, number]>();

  for (let i = 0; i < sampleSize; i++) {
    const px = Math.floor(i / 3);
    const ch = i % 3;
    const val = imageData.data[px * 4 + ch];
    const pairKey = val & 0xfe; // group by pairs (e.g., 0-1, 2-3, 4-5...)
    const entry = pairs.get(pairKey) || [0, 0];
    entry[val & 1]++;
    pairs.set(pairKey, entry);
  }

  let chiSquare = 0;
  let pairCount = 0;

  for (const [, [even, odd]] of pairs) {
    const total = even + odd;
    if (total < 4) continue;
    const expected = total / 2;
    chiSquare += ((even - expected) ** 2) / expected;
    chiSquare += ((odd - expected) ** 2) / expected;
    pairCount++;
  }

  if (pairCount === 0) {
    return { hasHiddenData: false, confidence: 0, method: 'none' };
  }

  const normalizedChi = chiSquare / pairCount;

  // In natural images, normalized chi-square is typically > 2.0
  // In images with LSB-embedded data, it drops close to 0
  const isEmbedded = normalizedChi < 0.5;
  const confidence = isEmbedded
    ? Math.min(1, (0.5 - normalizedChi) / 0.5)
    : 0;

  return {
    hasHiddenData: isEmbedded,
    confidence: Math.round(confidence * 100) / 100,
    method: isEmbedded ? 'lsb (statistical)' : 'none',
    details: isEmbedded
      ? `Chi-square analysis suggests LSB embedding (χ²/n = ${normalizedChi.toFixed(3)})`
      : `No statistical evidence of LSB embedding (χ²/n = ${normalizedChi.toFixed(3)})`,
  };
}
