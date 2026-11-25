import { hash, lazy, rng } from "./math";
import { BLUE, LIGHT, type Vec3 } from "./types";

type V = [number, number, number];

const CITY = 0;
const TOWER = 1;
const ROUTE = 2;
const RING = 3;
// Lo demás son ascensores
const LIFT = 4;

const unit = (v: V): V => {
  const m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m];
};
const cross = (a: V, b: V): V => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/**
 * Civilización: ciudades, rutas con pulsos, torres, anillo orbital y ascensores.
 * Ocho números por punto: posición, radio, brillo, tipo, fase y azar.
 */
const colonyPoints = lazy(() => {
  const r = rng(123);
  const nodes: { v: V; size: number }[] = [];
  const out: number[] = [];
  const add = (v: V, rad: number, l: number, kind: number, ph: number) =>
    out.push(v[0] * rad, v[1] * rad, v[2] * rad, rad, l, kind, ph, r());

  for (let tries = 0; nodes.length < 34 && tries < 900; tries++) {
    const u = (r() * 2 - 1) * 0.9;
    const p = r() * 6.283;
    const q = Math.sqrt(1 - u * u);
    const v: V = [q * Math.cos(p), u, q * Math.sin(p)];
    if (nodes.some((m) => m.v[0] * v[0] + m.v[1] * v[1] + m.v[2] * v[2] > 0.9)) continue;
    nodes.push({ v, size: 0.05 + r() * r() * 0.12 });
  }

  for (const m of nodes) {
    const a = unit(cross(m.v, [0.13, 1, 0.27]));
    const b = cross(m.v, a);
    const step = 0.019;
    const k = Math.ceil(m.size / step);
    // El orden en que se piden los números al azar es parte del diseño: no reordenar
    const near = (p: number, q: number): V =>
      unit([m.v[0] + a[0] * p + b[0] * q, m.v[1] + a[1] * p + b[1] * q, m.v[2] + a[2] * p + b[2] * q]);
    for (let i = -k; i <= k; i++) {
      for (let j = -k; j <= k; j++) {
        const d = (Math.hypot(i, j) * step) / m.size;
        if (d > 1 || r() < 0.2 + d * 0.5 || (i % 3 && j % 3 && r() < 0.5)) continue;
        add(near(i * step, j * step), 1.002, 0.62 + 0.38 * (1 - d), CITY, r() * 6.28);
      }
    }
    const towers = 2 + Math.floor(m.size * 40);
    for (let t = 0; t < towers; t++) {
      const g = m.size * 0.5;
      // Un número al azar por cada eje, igual que en el diseño
      const at = (c: 0 | 1 | 2) =>
        m.v[c] + a[c] * (r() - 0.5) * g * 1.6 + b[c] * (r() - 0.5) * g * 1.6;
      const v = unit([at(0), at(1), at(2)]);
      const top = 1.03 + r() * r() * 0.11;
      for (let q = 1.01; q < top; q += 0.016) add(v, q, 0.62 + (q + 0.016 >= top ? 0.38 : 0), TOWER, t);
    }
  }

  nodes.forEach((m, i) => {
    nodes
      .map((o, j): [number, number] => [m.v[0] * o.v[0] + m.v[1] * o.v[1] + m.v[2] * o.v[2], j])
      .filter((q) => q[1] > i)
      .sort((x, y) => y[0] - x[0])
      .slice(0, 2)
      .forEach(([dot, j]) => {
        const ang = Math.acos(Math.min(1, dot));
        const n = Math.round(ang / 0.026);
        if (ang > 0.95) return;
        const o = nodes[j].v;
        for (let k = 1; k < n; k++) {
          const f = k / n;
          const s = Math.sin(ang);
          const A = Math.sin((1 - f) * ang) / s;
          const B = Math.sin(f * ang) / s;
          add(
            [m.v[0] * A + o[0] * B, m.v[1] * A + o[1] * B, m.v[2] * A + o[2] * B],
            1.004, 0.4, ROUTE, f * 6.283 + i,
          );
        }
      });
  });

  for (let k = 0; k < 3; k++) {
    const n = 300 + k * 8;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * 6.283185;
      const port = i % 50 < 4;
      if (k === 1 && !port && i % 4 === 3) continue;
      if (k !== 1 && !port && i % 3) continue;
      add([Math.cos(t), 0, Math.sin(t)], 1.255 + k * 0.018, port ? 1 : k === 1 ? 0.5 : 0.36, RING, t * 3);
    }
  }
  for (let e = 0; e < 6; e++) {
    const t = (e / 6) * 6.283185 + 0.04;
    for (let q = 1.02; q < 1.25; q += 0.02) add([Math.cos(t), 0, Math.sin(t)], q, 0.42, LIFT, q * 26 + e);
  }
  return Float32Array.from(out);
});

