import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });
mkdirSync(join(root, "src", "app"), { recursive: true });

// ---- Minimal PNG encoder ------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const pixels = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---- Drawing helpers ------------------------------------------------------
function makeCanvas(size) {
  return { size, data: new Uint8ClampedArray(size * size * 4) };
}

function setPx(cv, x, y, [r, g, b, a = 255]) {
  if (x < 0 || y < 0 || x >= cv.size || y >= cv.size) return;
  const i = (y * cv.size + x) * 4;
  cv.data[i] = r;
  cv.data[i + 1] = g;
  cv.data[i + 2] = b;
  cv.data[i + 3] = a;
}

function fillCircle(cv, cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) setPx(cv, x, y, color);
    }
  }
}

function pointInPolygon(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function fillPolygon(cv, pts, color) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.floor(Math.min(...xs));
  const maxX = Math.ceil(Math.max(...xs));
  const minY = Math.floor(Math.min(...ys));
  const maxY = Math.ceil(Math.max(...ys));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (pointInPolygon(x + 0.5, y + 0.5, pts)) setPx(cv, x, y, color);
    }
  }
}

function fillRoundedRect(cv, x0, y0, x1, y1, radius, color) {
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      const nx = Math.max(x0 + radius, Math.min(x, x1 - radius));
      const ny = Math.max(y0 + radius, Math.min(y, y1 - radius));
      if ((x - nx) ** 2 + (y - ny) ** 2 <= radius * radius) setPx(cv, x, y, color);
    }
  }
}

function gradientBg(cv, from, to) {
  for (let y = 0; y < cv.size; y++) {
    for (let x = 0; x < cv.size; x++) {
      const t = (x + y) / (2 * cv.size);
      const i = (y * cv.size + x) * 4;
      cv.data[i] = Math.round(from[0] + (to[0] - from[0]) * t);
      cv.data[i + 1] = Math.round(from[1] + (to[1] - from[1]) * t);
      cv.data[i + 2] = Math.round(from[2] + (to[2] - from[2]) * t);
      cv.data[i + 3] = 255;
    }
  }
}

const INDIGO = [99, 102, 241];
const VIOLET = [168, 85, 247];
const WHITE = [255, 255, 255];

function drawIcon(size, maskable = false) {
  const cv = makeCanvas(size);
  gradientBg(cv, INDIGO, VIOLET);

  const inset = maskable ? 0.66 : 0.88;
  const off = (cv.size * (1 - inset)) / 2;
  const S = (v) => off + v * cv.size * inset;

  // rounded background plate
  const pad = S(0.5) * 0.06;
  fillRoundedRect(cv, off + pad, off + pad, cv.size - off - pad, cv.size - off - pad, cv.size * 0.12, WHITE);

  const bk = INDIGO;
  const scale = (v) => off + v * cv.size * inset;

  // open book - left page
  const left = [
    [scale(0.30), scale(0.42)],
    [scale(0.50), scale(0.52)],
    [scale(0.50), scale(0.78)],
    [scale(0.30), scale(0.68)],
  ];
  // open book - right page
  const right = [
    [scale(0.50), scale(0.52)],
    [scale(0.70), scale(0.42)],
    [scale(0.70), scale(0.68)],
    [scale(0.50), scale(0.78)],
  ];
  fillPolygon(cv, left, bk);
  fillPolygon(cv, right, bk);

  // spine / center gap
  const spineX = scale(0.5);
  const spineW = Math.max(1, cv.size * 0.022);
  for (let y = Math.floor(scale(0.5)); y <= Math.ceil(scale(0.8)); y++) {
    for (let x = Math.floor(spineX - spineW / 2); x <= Math.ceil(spineX + spineW / 2); x++) setPx(cv, x, y, WHITE);
  }

  // top midline (page tops meet)
  for (let x = Math.floor(scale(0.3)); x <= Math.ceil(scale(0.7)); x++) setPx(cv, x, Math.floor(scale(0.46)), bk);

  // sparkles
  fillCircle(cv, scale(0.66), scale(0.30), cv.size * 0.045, bk);
  fillCircle(cv, scale(0.76), scale(0.20), cv.size * 0.028, bk);

  return cv.data;
}

const sizes = [512, 192, 180, 96, 48, 32, 16].map((s) => ({ s, name: `icon-${s}.png` }));
for (const { s, name } of sizes) {
  writeFileSync(join(outDir, name), encodePng(s, drawIcon(s)));
}
writeFileSync(join(outDir, "apple-touch-icon.png"), encodePng(180, drawIcon(180)));
writeFileSync(join(outDir, "icon-maskable-512.png"), encodePng(512, drawIcon(512, true)));
writeFileSync(join(outDir, "icon-maskable-192.png"), encodePng(192, drawIcon(192, true)));
writeFileSync(join(root, "src", "app", "icon.png"), encodePng(512, drawIcon(512)));

console.log("Icons generated at", outDir);