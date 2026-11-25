import { hash, ramp, type Star } from "../math";
import { rockPoints } from "../rock";
import { textMask, type MaskGrid } from "../textmask";
import type { Vec3, View } from "../types";
import { TEX_H, TEX_W } from "./surface";

/** Del más tenue al más denso: se elige según el brillo. */
const SHADES = ".,:;-=+*oxX#%@";
const GLYPHS = SHADES + "01<>/_$&!?[]|^{}";

/** Diez tonos por paleta. */
const INKS = [
  ["#22303d", "#4a6880", "#8fb0cc", "#d3e6f5", "#ffffff"],
  ["#1d3a54", "#4f86b0", "#a9cfe8", "#f4fbff"],
  ["#24392f", "#567a6a", "#a5c2b1", "#f0f7f1"],
  ["#3a3026", "#7f6b54", "#c9b394", "#f8f1e4"],
  ["#262e36", "#66727f", "#b9c4ce", "#ffffff"],
  ["#6b4a22", "#c08a45", "#ffcf86", "#fff3da"],
].flatMap((stops) => ramp(stops, 10).map(([r, g, b]) => `rgb(${r},${g},${b})`));

const atlases = new Map<string, HTMLCanvasElement>();
export const forgetAtlases = (): void => atlases.clear();

/** Todos los caracteres ya pintados en cada color. */
function atlas(fs: number, d: number, cw: number, ch: number): HTMLCanvasElement {
  const key = fs + "/" + d;
  const known = atlases.get(key);
  if (known) return known;
  const c = document.createElement("canvas");
  c.width = cw * GLYPHS.length;
  c.height = ch * INKS.length;
  const x = c.getContext("2d")!;
  x.font = "600 " + fs * d + 'px "IBM Plex Mono", "Courier New", monospace';
  x.textAlign = "center";
  x.textBaseline = "middle";
  INKS.forEach((ink, j) => {
    x.fillStyle = ink;
    for (let i = 0; i < GLYPHS.length; i++) {
      x.save();
      x.beginPath();
      x.rect(i * cw, j * ch, cw, ch);
      x.clip();
      x.fillText(GLYPHS[i], (i + 0.5) * cw, (j + 0.54) * ch);
      x.restore();
    }
  });
  atlases.set(key, c);
  return c;
}

export interface BallOptions {
  cx: number;
  cy: number;
  R: number;
  rot: number;
  tilt: number;
  tex: Float32Array;
  light: Vec3;
  pal: number;
  emissive?: boolean;
  /** 0: caracteres dispersos · 1: planeta formado */
  form?: number;
  mouse?: { x: number; y: number };
}

export interface RingOptions {
  cx: number;
  cy: number;
  R: number;
  rot: number;
  squash: number;
  lean: number;
  inner: number;
  outer: number;
  pal: number;
  form?: number;
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
const MAX_DENSITY = 2;

/** Una cuadrícula con un carácter por celda. */
export class AsciiCanvas {
  w = 0;
  h = 0;
  t = 0;
  cols = 1;
  rows = 1;
  /** Tamaño de celda en píxeles CSS. */
  kx = 1;
  ky = 1;
  private d = 1;
  private cw = 1;
  private ch = 1;
  private lum = new Float32Array(0);
  private pal = new Uint8Array(0);
  /** Carácter + 1. Cero: según el brillo. */
  private gly = new Uint8Array(0);
  /** Lo que ya está pintado en cada celda: tinta y carácter + 1. Cero: vacía. */
  private drawn = new Uint16Array(0);
  /** Hay que repintar todo el lienzo en vez de solo lo que cambió. */
  private stale = true;
  /** Profundidad por celda, solo para el asteroide. */
  private depth = new Float32Array(0);
  /** Caracteres fuera de la cuadrícula: x, y, brillo, paleta, carácter + 1. */
  private readonly loose: number[] = [];
  private sheet!: HTMLCanvasElement;
  private text: MaskGrid | null = null;
  private readonly el: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(view: View) {
    this.el = view.el;
    this.ctx = view.ctx;
  }

