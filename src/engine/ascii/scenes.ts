import { drawColony, prepareColony } from "../colony";
import { hash, lazy, makeStars, noise, norm, points } from "../math";
import { AIM_X, AIM_Y, CORNERS } from "../orbit";
import { rockPoints } from "../rock";
import { AMBER, BLUE, FAST, GREEN, ICE, MOON, SLOW, type Env, type Painter, type SceneKey, type Style, type View } from "../types";
import { AsciiCanvas, forgetAtlases } from "./AsciiCanvas";
import { surface } from "./surface";

interface Scene {
  /** Tamaño del carácter según el ancho. */
  fs: (w: number) => number;
  step: number;
  prepare: () => void;
  draw: (c: AsciiCanvas, view: View) => void;
}

const HERO_LIGHT = norm([0.62, -0.5, 0.6]);
const SIDE_LIGHT = norm([-0.5, -0.5, 0.7]);
const ROCK_LIGHT = norm([0.72, -0.42, 0.42]);
const MOON_LIGHT = norm([0.9, -0.12, 0.28]);
const WORLD_LIGHT = norm([0.78, -0.42, 0.46]);

/** Estilo ASCII. En celular la cuadrícula ya tiene menos celdas. */
export function createAscii(env: Env): Style {
  const stars = lazy(makeStars);

  const heroTex = lazy(() => surface(7, "craters"));
  const hero: Scene = {
    fs: (w) => (w < 760 ? 8 : 11),
    step: SLOW,
    prepare: () => void [stars(), heroTex()],
    draw(c, { t, t0 }) {
      const { w, h } = c;
      const small = w < 760;
      const R = small ? w * 0.31 : Math.min(w * 0.215, h * 0.335);
      const cx = small ? w * 0.55 : w * 0.705;
      const cy = small ? h * 0.335 : h * 0.53;
      const form = env.reduce ? 1 : Math.min(1, Math.max(0, t - t0) / (t0 ? 1.4 : 2.6));
      c.stars(stars(), h, 1);
      const ring = {
        cx, cy, R,
        rot: t * 0.9,
        squash: 0.25,
        lean: 0.1,
        inner: 1.3,
        outer: 2.1,
        pal: ICE,
        form: 1 - Math.pow(1 - form, 3),
      };
      c.ring(ring, false);
      c.ball({
        tex: heroTex(),
        pal: ICE,
        cx, cy, R,
        rot: t * 0.1,
        tilt: -0.3,
        light: HERO_LIGHT,
        form,
        mouse: env.mouse,
      });
      c.ring(ring, true);
    },
  };

  // Proyectos: Lumina es un sol, Huerto Hogar tiene continentes y MiHorario, bandas y anillo
  const CORONA = 900;
  const sunTex = lazy(() => surface(3, "sun"));
  const landTex = lazy(() => surface(21, "land"));
  const bandTex = lazy(() => surface(9, "bands"));
  const corona = lazy(() => points(CORONA, 0, 1, 31));
  const sistema: Scene = {
    fs: (w) => (w < 700 ? 7 : 10),
    step: FAST,
    prepare: () => void [sunTex(), landTex(), bandTex(), corona()],
    draw(c, { t }) {
      const { orbit } = env;
      const layout = orbit.layout();
      const { cx, cy, box } = layout;
      const { kx, ky } = c;
      const count = c.w < 700 ? 400 : 1000;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const q = layout.line(a);
        if (!q) continue;
        const l = 0.16 + 0.26 * q.depth + layout.trail(a, 0.55, 2.6);
        c.put(cx + q.x, cy + q.y, Math.min(1, l), ICE, l > 0.62 ? "=" : l > 0.4 ? "-" : ".");
      }
      for (const { k, id, x: qx, y: qy, scale } of layout.bodies) {
        const x = cx + qx;
        const y = cy + qy;
        const B = box * scale;
        if (k === 0) {
          const R = B * 0.29;
          const co = corona();
          for (let i = 0; i < CORONA; i++) {
            const a = co[i * 3] + t * 0.12;
            const ray = 0.5 + 0.5 * Math.cos(a * 8 - t * 0.96);
            const e = 1.06 + 0.42 * co[i * 3 + 1] * (0.35 + 0.75 * ray) + 0.03 * Math.sin(t * 2 + i);
            c.put(x + Math.cos(a) * e * R, y + Math.sin(a) * e * R, 0.62 * Math.max(0.1, 1 - (e - 1.06) * 2.1), BLUE);
          }
          c.ball({ tex: sunTex(), pal: BLUE, cx: x, cy: y, R, rot: t * 0.25, tilt: 0.2, light: SIDE_LIGHT, emissive: true });
        } else if (k === 1) {
          c.ball({ tex: landTex(), pal: GREEN, cx: x, cy: y, R: B * 0.36, rot: t * 0.22, tilt: 0.35, light: SIDE_LIGHT });
        } else {
          const R = B * 0.25;
          const ring = { pal: AMBER, cx: x, cy: y, R, rot: t * 1.2, squash: 0.28, lean: 0.36, inner: 1.35, outer: 1.95 };
          c.ring(ring, false);
          c.ball({ tex: bandTex(), pal: AMBER, cx: x, cy: y, R, rot: t * 0.3, tilt: 0.36, light: SIDE_LIGHT });
          c.ring(ring, true);
        }
        // Mira: esquinas alrededor del planeta elegido o apuntado
        const mark = orbit.aim(id, 1, 0.62);
        if (!mark) continue;
        for (const [sx, sy] of CORNERS) {
          const X = x + sx * B * AIM_X[k];
          const Y = y + sy * B * AIM_Y[k];
          c.put(X, Y, mark, ICE, "+");
          c.put(X - sx * kx, Y, mark - 0.01, ICE, "-");
          c.put(X - sx * 2 * kx, Y, mark - 0.01, ICE, "-");
          c.put(X, Y - sy * ky, mark - 0.01, ICE, "|");
        }
      }
      orbit.place(layout, env.paused || env.reduce);
    },
  };

  // Agujero negro: un anillo de fotones alrededor y el disco que lo cruza
  const DISK = 5600;
  const PHOTON = 4200;
  const disk = lazy(() => points(DISK, 1.12, 2.62, 63));
  const photon = lazy(() => points(PHOTON, 0, 1, 64));
  const retrato: Scene = {
    fs: (w) => (w < 420 ? 7 : 9),
    step: SLOW,
    prepare: () => void [disk(), photon()],
    draw(c, { t }) {
      const { w, h } = c;
      const R = Math.min(w, h) * 0.185;
      const cx = w / 2;
      const cy = h / 2;
      const lean = -0.2;
      const cl = Math.cos(lean);
      const sl = Math.sin(lean);
      const ph = photon();
      for (let i = 0; i < PHOTON; i++) {
        const a = ph[i * 3] + t * 0.35;
        const u = ph[i * 3 + 1] * ph[i * 3 + 1];
        const up = 0.5 - 0.5 * Math.sin(a);
        const q = 1.06 + u * (0.16 + 0.62 * up * up);
        const x = Math.cos(a) * q;
        const y = Math.sin(a) * q;
        const l = (1 - 0.8 * u) * (0.45 + 0.55 * up) * (0.5 + 0.5 * ph[i * 3 + 2]) * (0.75 - 0.25 * Math.cos(a));
        c.put(cx + (x * cl - y * sl) * R, cy + (x * sl + y * cl) * R, Math.max(0.02, l), ICE);
      }
      const dk = disk();
      for (let i = 0; i < DISK; i++) {
        const q0 = dk[i * 3 + 1];
        const a = dk[i * 3] + (t * 1.1) / (q0 * Math.sqrt(q0));
        const x = Math.cos(a) * q0;
        const z = Math.sin(a) * q0;
        const y = z * 0.085;
        if (z < 0 && Math.abs(x) < 1.02) continue;
        const l = Math.min(1, (1.5 - 0.4 * q0) * (0.45 + 0.55 * dk[i * 3 + 2]) * (0.78 - 0.32 * Math.cos(a)));
        c.put(cx + (x * cl - y * sl) * R, cy + (x * sl + y * cl) * R, Math.max(0.02, l), ICE);
      }
    },
  };

  const faseA: Scene = {
    fs: () => 10,
    step: SLOW,
    prepare: () => void rockPoints(),
    draw(c, { t }) {
      const { w, h } = c;
      c.rock({
        pal: MOON,
        cx: w / 2,
        cy: h / 2,
        R: Math.min(w, h) * 0.46,
        rot: t * 0.22,
        tilt: 0.3 + 0.25 * Math.sin(t * 0.17),
        light: ROCK_LIGHT,
      });
    },
  };

  const moonTex = lazy(() => surface(41, "craters"));
  const faseB: Scene = {
    fs: () => 10,
    step: SLOW,
    prepare: () => void moonTex(),
    draw(c, { t }) {
      const { w, h } = c;
      c.ball({
        tex: moonTex(),
        pal: MOON,
        cx: w / 2,
        cy: h / 2,
        R: Math.min(w, h) * 0.46,
        rot: t * 0.12,
        tilt: 0.1,
        light: MOON_LIGHT,
      });
    },
  };

  const worldTex = lazy(() => surface(71, "land"));
  const faseC: Scene = {
    fs: () => 8,
    step: SLOW,
    prepare: () => {
      worldTex();
      prepareColony();
    },
    draw(c, { t }) {
      const { w, h } = c;
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(h * 0.36, w * 0.325);
      const rot = t * 0.1;
      const tilt = -0.3;
      c.ball({ tex: worldTex(), pal: BLUE, cx, cy, R, rot, tilt, light: WORLD_LIGHT });
      drawColony({
        t, rot, tilt,
        roll: -0.16,
        light: WORLD_LIGHT,
        ascii: true,
        plot: (x, y, l, pal, _h, mark) => c.put(cx + x * R, cy + y * R, Math.min(1, l), pal, mark),
      });
    },
  };

  const horizonte: Scene = {
    fs: (w) => (w < 760 ? 8 : 11),
    step: SLOW,
    prepare: () => void stars(),
    draw(c, { t }) {
      const { w, h, kx, ky, cols, rows } = c;
      const R = Math.max(w * 0.86, 620);
      const cx = w / 2;
      const cy = h - 330 + R;
      const cr = Math.cos(t * 0.04);
      const sr = Math.sin(t * 0.04);
      c.stars(stars(), h - 330, 0.85);
      for (let j = Math.max(0, Math.floor((cy - R) / ky)); j < rows; j++) {
        const Y = (cy - (j + 0.5) * ky) / R;
        for (let i = 0; i < cols; i++) {
          const X = ((i + 0.5) * kx - cx) / R;
          const q = X * X + Y * Y;
          if (q > 1) continue;
          const Z = Math.sqrt(1 - q);
          const x0 = X * cr - Z * sr;
          const z0 = X * sr + Z * cr;
          const l = (1 - Z * 1.25) * (0.66 + 0.42 * noise(x0 * 5, Y * 5, z0 * 5)) * 1.1;
          const at = j * cols + i;
          c.cell(at, Math.max(0.03, Math.min(1, l * (1 + 0.18 * (hash[(at * 17) & 4095] - 0.5)))), ICE);
        }
      }
    },
  };

  const scenes: Record<SceneKey, Scene> = { hero, sistema, retrato, faseA, faseB, faseC, horizonte };

  return {
    forgetGlyphs: forgetAtlases,
    create(view): Painter {
      const scene = scenes[view.key];
      const canvas = new AsciiCanvas(view);
      return {
        step: scene.step,
        prepare() {
          scene.prepare();
          if (!canvas.w && view.w) canvas.prepare(scene.fs(view.w));
        },
        fit: () => canvas.fit(view.w, view.h, scene.fs(view.w)),
        measureText: () => canvas.measureText(),
        paint() {
          canvas.t = view.t;
          scene.draw(canvas, view);
          canvas.render();
        },
      };
    },
  };
}
