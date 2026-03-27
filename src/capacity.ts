import type { EncodeOptions, CapacityInfo, ImageLike } from './types';
import { resolveEncodeOpts, maxPayloadBytes } from './utils';

function humanReadable(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Calculate how much secret data an image can hold with the given settings.
 */
export function capacity(imageData: ImageLike, options?: EncodeOptions): CapacityInfo {
  const { bitsPerChannel, channels } = resolveEncodeOpts(options);
  const totalBytes = maxPayloadBytes(imageData, bitsPerChannel, channels.length);

  return {
    totalBytes,
    readable: humanReadable(totalBytes),
    width: imageData.width,
    height: imageData.height,
  };
}
