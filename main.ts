// news-image-20261118 — "The World in One Day"
// A procedurally drawn newspaper front page summing up Wednesday 18 November 2026.
// Everything is drawn at runtime by this program: no image assets, no network.
// PNG encoder (node:zlib deflate + hand-rolled CRC32) and a 5x7 bitmap font
// defined in code. Output is deterministic: two runs write byte-identical PNGs.

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

// ---------------------------------------------------------------- CRC32 ----
// Standard CRC-32 (IEEE 802.3) used by PNG chunks.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

// Encode an RGB buffer (width x height x 3) as a PNG (filter 0 on every row).
function encodePng(width, height, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type 2 = RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const stride = width * 3;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: None
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------- bitmap font ----
// 5x7 pixel font, drawn from these rows ("#" = ink). Uppercase only: the whole
// poster is set in capitals, newspaper style.
const FONT = {
  "A": [" ### ", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
  "B": ["#### ", "#   #", "#   #", "#### ", "#   #", "#   #", "#### "],
  "C": [" ####", "#    ", "#    ", "#    ", "#    ", "#    ", " ####"],
  "D": ["#### ", "#   #", "#   #", "#   #", "#   #", "#   #", "#### "],
  "E": ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#####"],
  "F": ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#    "],
  "G": [" ####", "#    ", "#    ", "# ###", "#   #", "#   #", " ### "],
  "H": ["#   #", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
  "I": ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "#####"],
  "J": ["  ###", "   # ", "   # ", "   # ", "   # ", "#  # ", " ##  "],
  "K": ["#   #", "#  # ", "# #  ", "##   ", "# #  ", "#  # ", "#   #"],
  "L": ["#    ", "#    ", "#    ", "#    ", "#    ", "#    ", "#####"],
  "M": ["#   #", "## ##", "# # #", "# # #", "#   #", "#   #", "#   #"],
  "N": ["#   #", "##  #", "##  #", "# # #", "#  ##", "#  ##", "#   #"],
  "O": [" ### ", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
  "P": ["#### ", "#   #", "#   #", "#### ", "#    ", "#    ", "#    "],
  "Q": [" ### ", "#   #", "#   #", "#   #", "# # #", "#  # ", " ## #"],
  "R": ["#### ", "#   #", "#   #", "#### ", "# #  ", "#  # ", "#   #"],
  "S": [" ####", "#    ", "#    ", " ### ", "    #", "    #", "#### "],
  "T": ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  "],
  "U": ["#   #", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
  "V": ["#   #", "#   #", "#   #", "#   #", "#   #", " # # ", "  #  "],
  "W": ["#   #", "#   #", "#   #", "# # #", "# # #", "## ##", "#   #"],
  "X": ["#   #", "#   #", " # # ", "  #  ", " # # ", "#   #", "#   #"],
  "Y": ["#   #", "#   #", " # # ", "  #  ", "  #  ", "  #  ", "  #  "],
  "Z": ["#####", "    #", "   # ", "  #  ", " #   ", "#    ", "#####"],
  "0": [" ### ", "#  ##", "# # #", "##  #", "#   #", "#   #", " ### "],
  "1": ["  #  ", " ##  ", "  #  ", "  #  ", "  #  ", "  #  ", " ### "],
  "2": [" ### ", "#   #", "    #", "   # ", "  #  ", " #   ", "#####"],
  "3": ["#### ", "    #", "    #", " ### ", "    #", "    #", "#### "],
  "4": ["   # ", "  ## ", " # # ", "#  # ", "#####", "   # ", "   # "],
  "5": ["#####", "#    ", "#### ", "    #", "    #", "#   #", " ### "],
  "6": [" ### ", "#    ", "#    ", "#### ", "#   #", "#   #", " ### "],
  "7": ["#####", "    #", "   # ", "  #  ", "  #  ", "  #  ", "  #  "],
  "8": [" ### ", "#   #", "#   #", " ### ", "#   #", "#   #", " ### "],
  "9": [" ### ", "#   #", "#   #", " ####", "    #", "    #", " ### "],
  " ": ["     ", "     ", "     ", "     ", "     ", "     ", "     "],
  ".": ["     ", "     ", "     ", "     ", "     ", " ##  ", " ##  "],
  ",": ["     ", "     ", "     ", "     ", " ##  ", " ##  ", " #   "],
  "'": ["  #  ", "  #  ", " #   ", "     ", "     ", "     ", "     "],
  "-": ["     ", "     ", "     ", "#####", "     ", "     ", "     "],
  ":": ["     ", " ##  ", " ##  ", "     ", " ##  ", " ##  ", "     "],
  ";": ["     ", " ##  ", " ##  ", "     ", " ##  ", " ##  ", " #   "],
  "!": ["  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "     ", "  #  "],
  "?": [" ### ", "#   #", "    #", "   # ", "  #  ", "     ", "  #  "],
  "(": ["   ##", "  #  ", " #   ", " #   ", " #   ", "  #  ", "   ##"],
  ")": ["##   ", "  #  ", "   # ", "   # ", "   # ", "  #  ", "##   "],
  "/": ["    #", "    #", "   # ", "  #  ", " #   ", "#    ", "#    "],
  "$": ["  #  ", " ####", "# #  ", " ### ", "  # #", "#### ", "  #  "],
  "%": ["##  #", "## # ", "   # ", "  #  ", " #   ", "# ## ", "#  ##"],
  "&": [" ##  ", "#  # ", "# #  ", " #   ", "# # #", "#  # ", " ## #"],
  "+": ["     ", "  #  ", "  #  ", "#####", "  #  ", "  #  ", "     "],
  "=": ["     ", "     ", "#####", "     ", "#####", "     ", "     "],
  '"': [" # # ", " # # ", " # # ", "     ", "     ", "     ", "     "],
};
const BLANK_GLYPH = ["     ", "     ", "     ", "     ", "     ", "     ", "     "];

// ------------------------------------------------------------- canvas ----
// A plain RGB canvas: width x height x 3 bytes. All drawing is clipped.
const W = 1024;
const H = 1024;
const canvas = Buffer.alloc(W * H * 3);

function px(x, y) {
  return (y * W + x) * 3;
}

function setPixel(x, y, color) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = px(x, y);
  canvas[i] = color[0];
  canvas[i + 1] = color[1];
  canvas[i + 2] = color[2];
}

function fillRect(x, y, w, h, color) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = px(xx, yy);
      canvas[i] = color[0];
      canvas[i + 1] = color[1];
      canvas[i + 2] = color[2];
    }
  }
}

function frameRect(x, y, w, h, color, t) {
  fillRect(x, y, w, t, color);
  fillRect(x, y + h - t, w, t, color);
  fillRect(x, y, t, h, color);
  fillRect(x + w - t, y, t, h, color);
}

function fillCircle(cx, cy, r, color) {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    fillRect(cx - dx, cy + dy, dx * 2 + 1, 1, color);
  }
}

