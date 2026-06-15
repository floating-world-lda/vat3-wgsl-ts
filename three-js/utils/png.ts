// Copyright (c) Floating World, LDA. All Rights Reserved.

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RGBA_BYTES_PER_PIXEL = 4;

export interface DecodedPng {
  data: Uint8Array;
  height: number;
  width: number;
}

const inflate = async (
  data: Uint8Array<ArrayBuffer>
): Promise<Uint8Array<ArrayBuffer>> => {
  const stream = new Response(data).body!.pipeThrough(
    new DecompressionStream('deflate')
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

const concatChunks = (chunks: Uint8Array[]): Uint8Array<ArrayBuffer> => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
};

const paethPredictor = (a: number, b: number, c: number): number => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
};

const unfilterScanline = (
  filterType: number,
  row: Uint8Array,
  prevRow: Uint8Array,
  out: Uint8Array
): void => {
  for (let i = 0; i < row.length; i++) {
    const a = i >= RGBA_BYTES_PER_PIXEL ? out[i - RGBA_BYTES_PER_PIXEL] : 0;
    const b = prevRow[i];
    const c = i >= RGBA_BYTES_PER_PIXEL ? prevRow[i - RGBA_BYTES_PER_PIXEL] : 0;
    const x = row[i];

    let value: number;
    switch (filterType) {
      case 0: // None
        value = x;
        break;
      case 1: // Sub
        value = x + a;
        break;
      case 2: // Up
        value = x + b;
        break;
      case 3: // Average
        value = x + Math.floor((a + b) / 2);
        break;
      case 4: // Paeth
        value = x + paethPredictor(a, b, c);
        break;
      default:
        throw new Error(
          `decodePngRgba8: unsupported scanline filter type ${filterType}`
        );
    }

    out[i] = value & 0xff;
  }
};

export const decodePngRgba8 = async (
  buffer: ArrayBuffer
): Promise<DecodedPng> => {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) {
      throw new Error('decodePngRgba8: not a valid PNG file');
    }
  }

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks: Uint8Array[] = [];

  let offset = PNG_SIGNATURE.length;
  while (offset < bytes.length) {
    const length = view.getUint32(offset, false);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const dataStart = offset + 8;

    if (type === 'IHDR') {
      width = view.getUint32(dataStart, false);
      height = view.getUint32(dataStart + 4, false);
      bitDepth = bytes[dataStart + 8];
      colorType = bytes[dataStart + 9];
    } else if (type === 'IDAT') {
      idatChunks.push(bytes.subarray(dataStart, dataStart + length));
    } else if (type === 'IEND') {
      break;
    }

    offset = dataStart + length + 4; // skip CRC
  }

  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(
      `decodePngRgba8: unsupported PNG format (bitDepth=${bitDepth}, colorType=${colorType}); only non-interlaced 8-bit RGBA PNGs are supported`
    );
  }

  const raw = await inflate(concatChunks(idatChunks));

  const stride = width * RGBA_BYTES_PER_PIXEL;
  const data = new Uint8Array(width * height * RGBA_BYTES_PER_PIXEL);

  let prevRow = new Uint8Array(stride);
  let rawOffset = 0;
  for (let y = 0; y < height; y++) {
    const filterType = raw[rawOffset];
    rawOffset += 1;
    const row = raw.subarray(rawOffset, rawOffset + stride);
    rawOffset += stride;

    const outRow = data.subarray(y * stride, (y + 1) * stride);
    unfilterScanline(filterType, row, prevRow, outRow);

    prevRow = outRow;
  }

  return { data, height, width };
};