  /** Elige el tamaño de celda y deja listos sus caracteres. */
  prepare(fs: number): void {
    const d = Math.min(MAX_DENSITY, window.devicePixelRatio || 1);
    this.d = d;
    this.cw = Math.max(4, Math.round(fs * 0.6 * d));
    this.ch = Math.max(7, Math.round(fs * 1.12 * d));
    this.sheet = atlas(fs, d, this.cw, this.ch);
  }

  fit(w: number, h: number, fs: number): void {
    this.prepare(fs);
    const d = this.d;
    this.w = w;
    this.h = h;
    this.el.width = Math.max(1, Math.round(w * d));
    this.el.height = Math.max(1, Math.round(h * d));
    this.kx = this.cw / d;
    this.ky = this.ch / d;
    this.cols = Math.max(1, Math.ceil(this.el.width / this.cw));
    this.rows = Math.max(1, Math.ceil(this.el.height / this.ch));
    const n = this.cols * this.rows;
    this.lum = new Float32Array(n);
    this.pal = new Uint8Array(n);
    this.gly = new Uint8Array(n);
    this.drawn = new Uint16Array(n);
    this.stale = true;
    this.loose.length = 0;
    this.measureText();
  }

  measureText(): void {
    const { cols, rows, kx, ky } = this;
    this.text = textMask(this.el, { cols, rows, cw: kx, ch: ky, padX: 12, padY: 4 });
  }

  /** Un carácter. Gana el más brillante de cada celda. `mark` vacío: según el brillo. */
  put(x: number, y: number, l: number, pal: number, mark = ""): void {
    const c = Math.floor((x * this.d) / this.cw);
    const r = Math.floor((y * this.d) / this.ch);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return;
    const i = r * this.cols + c;
    if (l <= this.lum[i]) return;
    this.cell(i, l, pal, mark ? GLYPHS.indexOf(mark) + 1 : 0);
  }

  /** Escribe una celda sin mirar lo que había. */
  cell(i: number, l: number, pal: number, g = 0): void {
    this.lum[i] = l;
    this.pal[i] = pal;
    this.gly[i] = g;
  }