function fillEllipse(cx, cy, rx, ry, color) {
  for (let dy = -ry; dy <= ry; dy++) {
    const t = 1 - (dy * dy) / (ry * ry);
    const dx = Math.floor(rx * Math.sqrt(Math.max(0, t)));
    fillRect(cx - dx, cy + dy, dx * 2 + 1, 1, color);
  }
}

// Filled polygon from a list of [x, y] points (scanline fill).
function fillPolygon(points, color) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const xs = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        xs.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      fillRect(Math.ceil(xs[k]), y, Math.floor(xs[k + 1]) - Math.ceil(xs[k]) + 1, 1, color);
    }
  }
}

// Bresenham line with a square brush of side t.
function line(x0, y0, x1, y1, color, t) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  const half = Math.floor(t / 2);
  for (;;) {
    fillRect(x - half, y - half, t, t, color);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

// Dashed line: segments of `on` px, gaps of `off` px.
function dashedLine(x0, y0, x1, y1, color, t, on, off) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.round(len));
  let drawn = 0;
  let sx = x0;
  let sy = y0;
  while (drawn < steps) {
    const seg = Math.min(on, steps - drawn);
    const ex = Math.round(x0 + ((drawn + seg) / steps) * (x1 - x0));
    const ey = Math.round(y0 + ((drawn + seg) / steps) * (y1 - y0));
    line(sx, sy, ex, ey, color, t);
    drawn += seg + off;
    sx = Math.round(x0 + (drawn / steps) * (x1 - x0));
    sy = Math.round(y0 + (drawn / steps) * (y1 - y0));
  }
}

