import { noise, rng } from "../math";

export type SurfaceKind = "craters" | "land" | "bands" | "sun";

export const TEX_W = 360;
export const TEX_H = 180;

/** Brillo de la superficie de un planeta, precalculado por longitud y latitud. */
export function surface(seed: number, kind: SurfaceKind): Float32Array {
  const r = rng(seed);
  const tex = new Float32Array(TEX_W * TEX_H);
  const craters: number[][] = [];
  if (kind === "craters") {
    for (let i = 0; i < 44; i++) {
      const u = r() * 2 - 1;
      const p = r() * 6.283;
      const q = Math.sqrt(1 - u * u);
      const size = 0.06 + r() * r() * 0.24;
      // El último es hasta dónde llega, como coseno: más lejos no hace falta calcular el ángulo
      craters.push([q * Math.cos(p), u, q * Math.sin(p), size, Math.cos(1.1 * size) - 1e-6]);
    }
  }
  for (let j = 0; j < TEX_H; j++) {
    const y = -Math.cos(((j + 0.5) / TEX_H) * Math.PI);
    const rad = Math.sqrt(1 - y * y);
    for (let i = 0; i < TEX_W; i++) {
      const th = ((i + 0.5) / TEX_W) * 6.283185;
      const x = Math.cos(th) * rad;
      const z = Math.sin(th) * rad;
      let a: number;
      if (kind === "craters") {
        a = 0.7 + 0.24 * noise(x * 1.6, y * 1.6, z * 1.6) + 0.1 * noise(x * 6, y * 6, z * 6);
        for (const c of craters) {
          const dot = x * c[0] + y * c[1] + z * c[2];
          if (dot < c[4]) continue;
          const d = Math.acos(Math.max(-1, Math.min(1, dot))) / c[3];
          if (d < 0.8) a *= 0.36 + 0.3 * d;
          else if (d < 1.1) a *= 1.5;
        }
      } else if (kind === "land") {
        a = noise(x * 1.5 + 3, y * 1.5, z * 1.5) > 0.06 ? 1.25 : 0.42;
      } else if (kind === "bands") {
        a = 0.62 + 0.38 * Math.sign(Math.sin(y * 13 + 0.5 * noise(x, y, z)));
      } else {
        a = 0.76 + 0.42 * noise(x * 2.4, y * 2.4, z * 2.4);
      }
      tex[j * TEX_W + i] = a;
    }
  }
  return tex;
}