  ball(p: BallOptions): void {
    const { cx, cy, R, rot, tilt, tex, light, pal, emissive = false, form = 1, mouse } = p;
    const { kx, ky, cols, w, h } = this;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const r0 = Math.max(0, Math.floor((cy - R) / ky));
    const r1 = Math.min(this.rows - 1, Math.floor((cy + R) / ky));
    const c0 = Math.max(0, Math.floor((cx - R) / kx));
    const c1 = Math.min(cols - 1, Math.floor((cx + R) / kx));
    const beat = Math.floor(this.t * 14) * 131;
    for (let r = r0; r <= r1; r++) {
      const py = (r + 0.5) * ky;
      const Y = (py - cy) / R;
      for (let c = c0; c <= c1; c++) {
        const px = (c + 0.5) * kx;
        const X = (px - cx) / R;
        const q = X * X + Y * Y;
        if (q > 1) continue;
        const i = r * cols + c;
        const Z = Math.sqrt(1 - q);
        const y0 = Y * ct + Z * st;
        const z1 = Z * ct - Y * st;
        const x0 = X * cr - z1 * sr;
        const z0 = X * sr + z1 * cr;
        let u = Math.atan2(z0, x0) / 6.283185;
        if (u < 0) u += 1;
        const v = Math.acos(Math.max(-1, Math.min(1, -y0))) / Math.PI;
        const texRow = Math.min(TEX_H - 1, Math.floor(v * TEX_H));
        const a = tex[texRow * TEX_W + Math.min(TEX_W - 1, Math.floor(u * TEX_W))];
        let l = emissive
          ? (0.42 + 0.58 * Z) * a
          : Math.max(0.05, X * light[0] + Y * light[1] + Z * light[2]) * a;
        l = Math.max(0.02, Math.min(1, l * (1 + 0.16 * (hash[(i * 17) & 4095] - 0.5))));
        let f = 1;
        if (form < 1) {
          f = Math.max(0, Math.min(1, form * 1.7 - hash[(i * 7 + 3) & 4095] * 0.7));
          f = 1 - Math.pow(1 - f, 4);
        }
        let qx = px;
        let qy = py;
        let g = 0;
        let loose = false;
        if (f < 0.999) {
          const ox = hash[(i * 13 + 5) & 4095] * w;
          const oy = hash[(i * 29 + 11) & 4095] * h;
          qx = ox + (px - ox) * f;
          qy = oy + (py - oy) * f;
          l = Math.max(l, 0.5 * (1 - f));
          loose = true;
          if (f < 0.9) g = 1 + Math.floor(hash[(i + beat) & 4095] * GLYPHS.length);
        }
        if (mouse) {
          const dx = qx - mouse.x;
          const dy = qy - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 19600 && d2 > 1) {
            const d = Math.sqrt(d2);
            const k = 1 - d / 140;
            const push = k * k * 46;
            qx += (dx / d) * push;
            qy += (dy / d) * push;
            l = Math.min(1, l + k * 0.4);
            loose = true;
            if (hash[(i * 3 + beat) & 4095] < k * 1.3) {
              g = 1 + Math.floor(hash[(i + beat) & 4095] * GLYPHS.length);
            }
          }
        }
        if (loose) {
          this.lum[i] = 0;
          this.loose.push(qx, qy, l, pal, g);
        } else {
          this.cell(i, l, pal, g);
        }
      }
    }
  }

  ring(p: RingOptions, front: boolean): void {
    const { cx, cy, R, rot, squash, lean, inner, outer, pal, form = 1 } = p;
    const { kx, ky, cols } = this;
    const cl = Math.cos(lean);
    const sl = Math.sin(lean);
    const grow = 2 - form;
    const bx = outer * grow * R;
    const by = bx * (Math.abs(sl) + squash);
    const r0 = Math.max(0, Math.floor((cy - by) / ky));
    const r1 = Math.min(this.rows - 1, Math.floor((cy + by) / ky));
    const c0 = Math.max(0, Math.floor((cx - bx) / kx));
    const c1 = Math.min(cols - 1, Math.floor((cx + bx) / kx));
    for (let r = r0; r <= r1; r++) {
      const Y = ((r + 0.5) * ky - cy) / R;
      for (let c = c0; c <= c1; c++) {
        const X = ((c + 0.5) * kx - cx) / R;
        const x = (X * cl + Y * sl) / grow;
        const z = (Y * cl - X * sl) / squash / grow;
        if (front && z <= 0) continue;
        const q = Math.sqrt(x * x + z * z);
        if (q < inner || q > outer) continue;
        const u = (q - inner) / (outer - inner);
        // La separación entre los dos anillos
        if (u > 0.53 && u < 0.65) continue;
        const a = Math.atan2(z, x);
        let s = (a - rot / q) / 6.283185;
        s -= Math.floor(s);
        const n = hash[(Math.floor(u * 22) * 211 + Math.floor(s * 150)) & 4095];
        const l = (0.24 + 0.4 * (0.5 + 0.5 * Math.sin(u * 34)) + 0.4 * n) * (0.7 + 0.3 * Math.cos(a + 0.8)) * form;
        if (l < 0.06) continue;
        this.cell(r * cols + c, Math.min(1, l), pal);
      }
    }
  }

