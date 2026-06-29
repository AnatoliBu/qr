const CHUNK_SIZE = 0x8000;

/**
 * Converts a raw byte buffer to a latin1 "binary string" (one char per byte),
 * suitable as input to `btoa()` for base64 encoding of binary data such as PNGs.
 *
 * Do NOT use this on UTF-8 text buffers: multibyte sequences would be split into
 * separate chars and corrupted. Use `TextDecoder` for text.
 *
 * Chunks by {@link CHUNK_SIZE} so the argument-spread into `String.fromCharCode`
 * does not overflow the call-stack on large buffers.
 */
export function bytesToBinaryString(bytes: Uint8Array): string {
  let result = "";
  for (let index = 0; index < bytes.length; index += CHUNK_SIZE) {
    const chunk = bytes.subarray(index, index + CHUNK_SIZE);
    result += String.fromCharCode(...chunk);
  }
  return result;
}
