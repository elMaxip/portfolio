import { hash, ramp, type Star } from "../math";
import { rockPoints } from "../rock";
import { textMask, type MaskGrid } from "../textmask";
import type { Mouse, Vec3, View } from "../types";

export const GLYPHS = "·:+x*oae08-|<>/=";

const STOPS = [
  ["#1f2c39", "#3f5c76", "#7399bd", "#a9cbe8", "#e4f1fb"],
  ["#1b344b", "#3f7099", "#82b4d8", "#b9dcf2", "#eaf6fd"],
  ["#20332a", "#466656", "#7fa391", "#b2cdbd", "#e6f1ea"],
  ["#332b22", "#665642", "#a38f72", "#cfbc9f", "#f3eadb"],
  ["#22292f", "#56616c", "#929da8", "#c2cad1", "#f0f3f5"],
  ["#3a2a16", "#8a6230", "#d9a15a", "#ffd08a", "#fff0d0"],
];
const TINT = ["132,176,214", "120,180,222", "120,160,140", "176,152,118", "150,162,174", "230,180,110"];
/** Colores por paleta y brillo, ya en el orden de bytes de ImageData. */
const LUT = STOPS.map((s) => Uint32Array.from(ramp(s, 64), ([r, g, b]) => (b << 16) | (g << 8) | r));
const TONES = ["·", "·:", ":+", "+x", "x*o", "oae", "a08"].map((t) => [...t].map((c) => GLYPHS.indexOf(c)));

/** Carácter según el brillo, con un poco de azar. */
export function level(l: number, h: number): number {
  const set = TONES[Math.max(0, Math.min(TONES.length - 1, Math.floor(l * TONES.length + h - 0.5)))];
  return set[Math.floor(h * 997) % set.length];
}

/** Caracteres ya dibujados. De cada uno se guardan solo los píxeles que pintan. */
interface Sheet {
  bw: number;
  bh: number;
  /** Dónde empieza cada sello en `at` y `alpha`. El sello es carácter * 16 + posición. */
  start: Uint32Array;
  /** Píxel dentro de la caja: fila * bw + columna. */
  at: Uint16Array;
  alpha: Uint8Array;
}
const sheets = new Map<string, Sheet>();
export const forgetSheets = (): void => sheets.clear();

/** Cada carácter en 16 posiciones intermedias, para que se deslice sin saltos. */
function stamps(fs: number, d: number): Sheet {
  const key = fs + "/" + d;
  const known = sheets.get(key);
  if (known) return known;
  const bw = Math.ceil(fs * 0.62 * d) + 2;
  const bh = Math.ceil(fs * 0.95 * d) + 2;
  const n = GLYPHS.length;
  const c = document.createElement("canvas");
  c.width = bw * 16;
  c.height = bh * n;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.font = "500 " + fs * d + 'px "IBM Plex Mono", "Courier New", monospace';
  x.textAlign = "center";
  x.textBaseline = "alphabetic";
  x.fillStyle = "#fff";
  for (let g = 0; g < n; g++) {
    for (let p = 0; p < 16; p++) {
      x.save();
      x.beginPath();
      x.rect(p * bw, g * bh, bw, bh);
      x.clip();
      x.fillText(
        GLYPHS[g],
        p * bw + bw / 2 + (p % 4) / 4,
        g * bh + bh / 2 + fs * d * 0.27 + Math.floor(p / 4) / 4,
      );
      x.restore();
    }
  }
  const img = x.getImageData(0, 0, c.width, c.height).data;
  const start = new Uint32Array(n * 16 + 1);
  const at: number[] = [];
  const alphas: number[] = [];
  for (let g = 0; g < n; g++) {
    for (let p = 0; p < 16; p++) {
      for (let b = 0; b < bh; b++) {
        for (let a = 0; a < bw; a++) {
          const alpha = Math.floor(Math.min(255, img[((g * bh + b) * c.width + p * bw + a) * 4 + 3] * 1.2));
          if (!alpha) continue;
          at.push(b * bw + a);
          alphas.push(alpha);
        }
      }
      start[g * 16 + p + 1] = at.length;
    }
  }
  const sheet = { bw, bh, start, at: Uint16Array.from(at), alpha: Uint8Array.from(alphas) };
  sheets.set(key, sheet);
  return sheet;
}

/** Cuerpo que se pinta por debajo de los caracteres. */
export interface Body {
  cx: number;
  cy: number;
  R: number;
  pal: number;
  light: Vec3;
  k: number;
  halo: number;
  spread: number;
  path?: [number, number][];
}