// ----------------------------------------------------------------- text ----
// Advance per character is 5*scale + tracking (tracking defaults to scale).
function textWidth(text, scale, tracking) {
  const tr = tracking === undefined ? scale : tracking;
  if (text.length === 0) return 0;
  return text.length * (5 * scale + tr) - tr;
}

function drawText(x, y, text, scale, color, opts) {
  const o = opts || {};
  const tr = o.tracking === undefined ? scale : o.tracking;
  let cx = x;
  if (o.center) cx = Math.round(x - textWidth(text, scale, tr) / 2);
  for (const ch of text) {
    const glyph = FONT[ch] || BLANK_GLYPH;
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === "#") {
          fillRect(cx + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cx += 5 * scale + tr;
  }
}

// Greedy word wrap: returns lines that fit within maxWidth at the given scale.
function wrapText(text, maxWidth, scale) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const word of words) {
    const trial = cur === "" ? word : cur + " " + word;
    if (textWidth(trial, scale) <= maxWidth || cur === "") {
      cur = trial;
    } else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function drawWrapped(x, y, text, scale, maxWidth, color, lineGap) {
  const lines = wrapText(text, maxWidth, scale);
  const gap = lineGap === undefined ? 4 : lineGap;
  lines.forEach((ln, i) => drawText(x, y + i * (7 * scale + gap), ln, scale, color));
  return lines.length;
}

// ---------------------------------------------------------------- colors ----
const PAPER = [247, 242, 231];
const INK = [20, 20, 20];
const RED = [179, 35, 27];
const LIGHT_RED = [255, 122, 107];
const NAVY = [22, 40, 63];
const NAVY_LIGHT = [30, 58, 92];
const PANEL_BG = [255, 253, 246];
const GOLD = [217, 164, 65];
const TEAL = [42, 127, 111];
const DARK_GREEN = [31, 94, 60];
const SKY = [191, 224, 242];
const LIGHT_BLUE = [127, 179, 213];
const BEAM = [74, 127, 181];
const CREAM = [245, 240, 225];
const WHITE = [255, 255, 255];
const SAND = [242, 232, 216];
const SPACE = [11, 15, 26];
const DOME = [200, 214, 229];
const DARK_SKYLINE = [15, 31, 51];

// Small gold story-number badge at the top-right corner of a panel.
function storyNumber(cx, cy, n) {
  fillCircle(cx, cy, 17, GOLD);
  drawText(cx, cy - 10, String(n), 3, NAVY, { center: true });
}

// ------------------------------------------------------- lead illustration ----
// Night over the Gulf: radar dome, sweeping beam, drones, skyline, sea.
function drawGulfArt(x, y, w, h) {
  fillRect(x, y, w, h, NAVY_LIGHT);
  const stars = [
    [24, 16], [84, 12], [164, 26], [264, 12], [324, 36], [54, 56],
    [214, 16], [294, 66], [114, 46], [344, 16], [180, 60], [330, 90],
  ];
  for (const s of stars) fillRect(x + s[0], y + s[1], 3, 3, WHITE);
  // Crescent moon.
  fillCircle(x + 314, y + 48, 26, GOLD);
  fillCircle(x + 324, y + 42, 22, NAVY_LIGHT);
  // Skyline silhouette along the shore.
  const buildings = [
    [24, 212, 34, 32], [74, 196, 28, 48], [118, 218, 40, 26],
    [169, 204, 30, 40], [214, 216, 44, 28], [274, 200, 32, 44],
    [319, 214, 36, 30],
  ];
  for (const b of buildings) fillRect(x + b[0], y + b[1], b[2], b[3], DARK_SKYLINE);
  const windows = [
    [32, 222], [84, 206], [130, 226], [178, 212], [226, 224],
    [284, 210], [330, 222], [92, 226], [250, 232], [150, 230],
  ];
  for (const wn of windows) fillRect(x + wn[0], y + wn[1], 4, 5, GOLD);
  // Radar beam sweeping up-right from the dome.
  fillPolygon(
    [
      [x + 114, y + 118], [x + 244, y + 78], [x + 244, y + 158],
    ],
    BEAM
  );
  // Radar dome (its base sits on the sea line) and mast.
  fillCircle(x + 114, y + 200, 44, DOME);
  line(x + 114, y + 156, x + 114, y + 112, DOME, 5);
  fillPolygon(
    [[x + 102, y + 118], [x + 126, y + 118], [x + 114, y + 100]],
    DOME
  );
  // Three drones with red lights.
  const drones = [
    [219, 66], [269, 101], [179, 116],
  ];
  for (const d of drones) {
    const dx = x + d[0];
    const dy = y + d[1];
    fillRect(dx - 8, dy - 3, 16, 6, INK);
    fillCircle(dx - 10, dy - 6, 3, DOME);
    fillCircle(dx + 10, dy - 6, 3, DOME);
    fillCircle(dx - 10, dy + 6, 3, DOME);
    fillCircle(dx + 10, dy + 6, 3, DOME);
    fillRect(dx - 2, dy - 2, 4, 4, [255, 90, 80]);
  }
  // Sea at the bottom (covers the dome's lower half).
  fillRect(x, y + h - 28, w, 28, TEAL);
  for (let i = 0; i < 6; i++) {
    fillRect(x + 20 + i * 58, y + h - 20, 30, 3, [180, 230, 220]);
    fillRect(x + 40 + i * 58, y + h - 10, 30, 3, [180, 230, 220]);
  }
}

// ------------------------------------------------------- small illustrations ----
function drawAsiaArt(x, y, w, h) {
  fillRect(x, y, w, h, SKY);
  fillCircle(x + w - 26, y + 14, 12, GOLD);
  // Skyline towers.
  const towers = [
    [16, 32, 30, 32], [56, 22, 24, 42], [90, 38, 34, 26],
    [134, 26, 26, 38], [170, 34, 30, 30],
  ];
  for (const t of towers) fillRect(x + t[0], y + t[1], t[2], t[3], [90, 110, 140]);
  fillRect(x + 60, y + 12, 4, 10, [90, 110, 140]);
  for (const wy of [30, 42, 54]) {
    fillRect(x + 24, y + wy, 14, 3, WHITE);
    fillRect(x + 96, y + wy, 20, 3, WHITE);
    fillRect(x + 140, y + wy, 14, 3, WHITE);
  }
  // Three small flags on poles: US stripes, China, Japan.
  const flagX = [214, 264, 314];
  for (let i = 0; i < 3; i++) {
    const fx = x + flagX[i];
    line(fx, y + 8, fx, y + h, INK, 2);
    if (i === 0) {
      fillRect(fx + 2, y + 8, 26, 16, [179, 35, 27]);
      fillRect(fx + 2, y + 12, 26, 3, WHITE);
      fillRect(fx + 2, y + 19, 26, 3, WHITE);
      fillRect(fx + 2, y + 8, 11, 9, [30, 58, 92]);
    } else if (i === 1) {
      fillRect(fx + 2, y + 8, 26, 16, [222, 41, 16]);
      fillRect(fx + 6, y + 11, 5, 5, GOLD);
    } else {
      fillRect(fx + 2, y + 8, 26, 16, WHITE);
      fillCircle(fx + 15, y + 16, 5, [179, 35, 27]);
    }
  }
  // Plane silhouette.
  fillEllipse(x + 370, y + 26, 22, 5, INK);
  fillPolygon(
    [[x + 362, y + 24], [x + 378, y + 24], [x + 370, y + 40]],
    INK
  );
  fillPolygon(
    [[x + 386, y + 24], [x + 394, y + 20], [x + 394, y + 28]],
    INK
  );
}

function drawIpoArt(x, y, w, h) {
  fillRect(x, y, w, h, [238, 247, 238]);
  // Rising bars.
  const bars = [
    [24, 44, 28, 20], [64, 34, 28, 30], [104, 22, 28, 42], [144, 10, 28, 54],
  ];
  for (let i = 0; i < bars.length; i++) {
    fillRect(x + bars[i][0], y + bars[i][1], bars[i][2], bars[i][3], i === 3 ? GOLD : TEAL);
  }
  // Up arrow over the bars.
  line(x + 16, y + 56, x + 182, y + 8, DARK_GREEN, 6);
  fillPolygon(
    [[x + 184, y + 6], [x + 162, y + 4], [x + 172, y + 28]],
    DARK_GREEN
  );
  // Dollar sign and ticker.
  drawText(x + 204, y + 10, "$", 6, DARK_GREEN);
  drawText(x + 254, y + 22, "ANT", 3, INK);
  drawText(x + 254, y + 44, "NASDAQ: ANT", 2, INK);
}

function drawVoyagerArt(x, y, w, h) {
  fillRect(x, y, w, h, SPACE);
  const stars = [
    [20, 10], [90, 20], [180, 8], [260, 26], [330, 12], [410, 30],
    [60, 44], [150, 52], [230, 44], [300, 52], [380, 14], [120, 30],
  ];
  for (const s of stars) fillRect(x + s[0], y + s[1], 2, 2, WHITE);
  // Sun with rays.
  fillCircle(x + 34, y + 32, 10, GOLD);
  line(x + 34, y + 16, x + 34, y + 10, GOLD, 2);
  line(x + 34, y + 48, x + 34, y + 54, GOLD, 2);
  line(x + 18, y + 32, x + 12, y + 32, GOLD, 2);
  line(x + 50, y + 32, x + 56, y + 32, GOLD, 2);
  // Earth.
  fillCircle(x + 104, y + 36, 14, [64, 130, 200]);
  fillCircle(x + 100, y + 32, 4, [80, 180, 90]);
  fillCircle(x + 110, y + 40, 5, [80, 180, 90]);
  // Dashed trajectory to Voyager.
  dashedLine(x + 124, y + 34, x + 364, y + 16, DOME, 2, 8, 6);
  // Voyager probe: gold dish and body.
  fillPolygon(
    [[x + 374, y + 6], [x + 400, y + 6], [x + 387, y + 24]],
    GOLD
  );
  fillRect(x + 380, y + 24, 14, 8, DOME);
  line(x + 387, y + 32, x + 387, y + 44, DOME, 2);
  drawText(x + 214, y + 46, "1 LIGHT-DAY", 2, WHITE);
}

function drawGazaArt(x, y, w, h) {
  fillRect(x, y, w, h, SAND);
  // Broken wall on the left.
  fillRect(x + 30, y + 24, 60, 40, [150, 150, 145]);
  fillRect(x + 100, y + 12, 50, 52, [165, 165, 160]);
  fillRect(x + 160, y + 30, 40, 34, [150, 150, 145]);
  line(x + 60, y + 24, x + 70, y + 39, INK, 2);
  line(x + 70, y + 39, x + 62, y + 54, INK, 2);
  line(x + 62, y + 54, x + 75, y + 64, INK, 2);
  // Dove with olive branch on the right.
  fillEllipse(x + 270, y + 36, 26, 12, WHITE);
  fillCircle(x + 294, y + 24, 8, WHITE);
  fillPolygon(
    [[x + 302, y + 22], [x + 310, y + 26], [x + 302, y + 28]],
    [230, 140, 60]
  );
  fillPolygon(
    [[x + 256, y + 30], [x + 282, y + 16], [x + 290, y + 34]],
    [220, 220, 220]
  );
  line(x + 244, y + 36, x + 226, y + 30, WHITE, 3);
  line(x + 244, y + 40, x + 228, y + 40, WHITE, 3);
  line(x + 320, y + 44, x + 360, y + 24, DARK_GREEN, 3);
  fillEllipse(x + 330, y + 38, 7, 4, DARK_GREEN);
  fillEllipse(x + 344, y + 32, 7, 4, DARK_GREEN);
  fillEllipse(x + 356, y + 26, 7, 4, DARK_GREEN);
}

// ---------------------------------------------------------------- layout ----
function panel(x, y, w, h, bg) {
  fillRect(x, y, w, h, bg);
  frameRect(x, y, w, h, INK, 3);
}

function drawPoster() {
  fillRect(0, 0, W, H, PAPER);

  // Masthead.
  drawText(512, 16, "THE WORLD IN ONE DAY", 4, INK, { center: true });
  drawText(512, 62, "WEDNESDAY 18 NOVEMBER 2026", 6, INK, {
    center: true,
    tracking: 4,
  });
  fillRect(24, 116, 976, 6, INK);
  fillRect(24, 128, 976, 2, INK);
  drawText(512, 140, "FIVE STORIES THAT DEFINED THE DAY", 3, INK, {
    center: true,
  });

  // Lead story: Gulf escalation.
  panel(24, 172, 976, 296, NAVY);
  drawGulfArt(36, 184, 372, 272);
  storyNumber(976, 196, 1);
  drawText(436, 192, "MIDDLE EAST", 2, LIGHT_RED);
  drawText(436, 216, "IRAN DRONES TARGET", 4, CREAM);
  drawText(436, 250, "US RADAR IN BAHRAIN", 4, CREAM);
  fillRect(436, 292, 60, 4, GOLD);
  drawWrapped(
    436,
    308,
    "BAHRAIN AND KUWAIT INTERCEPT THE ATTACKS. THE US HIT A MISSILE SITE ON QESHM ISLAND. NO DAMAGE OR INJURIES REPORTED.",
    2,
    552,
    CREAM,
    4
  );

  // Row 2, left: Trump in Asia.
  panel(24, 480, 482, 232, PANEL_BG);
  drawAsiaArt(36, 492, 458, 64);
  storyNumber(484, 502, 2);
  drawText(36, 564, "DIPLOMACY", 2, RED);
  drawText(36, 584, "TRUMP HEADS TO", 4, INK);
  drawText(36, 616, "SHENZHEN FOR APEC", 4, INK);
  drawWrapped(
    36,
    652,
    "AFTER QUAD TALKS IN MANILA, HE MEETS MARCOS. PUTIN LANDS IN CHINA FOR THURSDAY'S SUMMIT.",
    2,
    458,
    INK,
    4
  );

  // Row 2, right: Anthropic IPO.
  panel(518, 480, 482, 232, PANEL_BG);
  drawIpoArt(530, 492, 458, 64);
  storyNumber(978, 502, 3);
  drawText(530, 564, "BUSINESS", 2, RED);
  drawText(530, 584, "ANTHROPIC PRICES", 4, INK);
  drawText(530, 616, "RECORD $64BN IPO", 4, INK);
  drawWrapped(
    530,
    652,
    "$70-78 A SHARE, UP TO $64BN, THE LARGEST IPO EVER. TRADING STARTS THURSDAY AS ANT.",
    2,
    458,
    INK,
    4
  );

  // Row 3, left: Voyager 1.
  panel(24, 724, 482, 232, PANEL_BG);
  drawVoyagerArt(36, 736, 458, 64);
  storyNumber(484, 746, 4);
  drawText(36, 808, "SPACE", 2, RED);
  drawText(36, 828, "VOYAGER 1, ONE", 4, INK);
  drawText(36, 860, "LIGHT-DAY AWAY", 4, INK);
  drawWrapped(
    36,
    896,
    "AT 5:16 A.M. ET THE PROBE BECOMES THE FIRST HUMAN-MADE OBJECT A FULL DAY'S LIGHT FROM EARTH.",
    2,
    458,
    INK,
    4
  );

  // Row 3, right: Gaza truce warning.
  panel(518, 724, 482, 232, PANEL_BG);
  drawGazaArt(530, 736, 458, 64);
  storyNumber(978, 746, 5);
  drawText(530, 808, "MIDDLE EAST", 2, RED);
  drawText(530, 828, "GAZA TRUCE MAY FAIL", 4, INK);
  drawText(530, 860, "BOARD WARNS UN", 4, INK);
  drawWrapped(
    530,
    896,
    "THE BOARD OF PEACE TELLS THE U.N. THE YEAR-OLD CEASEFIRE COULD FAIL WITHOUT ACTION.",
    2,
    458,
    INK,
    4
  );

  // Footer: sources and the day's claim, so the image stands alone.
  fillRect(24, 966, 976, 2, INK);
  drawText(512, 976, "SOURCES: REUTERS, AP, NASA, BBC", 2, INK, {
    center: true,
  });
  drawText(
    512,
    996,
    "EVERY STORY HAPPENED OR WAS FIRST REPORTED ON 18 NOVEMBER 2026",
    2,
    INK,
    { center: true }
  );
}

// ------------------------------------------------------------------ main ----
function main() {
  drawPoster();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const png = encodePng(W, H, canvas);
  fs.writeFileSync(path.join(outDir, "entry.png"), png);
}

main();