export const prepareColony = (): void => void colonyPoints();

export interface ColonyOptions {
  t: number;
  rot: number;
  tilt: number;
  roll: number;
  light: Vec3;
  /** Qué caracteres usa: los marcados de ASCII o los finos. */
  ascii: boolean;
  /** Recibe la posición en radios del planeta. `mark` vacío: carácter según el brillo. */
  plot: (x: number, y: number, l: number, pal: number, h: number, mark: string) => void;
}

export function drawColony({ t, rot, tilt, roll, light, ascii, plot: put }: ColonyOptions): void {
  const pts = colonyPoints();
  const n = pts.length / 8;
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const cl = Math.cos(roll);
  const sl = Math.sin(roll);
  const plot = (x: number, y: number, l: number, pal: number, h: number, mark: string) =>
    put(x * cl - y * sl, x * sl + y * cl, l, pal, h, mark);

  for (let i = 0; i < n; i++) {
    const o = i * 8;
    const z1 = pts[o + 2] * cr - pts[o] * sr;
    const x = pts[o] * cr + pts[o + 2] * sr;
    const y = pts[o + 1] * ct - z1 * st;
    const z = z1 * ct + pts[o + 1] * st;
    if (z < 0.03 && x * x + y * y < 1.012) continue;
    const kind = pts[o + 5];
    const ph = pts[o + 6];
    const h = pts[o + 7];
    const day = Math.max(0, (x * light[0] + y * light[1] + z * light[2]) / pts[o + 3]);
    const night = Math.max(0, 1 - day * 2.6);
    const l = pts[o + 4];
    if (kind === CITY) {
      const mark = ascii ? (l > 0.85 ? "#" : h > 0.5 ? "+" : ":") : "";
      plot(x, y, l * (0.28 + 0.72 * night) * (0.9 + 0.1 * Math.sin(t * 2 + ph)), LIGHT, h, mark);
    } else if (kind === TOWER) {
      plot(x, y, l * (0.5 + 0.4 * night), l > 0.9 ? LIGHT : BLUE, h, l > 0.9 ? "+" : "|");
    } else if (kind === ROUTE) {
      const w = Math.max(0, Math.cos(ph * 2 - t * 2.2));
      plot(x, y, l * (0.35 + 0.65 * night) + 0.6 * Math.pow(w, 14), BLUE, h, ascii ? "." : "·");
    } else if (kind === RING) {
      const pulse = 0.4 * Math.pow(Math.max(0, Math.cos(ph - t * 1.6)), 20);
      const mark = l > 0.9 ? (ascii ? "#" : "+") : "-";
      plot(x, y, (l + pulse) * (z < 0 ? 0.55 : 1), l > 0.9 ? LIGHT : BLUE, h, mark);
    } else {
      const pulse = 0.6 * Math.pow(Math.max(0, Math.cos(ph - t * 4)), 8);
      plot(x, y, (0.3 + pulse) * (z < 0 ? 0.5 : 1), BLUE, h, ascii ? ":" : "·");
    }
  }

  // Naves con estela, cada una en su órbita
  for (let k = 0; k < 9; k++) {
    const q = 1.36 + 0.1 * hash[k * 5];
    const inc = (hash[k * 7 + 1] - 0.5) * 2.2;
    const node = hash[k * 11 + 2] * 6.283;
    const sp = (0.22 + 0.2 * hash[k + 40]) * (k % 2 ? 1 : -1);
    for (let j = 0; j < 9; j++) {
      const a = t * sp + k * 1.7 - j * 0.026 * Math.sign(sp);
      const u = Math.cos(a) * q;
      const v = Math.sin(a) * q;
      const yy = v * Math.sin(inc);
      const w = v * Math.cos(inc);
      const x = u * Math.cos(node) + w * Math.sin(node);
      const z = w * Math.cos(node) - u * Math.sin(node);
      if (z < 0 && x * x + yy * yy < 1.01) continue;
      const mark = j ? (ascii ? "." : "·") : ascii ? "*" : "+";
      plot(x, yy, (j ? 0.5 * (1 - j / 9) : 1) * (z < 0 ? 0.6 : 1), j ? BLUE : LIGHT, 0.5, mark);
    }
  }
}