export interface BallOptions {
  cx: number;
  cy: number;
  R: number;
  rot: number;
  tilt: number;
  pts: Float32Array;
  light: Vec3;
  pal: number;
  emissive?: boolean;
  /** 0: caracteres dispersos · 1: planeta formado */
  form?: number;
  /** Proporción de puntos que se dibujan. */
  thin?: number;
  halo?: number;
  mouse?: Mouse;
}

export interface RingOptions {
  cx: number;
  cy: number;
  R: number;
  rot: number;
  squash: number;
  lean: number;
  pts: Float32Array;
  pal: number;
  form?: number;
  thin?: number;
}

export interface RockOptions {
  cx: number;
  cy: number;
  R: number;
  rot: number;
  tilt: number;
  light: Vec3;
  pal: number;
}

/** Densidad máxima de píxeles en este estilo. */
const MAX_DENSITY = 1.5;
const density = () => Math.min(MAX_DENSITY, Math.max(1, window.devicePixelRatio || 1));
const CELL = 8;

export class SoftCanvas {
  w = 0;
  h = 0;
  t = 0;
  readonly bodies: Body[] = [];
  private d = 1;
  private W = 1;
  private H = 1;
  private img!: ImageData;
  private buf!: Uint32Array;
  private sheet!: Sheet;
  /** Los píxeles de `sheet.at`, ya convertidos al ancho de este lienzo. */
  private offsets!: Int32Array;
  private text: MaskGrid | null = null;
  private readonly small = document.createElement("canvas");
  private readonly smallCtx = this.small.getContext("2d")!;
  private readonly el: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(view: View) {
    this.el = view.el;
    this.ctx = view.ctx;
  }

  /** Deja listos los caracteres. */
  prepare(fs: number): void {
    stamps(fs, density());
  }

  fit(w: number, h: number, fs: number): void {
    const d = density();
    this.w = w;
    this.h = h;
    this.d = d;
    this.W = this.el.width = Math.max(1, Math.round(w * d));
    this.H = this.el.height = Math.max(1, Math.round(h * d));
    this.small.width = Math.max(1, Math.round(this.W / 7));
    this.small.height = Math.max(1, Math.round(this.H / 7));
    this.img = this.ctx.createImageData(this.W, this.H);
    this.buf = new Uint32Array(this.img.data.buffer);
    const sheet = (this.sheet = stamps(fs, d));
    this.offsets = Int32Array.from(sheet.at, (q) => Math.floor(q / sheet.bw) * this.W + (q % sheet.bw));
    this.bodies.length = 0;
    this.measureText();
  }

  measureText(): void {
    this.text = textMask(this.el, {
      cols: Math.ceil(this.w / CELL),
      rows: Math.ceil(this.h / CELL),
      cw: CELL,
      ch: CELL,
      padX: 10,
      padY: 4,
    });
  }

  /** Un carácter. `over`: se dibuja entero aunque la zona pida atenuarlo. */
  put(x: number, y: number, l: number, pal: number, g: number, over = false): void {
    const text = this.text;
    if (text) {
      const c = x >> 3;
      const r = y >> 3;
      if (c >= 0 && r >= 0 && c < text.cols && r < text.rows) {
        const m = text.cells[r * text.cols + c];
        if (m === 1) return;
        if (m === 2 && !over) l = Math.min(0.2, l * 0.4);
      }
    }
    const { bw, bh, start, alpha } = this.sheet;
    const W = this.W;
    const X = x * this.d - bw / 2;
    const Y = y * this.d - bh / 2;
    const ix = Math.floor(X);
    const iy = Math.floor(Y);
    if (ix < 0 || iy < 0 || ix + bw > W || iy + bh > this.H) return;
    const stamp = g * 16 + Math.floor((Y - iy) * 4) * 4 + Math.floor((X - ix) * 4);
    const rgb = LUT[pal][l >= 1 ? 63 : l <= 0 ? 0 : Math.floor(l * 64)];
    const buf = this.buf;
    const offsets = this.offsets;
    const base = iy * W + ix;
    for (let k = start[stamp], end = start[stamp + 1]; k < end; k++) {
      const o = base + offsets[k];
      const v = alpha[k];
      if (v > buf[o] >>> 24) buf[o] = (v << 24) | rgb;
    }
  }

  private erase(cx: number, cy: number, R: number): void {
    const X = cx * this.d;
    const Y = cy * this.d;
    const Q = R * this.d;
    const y1 = Math.min(this.H - 1, Math.floor(Y + Q));
    for (let y = Math.max(0, Math.ceil(Y - Q)); y <= y1; y++) {
      const s = Math.sqrt(Math.max(0, Q * Q - (y - Y) * (y - Y)));
      const a = Math.max(0, Math.ceil(X - s));
      const b = Math.min(this.W, Math.floor(X + s));
      if (b > a) this.buf.fill(0, y * this.W + a, y * this.W + b);
    }
  }

