import { noise, rng } from "../math";

export type GlobeKind = "craters" | "land" | "bands" | "sun";

/**
 * Puntos en filas sobre la esfera, con la normal ya inclinada por los cráteres.
 * Ocho números por punto: posición, normal, brillo y azar.
 */
export function globe(seed: number, kind: GlobeKind, ax: number, ay: number): Float32Array {
  const r = rng(seed);
  const craters: number[][] = [];
  const out: number[] = [];
  if (kind === "craters") {
    for (let i = 0; i < 34; i++) {
      const u = r() * 2 - 1;
      const p = r() * 6.283;
      const q = Math.sqrt(1 - u * u);
      craters.push([q * Math.cos(p), u, q * Math.sin(p), 0.05 + r() * r() * 0.25]);
    }
  }
  const rows = Math.max(8, Math.round(Math.PI / ay));
  for (let j = 0; j < rows; j++) {
    const lat = ((j + 0.5) / rows) * Math.PI;
    const y = -Math.cos(lat);
    const rad = Math.sin(lat);
    const n = Math.max(3, Math.round((6.283185 * rad) / ax));
    for (let i = 0; i < n; i++) {
      const th = ((i + (j % 2) * 0.5) / n) * 6.283185;
      const x = Math.cos(th) * rad;
      const z = Math.sin(th) * rad;
      let nx = x;
      let ny = y;
      let nz = z;
      let a = 1;
      if (kind === "craters") {
        const sea = noise(x * 1.5 + 1, y * 1.5, z * 1.5);
        a = 0.78 + 0.2 * Math.max(-1, Math.min(1, sea * 2.2)) + 0.05 * noise(x * 6, y * 6, z * 6);
        for (let k = 0; k < craters.length; k++) {
          const c = craters[k];
          const dot = x * c[0] + y * c[1] + z * c[2];
          if (dot < 0.8) continue;
          const ang = Math.acos(Math.min(1, dot));
          const d = ang / c[3];
          if (d > 1.3 || ang < 1e-4) continue;
          // Pendiente: sube hacia el borde por dentro y cae suave por fuera
          const slope =
            d < 0.94
              ? 0.95 * Math.sin((Math.PI * d) / 0.94) * d
              : -0.5 * Math.sin((Math.PI * (d - 0.94)) / 0.36);
          const s = Math.sin(ang);
          nx -= ((x * dot - c[0]) / s) * slope;
          ny -= ((y * dot - c[1]) / s) * slope;
          nz -= ((z * dot - c[2]) / s) * slope;
          if (d < 0.9) a *= 0.86;
        }
        const m = Math.hypot(nx, ny, nz);
        nx /= m;
        ny /= m;
        nz /= m;
      } else if (kind === "land") {
        const v = noise(x * 1.5 + 3, y * 1.5, z * 1.5);
        const e = Math.max(0, Math.min(1, (v + 0.06) / 0.24));
        a = 0.46 + 0.64 * e * e * (3 - 2 * e);
      } else if (kind === "bands") {
        a = 0.74 + 0.26 * Math.sin(y * 13 + 0.7 * noise(x * 1.4, y * 2, z * 1.4));
      } else {
        a = 0.8 + 0.26 * noise(x * 2.4, y * 2.4, z * 2.4);
      }
      out.push(x, y, z, nx, ny, nz, a, r());
    }
  }
  return Float32Array.from(out);
}

/** Anillo en círculos concéntricos. Cuatro números por punto: ángulo, radio, brillo y azar. */
export function hoops(
  inner: number,
  outer: number,
  dr: number,
  da: number,
  keep: number,
  seed: number,
): Float32Array {
  const r = rng(seed);
  const out: number[] = [];
  for (let q = inner; q < outer; q += dr) {
    const u = (q - inner) / (outer - inner);
    if (u > 0.55 && u < 0.64) continue;
    const edge = Math.min(1, Math.min(u, 1 - u) * 7, Math.abs(u - 0.595) * 14);
    const tone = (0.3 + 0.24 * (0.5 + 0.5 * Math.sin(u * 31)) + 0.12 * r()) * (0.4 + 0.6 * edge);
    const n = Math.round((6.283185 * q) / da);
    for (let i = 0; i < n; i++) {
      if (r() < keep * (0.35 + 0.65 * edge)) out.push(((i + r() * 0.2) / n) * 6.283185, q, tone, r());
    }
  }
  return Float32Array.from(out);
}
