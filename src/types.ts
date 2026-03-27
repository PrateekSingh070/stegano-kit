export interface EncodeOptions {
  /** Number of least-significant bits to use per color channel (1-4). Default: 1 */
  bitsPerChannel?: number;
  /** Which color channels to embed data in. Default: ['r','g','b'] */
  channels?: Array<'r' | 'g' | 'b' | 'a'>;
  /** Optional encryption password — AES-256-GCM via SubtleCrypto */
  password?: string;
}

export interface DecodeOptions {
  /** Must match the bitsPerChannel used during encoding. Default: 1 */
  bitsPerChannel?: number;
  /** Must match the channels used during encoding. Default: ['r','g','b'] */
  channels?: Array<'r' | 'g' | 'b' | 'a'>;
  /** Password if the message was encrypted during encoding */
  password?: string;
}

export interface CapacityInfo {
  /** Total bytes that can be hidden in this image with current settings */
  totalBytes: number;
  /** Human-readable capacity string (e.g. "12.4 KB") */
  readable: string;
  /** Image dimensions */
  width: number;
  height: number;
}

export interface ImageLike {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}
