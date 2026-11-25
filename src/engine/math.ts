import type { Vec3 } from "./types";

/** Azar repetible: la misma semilla da siempre los mismos números. */
export function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function noise(x: number, y: number, z: number): number {
  return (
    (Math.sin(2.1 * x + 1.7 * Math.sin(1.9 * y + 0.4)) +
      Math.sin(2.7 * y + 1.5 * Math.sin(2.3 * z + 1.1)) +
      Math.sin(3.1 * z + 1.3 * Math.sin(2.9 * x + 2.2)) +
      0.5 * Math.sin(7 * x + 5 * z) +
      0.4 * Math.sin(9 * y - 6 * x)) /
    3.9
  );
}

/** Interpola entre colores #rrggbb. Devuelve `n` ternas [r, g, b]. */
export function ramp(stops: readonly string[], n: number): [number, number, number][] {
  const s = stops.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
  const out: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (s.length - 1);
    const a = Math.min(Math.floor(t), s.length - 2);
    const f = t - a;
    const at = (k: number) => Math.round(s[a][k] + (s[a + 1][k] - s[a][k]) * f);
    out.push([at(0), at(1), at(2)]);
  }
  return out;
}

const hashRandom = rng(99);
/** Azar fijo por posición. Se consulta con `hash[i & 4095]`. */
export const hash = Float32Array.from({ length: 4096 }, () => hashRandom());

export function norm(v: Vec3): Vec3 {
  const m = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / m, v[1] / m, v[2] / m];
}

/** Puntos sueltos en un anillo: ángulo, radio, azar. */
export function points(n: number, inner: number, outer: number, seed: number): Float32Array {
  const r = rng(seed);
  const pts = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pts[i * 3] = r() * 6.28318;
    pts[i * 3 + 1] = inner + (outer - inner) * r();
    pts[i * 3 + 2] = r();
  }
  return pts;
}

export type Star = readonly [x: number, y: number, size: number, phase: number];

export function makeStars(): Star[] {
  const r = rng(5);
  return Array.from({ length: 150 }, () => [r(), r(), 0.4 + r() * 1.3, r() * 6.28] as const);
}

/** Calcula una sola vez, cuando se usa por primera vez. */
export function lazy<T>(make: () => T): () => T {
  let value: { v: T } | undefined;
  return () => (value ??= { v: make() }).v;
}
