import type { EncodeOptions, DecodeOptions, ImageLike } from './types';

const HEADER_BITS = 32;
const MAGIC = 0x5354_4547; // "STEG" as uint32

export function getChannelIndices(channels: Array<'r' | 'g' | 'b' | 'a'>): number[] {
  const map: Record<string, number> = { r: 0, g: 1, b: 2, a: 3 };
  return channels.map((c) => map[c]);
}

export function resolveEncodeOpts(opts?: EncodeOptions) {
  return {
    bitsPerChannel: opts?.bitsPerChannel ?? 1,
    channels: opts?.channels ?? (['r', 'g', 'b'] as const),
    password: opts?.password,
  };
}

export function resolveDecodeOpts(opts?: DecodeOptions) {
  return {
    bitsPerChannel: opts?.bitsPerChannel ?? 1,
    channels: opts?.channels ?? (['r', 'g', 'b'] as const),
    password: opts?.password,
  };
}

export function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Build the bit stream: 32-bit magic + 32-bit length + payload bits.
 * Length is in bytes (of the payload).
 */
export function buildBitStream(payload: Uint8Array): Uint8Array {
  const totalBits = HEADER_BITS + HEADER_BITS + payload.length * 8;
  const bits = new Uint8Array(totalBits);

  let idx = 0;

  for (let i = 31; i >= 0; i--) bits[idx++] = (MAGIC >>> i) & 1;
  for (let i = 31; i >= 0; i--) bits[idx++] = (payload.length >>> i) & 1;

  for (const byte of payload) {
    for (let i = 7; i >= 0; i--) {
      bits[idx++] = (byte >>> i) & 1;
    }
  }

  return bits;
}

/** Extract 32-bit uint from a bit array starting at `offset`. */
export function readUint32(bits: Uint8Array, offset: number): number {
  let value = 0;
  for (let i = 0; i < 32; i++) {
    value = (value << 1) | bits[offset + i];
  }
  return value >>> 0;
}

export function maxPayloadBytes(
  imageData: ImageLike,
  bitsPerChannel: number,
  channelCount: number,
): number {
  const totalUsableBits = imageData.width * imageData.height * channelCount * bitsPerChannel;
  const headerBits = HEADER_BITS * 2;
  return Math.floor((totalUsableBits - headerBits) / 8);
}

export { MAGIC, HEADER_BITS };

// ── Encryption helpers (Web Crypto AES-256-GCM) ──

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encrypt(data: Uint8Array, password: string): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  const out = new Uint8Array(salt.length + iv.length + cipher.byteLength);
  out.set(salt, 0);
  out.set(iv, salt.length);
  out.set(new Uint8Array(cipher), salt.length + iv.length);
  return out;
}

export async function decrypt(data: Uint8Array, password: string): Promise<Uint8Array> {
  const salt = data.slice(0, 16);
  const iv = data.slice(16, 28);
  const cipher = data.slice(28);
  const key = await deriveKey(password, salt);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new Uint8Array(plain);
}