  stars(list: readonly Star[], hMax: number, k: number): void {
    for (const s of list) {
      const tw = Math.abs(Math.sin(this.t * 0.7 + s[3]));
      const mark = s[2] > 1.4 ? (tw > 0.6 ? "*" : "+") : s[2] > 1 ? "+" : ".";
      this.put(s[0] * this.w, s[1] * hMax, (0.16 + 0.5 * tw) * k, 0, mark);
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
    if (this.depth.length !== this.lum.length) this.depth = new Float32Array(this.lum.length);
    this.depth.fill(-9);
    for (let i = 0; i < n; i++) {
      const o = i * 8;
      const m1 = pts[o + 5] * cr - pts[o + 3] * sr;
      const nz = m1 * ct + pts[o + 4] * st;
      if (nz < -0.1) continue;
      const z1 = pts[o + 2] * cr - pts[o] * sr;
      const x = pts[o] * cr + pts[o + 2] * sr;
      const y = pts[o + 1] * ct - z1 * st;
      const z = z1 * ct + pts[o + 1] * st;
      const c = Math.floor(((cx + x * R) * this.d) / this.cw);
      const r = Math.floor(((cy + y * R) * this.d) / this.ch);
      if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) continue;
      const k = r * this.cols + c;
      if (z < this.depth[k]) continue;
      this.depth[k] = z;
      const nx = pts[o + 3] * cr + pts[o + 5] * sr;
      const ny = pts[o + 4] * ct - m1 * st;
      const l = Math.min(
        1,
        Math.max(0, (nx * light[0] + ny * light[1] + nz * light[2] + 0.06) / 1.06) * pts[o + 6] * 1.05,
      );
      this.cell(k, Math.max(0.04, l), pal);
    }
  }

  /** Pasa la cuadrícula al lienzo. Entre un cuadro y otro cambian pocas celdas: solo se pintan esas. */
  render(): void {
    const { ctx, cw, ch, cols, lum, pal, gly, drawn, sheet, loose, d } = this;
    const mask = this.text?.cells;
    const n = lum.length;
    const G = SHADES.length;
    const N = GLYPHS.length;
    const shade = (l: number) => Math.min(G - 1, Math.floor(l * G));
    const ink = (p: number, l: number) => p * 10 + Math.min(9, Math.floor(l * 10));
    // Los caracteres sueltos caen entre celdas: se borra todo mientras haya y una vez más al terminar
    const full = this.stale || loose.length > 0;
    this.stale = loose.length > 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (full) {
      ctx.clearRect(0, 0, this.el.width, this.el.height);
      drawn.fill(0);
    }
    for (let i = 0; i < n; i++) {
      let l = lum[i];
      let code = 0;
      if (l > 0) {
        lum[i] = 0;
        const m = mask ? mask[i] : 0;
        if (m === 2) l = Math.min(0.12, l * 0.35);
        if (m !== 1) code = 1 + ink(pal[i], l) * N + (gly[i] ? gly[i] - 1 : shade(l));
      }
      const old = drawn[i];
      if (code === old) continue;
      drawn[i] = code;
      const x = (i % cols) * cw;
      const y = Math.floor(i / cols) * ch;
      if (old) ctx.clearRect(x, y, cw, ch);
      if (code) ctx.drawImage(sheet, ((code - 1) % N) * cw, Math.floor((code - 1) / N) * ch, cw, ch, x, y, cw, ch);
    }
    for (let k = 0; k < loose.length; k += 5) {
      const l = loose[k + 2];
      const x = Math.round(loose[k] * d - cw / 2);
      const y = Math.round(loose[k + 1] * d - ch / 2);
      if (mask) {
        const c = Math.floor(x / cw);
        const r = Math.floor(y / ch);
        if (c >= 0 && r >= 0 && c < cols && r < this.rows && mask[r * cols + c] === 1) continue;
      }
      const g = loose[k + 4] ? loose[k + 4] - 1 : shade(l);
      ctx.drawImage(sheet, g * cw, ink(loose[k + 3], l) * ch, cw, ch, x, y, cw, ch);
    }
    loose.length = 0;
  }
}