  ball(p: BallOptions): void {
    const { cx, cy, R, rot, tilt, pts, light, pal, emissive = false, form = 1, thin = 1, mouse } = p;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const n = pts.length / 8;
    const beat = Math.floor(this.t * 12) * 131;
    if (form >= 0.6) this.erase(cx, cy, R);
    this.bodies.push({
      cx, cy, R, pal,
      light: emissive ? [0, 0, 1] : light,
      k: (emissive ? 1.25 : 1) * form,
      halo: p.halo ?? 1.28,
      spread: 1.45,
    });
    for (let i = 0; i < n; i++) {
      const o = i * 8;
      const h = pts[o + 7];
      const z1 = pts[o + 2] * cr - pts[o] * sr;
      const z = z1 * ct + pts[o + 1] * st;
      if (z < 0.02) continue;
      if (thin < 1 && hash[(i * 31) & 4095] > thin) continue;
      const x = pts[o] * cr + pts[o + 2] * sr;
      const y = pts[o + 1] * ct - z1 * st;
      let l: number;
      if (emissive) {
        l = (0.34 + 0.6 * z) * pts[o + 6];
      } else {
        const m1 = pts[o + 5] * cr - pts[o + 3] * sr;
        const nx = pts[o + 3] * cr + pts[o + 5] * sr;
        const ny = pts[o + 4] * ct - m1 * st;
        const nz = m1 * ct + pts[o + 4] * st;
        l = Math.max(0, (nx * light[0] + ny * light[1] + nz * light[2] + 0.1) / 1.1) * pts[o + 6];
      }
      if (l > 1) l = 1;
      let f = 1;
      if (form < 1) {
        f = Math.max(0, Math.min(1, form * 1.7 - hash[(i * 7 + 3) & 4095] * 0.7));
        f = 1 - Math.pow(1 - f, 4);
      }
      // En la sombra quedan pocos caracteres; en la luz se juntan
      if (h > 0.1 + l * 1.7 + (1 - f) * 0.2) continue;
      let px = cx + x * R;
      let py = cy + y * R;
      let g = level(l * 0.92, h);
      let c = 0.2 + 0.62 * l;
      if (f < 0.999) {
        // Parten cerca del planeta: así no cruzan el texto que va al lado
        const oa = hash[(i * 13 + 5) & 4095] * Math.PI * 2;
        const or = Math.sqrt(hash[(i * 29 + 11) & 4095]) * R * 1.7;
        const ox = cx + Math.cos(oa) * or;
        const oy = cy + Math.sin(oa) * or;
        px = ox + (px - ox) * f;
        py = oy + (py - oy) * f;
        c = Math.max(c, 0.45 * (1 - f));
      }
      if (mouse) {
        const dx = px - mouse.x;
        const dy = py - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 19600 && d2 > 1) {
          const d = Math.sqrt(d2);
          const k = (1 - d / 140) * mouse.force;
          const push = k * k * 22;
          px += (dx / d) * push;
          py += (dy / d) * push;
          c = Math.min(1, c + k * 0.14);
          if (hash[(i * 3 + beat) & 4095] < k) g = Math.floor(hash[(i + beat) & 4095] * GLYPHS.length);
        }
      }
      this.put(px, py, c, pal, g, true);
    }
  }

  ring(p: RingOptions, front: boolean): void {
    const { cx, cy, R, rot, squash, lean, pts, pal, form = 1, thin = 1 } = p;
    const cl = Math.cos(lean);
    const sl = Math.sin(lean);
    const n = pts.length / 4;
    const grow = 2 - form;
    for (let i = 0; i < n; i++) {
      if (thin < 1 && hash[(i * 31) & 4095] > thin) continue;
      const o = i * 4;
      const q = pts[o + 1] * grow;
      const a = pts[o] + rot / (pts[o + 1] * Math.sqrt(pts[o + 1]));
      const z = Math.sin(a) * q;
      if (z > 0 !== front) continue;
      const x = Math.cos(a) * q;
      const y = z * squash;
      const px = x * cl - y * sl;
      const py = x * sl + y * cl;
      if (!front && px * px + py * py < 0.98) continue;
      const l = pts[o + 2] * (0.78 + 0.44 * pts[o + 3]) * (0.78 + 0.3 * Math.cos(a + 0.8)) * form;
      this.put(cx + px * R, cy + py * R, l, pal, level(l, pts[o + 3]));
    }
  }

  stars(list: readonly Star[], hMax: number, k: number): void {
    for (const s of list) {
      const tw = Math.abs(Math.sin(this.t * 0.7 + s[3]));
      const g = GLYPHS.indexOf(s[2] > 1.45 ? "+" : s[2] > 1.1 ? "*" : "·");
      this.put(s[0] * this.w, s[1] * hMax, (0.2 + 0.55 * tw) * k, 0, g);
    }
  }

  rock(p: RockOptions): void {
    const { cx, cy, R, rot, tilt, light, pal } = p;
    const pts = rockPoints();
    const n = pts.length / 8;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    // Contorno: el punto más lejano en cada dirección
    const edge = new Float32Array(72);
    for (let i = 0; i < n; i++) {
      const o = i * 8;
      const m1 = pts[o + 5] * cr - pts[o + 3] * sr;
      const nz = m1 * ct + pts[o + 4] * st;
      if (nz < -0.1) continue;
      const z1 = pts[o + 2] * cr - pts[o] * sr;
      const x = pts[o] * cr + pts[o + 2] * sr;
      const y = pts[o + 1] * ct - z1 * st;
      const nx = pts[o + 3] * cr + pts[o + 5] * sr;
      const ny = pts[o + 4] * ct - m1 * st;
      const h = pts[o + 7];
      const l = Math.min(
        1,
        Math.max(0, (nx * light[0] + ny * light[1] + nz * light[2] + 0.06) / 1.06) * pts[o + 6] * 1.05,
      );
      const a = Math.floor(((Math.atan2(y, x) + Math.PI) / 6.283186) * 72);
      const w = x * x + y * y;
      if (w > edge[a]) edge[a] = w;
      if (nz < 0.03 || h > 0.12 + l * 1.7) continue;
      this.put(cx + x * R, cy + y * R, 0.2 + 0.66 * l, pal, level(l * 0.92, h), true);
    }
    const path = Array.from(edge, (w, i): [number, number] => {
      const t = ((i + 0.5) / 72) * 6.283185 - Math.PI;
      const q = Math.sqrt(w) * R;
      return [cx + Math.cos(t) * q, cy + Math.sin(t) * q];
    });
    this.bodies.push({ cx, cy, R, pal, light, k: 0.9, halo: 1, spread: 1.4, path });
  }

  /** Pasa los caracteres al lienzo y agrega resplandor, cuerpos y halos. */
  render(): void {
    const { ctx, W, H, small, smallCtx: sx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.putImageData(this.img, 0, 0);
    this.buf.fill(0);
    // Resplandor suave: la misma imagen, reducida y difuminada
    sx.imageSmoothingQuality = "high";
    sx.globalCompositeOperation = "copy";
    sx.drawImage(this.el, 0, 0, small.width, small.height);
    ctx.imageSmoothingQuality = "high";
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.3;
    ctx.drawImage(small, 0, 0, W, H);
    ctx.globalAlpha = 1;
    // Cuerpo de cada planeta, por debajo de los caracteres
    ctx.globalCompositeOperation = "destination-over";
    ctx.setTransform(this.d, 0, 0, this.d, 0, 0);
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const b = this.bodies[i];
      const t = TINT[b.pal];
      const lean = 0.55 + 0.5 * (1 - Math.max(0, b.light[2]));
      const gx = b.cx + b.light[0] * b.R * lean;
      const gy = b.cy + b.light[1] * b.R * lean;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, b.R * b.spread);
      g.addColorStop(0, "rgba(" + t + "," + 0.27 * b.k + ")");
      g.addColorStop(0.55, "rgba(" + t + "," + 0.1 * b.k + ")");
      g.addColorStop(1, "rgba(" + t + ",0.015)");
      ctx.fillStyle = g;
      ctx.beginPath();
      if (b.path) {
        for (const q of b.path) ctx.lineTo(q[0], q[1]);
        ctx.closePath();
      } else {
        ctx.arc(b.cx, b.cy, b.R, 0, 6.2832);
      }
      ctx.fill();
      ctx.strokeStyle = "rgba(" + t + "," + 0.2 * b.k + ")";
      ctx.lineWidth = 1;
      ctx.stroke();
      if (b.path) continue;
      const q = ctx.createRadialGradient(b.cx, b.cy, b.R, b.cx, b.cy, b.R * b.halo);
      q.addColorStop(0, "rgba(" + t + "," + 0.085 * b.k + ")");
      q.addColorStop(1, "rgba(" + t + ",0)");
      ctx.fillStyle = q;
      ctx.beginPath();
      ctx.arc(b.cx, b.cy, b.R * b.halo, 0, 6.2832);
      ctx.fill();
    }
    this.bodies.length = 0;
  }
}
