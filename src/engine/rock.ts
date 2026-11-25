import { lazy, noise, rng } from "./math";

/**
 * Asteroide abollado: radio irregular, golpes y normales calculadas por diferencias.
 * Ocho números por punto: posición, normal, brillo y azar.
 */
export const rockPoints = lazy(() => {
  const r = rng(58);
  const dents: number[][] = [];
  const out: number[] = [];
  for (let i = 0; i < 13; i++) {
    const u = r() * 2 - 1;
    const p = r() * 6.283;
    const q = Math.sqrt(1 - u * u);
    dents.push([q * Math.cos(p), u, q * Math.sin(p), 0.24 + r() * 0.42, 0.06 + r() * 0.13]);
  }
  const at = (x: number, y: number, z: number) => {
    const m = Math.hypot(x, y, z);
    x /= m;
    y /= m;
    z /= m;
    let v =
      0.98 + 0.19 * noise(x * 1.25 + 2, y * 1.25, z * 1.25) + 0.045 * noise(x * 3.3, y * 3.3 + 1, z * 3.3);
    for (const c of dents) {
      const d = Math.acos(Math.max(-1, Math.min(1, x * c[0] + y * c[1] + z * c[2]))) / c[3];
      if (d < 1) v -= c[4] * (1 - d * d) * (1 - d * d);
      else if (d < 1.3) v += c[4] * 0.16 * Math.sin((Math.PI * (d - 1)) / 0.3);
    }
    return [x * v * 1.08, y * v * 0.72, z * v * 0.84];
  };
  const rows = 118;
  for (let j = 0; j < rows; j++) {
    const lat = ((j + 0.5) / rows) * Math.PI;
    const y = -Math.cos(lat);
    const rad = Math.sin(lat);
    const n = Math.max(4, Math.round(246 * rad));
    for (let i = 0; i < n; i++) {
      const th = ((i + (j % 2) * 0.5) / n) * 6.283185;
      const x = Math.cos(th) * rad;
      const z = Math.sin(th) * rad;
      const e = 0.015;
      const tx = -Math.sin(th);
      const tz = Math.cos(th);
      const sx = -y * Math.cos(th);
      const sy = rad;
      const sz = -y * Math.sin(th);
      const P = at(x, y, z);
      const A = at(x + tx * e, y, z + tz * e);
      const B = at(x + sx * e, y + sy * e, z + sz * e);
      const a = [A[0] - P[0], A[1] - P[1], A[2] - P[2]];
      const b = [B[0] - P[0], B[1] - P[1], B[2] - P[2]];
      const N = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      const m = Math.hypot(N[0], N[1], N[2]) || 1;
      const s = N[0] * P[0] + N[1] * P[1] + N[2] * P[2] < 0 ? -1 : 1;
      out.push(
        P[0], P[1], P[2],
        (N[0] * s) / m, (N[1] * s) / m, (N[2] * s) / m,
        0.8 + 0.16 * noise(x * 5, y * 5, z * 5),
        r(),
      );
    }
  }
  return Float32Array.from(out);
});
