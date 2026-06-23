// Minimal, dependency-free ZIP builder using the STORE method (no compression).
// Demo PDFs are already compressed, so storing them as-is keeps the archive
// valid and compact while avoiding any third-party library (and any lockfile
// churn). Produces a Blob ready to download — one file, so it works reliably on
// every browser including iOS Safari, which throttles multi-file downloads.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const u16 = (v: number) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff]);
const u32 = (v: number) =>
  new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]);

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

export const zipFiles = (entries: ZipEntry[]): Blob => {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  // DOS time/date are required header fields but only cosmetic for a demo
  // bundle; fixed values avoid any clock/date dependency.
  const dosTime = 0;
  const dosDate = 0x21; // 1980-01-01
  const FLAG_UTF8 = 0x0800;

  entries.forEach((entry) => {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;
    const localHeaderOffset = offset;

    const local: Uint8Array[] = [
      u32(0x04034b50), // local file header signature
      u16(20), // version needed
      u16(FLAG_UTF8),
      u16(0), // method = store
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(size), // compressed size
      u32(size), // uncompressed size
      u16(nameBytes.length),
      u16(0), // extra field length
      nameBytes,
      entry.data,
    ];
    local.forEach((c) => {
      chunks.push(c);
      offset += c.length;
    });

    central.push(
      u32(0x02014b50), // central directory header signature
      u16(20), // version made by
      u16(20), // version needed
      u16(FLAG_UTF8),
      u16(0), // method
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0), // extra
      u16(0), // comment
      u16(0), // disk number start
      u16(0), // internal attrs
      u32(0), // external attrs
      u32(localHeaderOffset),
      nameBytes
    );
  });

  const centralStart = offset;
  let centralSize = 0;
  central.forEach((c) => {
    chunks.push(c);
    centralSize += c.length;
    offset += c.length;
  });

  // End of central directory record
  [
    u32(0x06054b50),
    u16(0), // number of this disk
    u16(0), // disk with central directory
    u16(entries.length),
    u16(entries.length),
    u32(centralSize),
    u32(centralStart),
    u16(0), // comment length
  ].forEach((c) => chunks.push(c));

  return new Blob(chunks as BlobPart[], { type: "application/zip" });
};
