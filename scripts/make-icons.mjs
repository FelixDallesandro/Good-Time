// Dependency-free PNG icon generator: five cell bars and an amber crossbar.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, c]);
};

function png(size, { rounded, canvas = size }) {
  // canvas > size centers the icon on a larger background (the mobile splash screen).
  const s = size / 512, off = (canvas - size) / 2;
  const px = Buffer.alloc(canvas * canvas * 4);
  const rect = (x, y, w, h) => (X, Y) => X >= x * s && X < (x + w) * s && Y >= y * s && Y < (y + h) * s;
  const bars = [96, 164, 232, 300, 368].map((x) => rect(x, 96, 28, 320));
  const bar = rect(72, 236, 368, 40);
  for (let Y = 0; Y < canvas; Y++) {
    for (let X = 0; X < canvas; X++) {
      const x = X - off, y = Y - off;
      let c = [0x14, 0x17, 0x1c, 255];
      if (bars.some((f) => f(x, y))) c = [0x9a, 0xa3, 0xb2, 255];
      if (bar(x, y)) c = [0xe0, 0xa8, 0x4a, 255];
      if (rounded) {
        const r = 96 * s, cx = Math.min(Math.max(x, r), size - r), cy = Math.min(Math.max(y, r), size - r);
        if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) c = [0, 0, 0, 0];
      }
      px.set(c, (Y * canvas + X) * 4);
    }
  }
  const raw = Buffer.alloc((canvas * 4 + 1) * canvas);
  for (let y = 0; y < canvas; y++) {
    raw[y * (canvas * 4 + 1)] = 0;
    px.copy(raw, y * (canvas * 4 + 1) + 1, y * canvas * 4, (y + 1) * canvas * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(canvas, 0);
  ihdr.writeUInt32BE(canvas, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
  ]);
}

writeFileSync('public/icon-192.png', png(192, { rounded: true }));
writeFileSync('public/icon-512.png', png(512, { rounded: false })); // full-bleed so it works as maskable
writeFileSync('public/apple-touch-icon.png', png(180, { rounded: false })); // iOS rounds it itself
// App packages: the Windows build (electron-builder reads build/) and Android/iOS (@capacitor/assets reads assets/).
mkdirSync('build', { recursive: true });
mkdirSync('assets', { recursive: true });
writeFileSync('build/icon.png', png(512, { rounded: true }));
writeFileSync('assets/icon-only.png', png(1024, { rounded: false }));
writeFileSync('assets/splash.png', png(800, { rounded: true, canvas: 2732 }));
writeFileSync('assets/splash-dark.png', png(800, { rounded: true, canvas: 2732 }));
console.log('icons written');
