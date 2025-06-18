const CRC = function (): Uint32Array<ArrayBuffer> {
  const array = new Uint32Array(256);
  for (let i = 0; i < 256; ++i) {
    let x = i;
    for (let j = 0; j < 8; ++j) {
      x = (x & 1) ? 0xEDB88320 ^ (x >>> 1) : x >>> 1;
    }
    array[i] = x;
  }
  return array;
}();

export function calcCRC(
  buffer: Uint8Array<ArrayBuffer> | Uint8ClampedArray<ArrayBuffer>,
): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buffer.length; ++i) {
    crc = CRC[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
  }
  return ~crc >>> 0;
}
