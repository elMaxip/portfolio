import { AIM_X, AIM_Y, CORNERS } from "../orbit";
import { drawColony, prepareColony } from "../colony";
import { lazy, makeStars, noise, norm, points, rng } from "../math";
import { rockPoints } from "../rock";
import { AMBER, BLUE, FAST, GREEN, ICE, MOON, SLOW, type Env, type Painter, type SceneKey, type Style, type View } from "../types";
import { forgetSheets, GLYPHS, level, SoftCanvas } from "./SoftCanvas";
import { globe, hoops } from "./shapes";

interface Scene {
  /** Tamaño del carácter según el ancho. */
  fs: (w: number) => number;
  step: number;
  /** Cálculos que se pueden adelantar. */
  prepare: (() => unknown)[];
  draw: (c: SoftCanvas, view: View) => void;
}

const HERO_LIGHT = norm([0.62, -0.5, 0.6]);
const SIDE_LIGHT = norm([-0.5, -0.5, 0.7]);
const ROCK_LIGHT = norm([0.72, -0.42, 0.42]);
const MOON_LIGHT = norm([0.9, -0.12, 0.28]);
const WORLD_LIGHT = norm([0.86, -0.36, 0.1]);

/** Estilo suave. En celular se usan menos puntos. */
export function createSoft(env: Env): Style {
  const phone = env.phone;
  const stars = lazy(makeStars);

  const heroPts = lazy(() =>
    phone ? globe(7, "craters", 0.032, 0.036) : globe(7, "craters", 0.0142, 0.0158),
  );
  const heroRing = lazy(() =>
    phone ? hoops(1.3, 1.82, 0.03, 0.032, 0.5, 11) : hoops(1.3, 2.1, 0.0175, 0.0165, 0.36, 11),
  );
  const hero: Scene = {
    fs: (w) => (w < 760 ? 5.5 : 6.5),
    step: SLOW,
    prepare: [stars, heroPts, heroRing],
    draw(c, { t, t0 }) {
      const { w, h } = c;
      const small = w < 760;
      const R = small ? w * 0.275 : Math.min(w * 0.215, h * 0.335);
      const cx = small ? w * 0.5 : w * 0.705;
      const cy = small ? h * 0.335 : h * 0.53;
      const form = env.reduce ? 1 : Math.min(1, Math.max(0, t - t0) / (t0 ? 1.4 : 2.8));
      c.stars(stars(), h, 1);
      const ring = {
        pts: heroRing(),
        cx, cy, R,
        rot: t * 0.14,
        squash: 0.25,
        // En celular el anillo va más inclinado y angosto, para que quepa entero
        lean: small ? 0.32 : 0.1,
        pal: ICE,
        form: 1 - Math.pow(1 - form, 3),
      };
      c.ring(ring, false);
      c.ball({
        pts: heroPts(),
        pal: ICE,
        cx, cy, R,
        rot: t * 0.07,
        tilt: -0.3,
        light: HERO_LIGHT,
        form,
        mouse: env.mouse,
      });
      c.ring(ring, true);
    },
  };

  // Proyectos: Lumina es un sol, Huerto Hogar tiene continentes y MiHorario, bandas y anillo
  const pitch = phone ? 0.085 : 0.034;
  const sunPts = lazy(() => globe(3, "sun", pitch, pitch * 1.06));
  const landPts = lazy(() => globe(21, "land", pitch * 0.8, pitch * 0.84));
  const bandPts = lazy(() => globe(9, "bands", pitch * 1.1, pitch * 1.3));
  const bandRing = lazy(() => hoops(1.35, 1.95, phone ? 0.09 : 0.035, phone ? 0.09 : 0.036, 0.6, 17));
  const corona = lazy(() => points(phone ? 500 : 1700, 0, 1, 31));
  const DOT = GLYPHS.indexOf("·");
  const DASH = GLYPHS.indexOf("-");
  const PLUS = GLYPHS.indexOf("+");
  const BAR = GLYPHS.indexOf("|");
  const sistema: Scene = {
    fs: (w) => (w < 700 ? 5 : 6),
    step: FAST,
    prepare: [sunPts, landPts, bandPts, bandRing, corona],
    draw(c, { t }) {
      const { orbit } = env;
      const layout = orbit.layout();
      const { cx, cy, box } = layout;
      const count = c.w < 700 ? 150 : 420;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const q = layout.line(a);
        if (!q) continue;
        const l = 0.14 + 0.24 * q.depth + layout.trail(a, 0.5, 2.4);
        c.put(cx + q.x, cy + q.y, Math.min(0.9, l), ICE, l > 0.4 ? DASH : DOT);
      }
      for (const { k, id, x: qx, y: qy, scale } of layout.bodies) {
        const x = cx + qx;
        const y = cy + qy;
        const B = box * scale;
        const thin = Math.min(1, 0.6 + 0.4 * scale);
        if (k === 0) {
          const R = B * 0.29;
          const co = corona();
          const n = Math.floor((co.length / 3) * thin);
          for (let i = 0; i < n; i++) {
            const a = co[i * 3] + t * 0.1;
            const ray = 0.5 + 0.5 * Math.cos(a * 8 - t * 0.8);
            const u = co[i * 3 + 1] * co[i * 3 + 1];
            const e = 1.03 + 0.46 * u * (0.35 + 0.75 * ray) + 0.015 * Math.sin(t * 1.6 + i);
            const h = co[i * 3 + 2];
            const l = 0.5 * Math.max(0.12, 1 - (e - 1.03) * 2.2) * (0.6 + 0.4 * h);
            c.put(x + Math.cos(a) * e * R, y + Math.sin(a) * e * R, l, BLUE, level(l * 0.8, h));
          }
          c.ball({ pts: sunPts(), pal: BLUE, cx: x, cy: y, R, rot: t * 0.18, tilt: 0.2, light: SIDE_LIGHT, emissive: true, thin });
        } else if (k === 1) {
          c.ball({ pts: landPts(), pal: GREEN, cx: x, cy: y, R: B * 0.36, rot: t * 0.16, tilt: 0.35, light: SIDE_LIGHT, thin });
        } else {
          const R = B * 0.25;
          const ring = { pts: bandRing(), pal: AMBER, cx: x, cy: y, R, rot: t * 0.35, squash: 0.28, lean: 0.36, thin };
          c.ring(ring, false);
          c.ball({ pts: bandPts(), pal: AMBER, cx: x, cy: y, R, rot: t * 0.22, tilt: 0.36, light: SIDE_LIGHT, thin });
          c.ring(ring, true);
        }
        // Mira discreta alrededor del planeta elegido o apuntado
        const mark = orbit.aim(id, 0.85, 0.5);
        if (!mark) continue;
        const hx = B * AIM_X[k];
        const hy = B * AIM_Y[k];
        for (const [sx, sy] of CORNERS) {
          c.put(x + sx * hx, y + sy * hy, mark, ICE, PLUS);
          for (let j = 1; j < 4; j++) {
            c.put(x + sx * (hx - j * 5), y + sy * hy, mark * (1 - j * 0.16), ICE, DASH);
            if (j < 3) c.put(x + sx * hx, y + sy * (hy - j * 6), mark * (1 - j * 0.2), ICE, BAR);
          }
        }
      }
      orbit.place(layout, env.paused || env.reduce);
    },
  };

  // Agujero negro: un anillo de fotones alrededor y el disco que lo cruza
  const disk = lazy(() => points(phone ? 5000 : 9500, 1.12, 2.62, 63));
  const photon = lazy(() => points(phone ? 4000 : 7500, 0, 1, 64));
  const retrato: Scene = {
    fs: (w) => (w < 420 ? 5 : 6),
    step: SLOW,
    prepare: [disk, photon],
    draw(c, { t }) {
      const { w, h } = c;
      const R = Math.min(w, h) * 0.185;
      const cx = w / 2;
      const cy = h / 2;
      const lean = -0.2;
      const cl = Math.cos(lean);
      const sl = Math.sin(lean);
      const ph = photon();
      for (let i = 0; i < ph.length / 3; i++) {
        const a = ph[i * 3] + t * 0.3;
        const u = ph[i * 3 + 1] * ph[i * 3 + 1];
        const k = ph[i * 3 + 2];
        const up = 0.5 - 0.5 * Math.sin(a);
        const q = 1.06 + u * (0.16 + 0.62 * up * up);
        const x = Math.cos(a) * q;
        const y = Math.sin(a) * q;
        const l = (1 - 0.8 * u) * (0.4 + 0.5 * up) * (0.5 + 0.45 * k) * (0.75 - 0.25 * Math.cos(a));
        c.put(cx + (x * cl - y * sl) * R, cy + (x * sl + y * cl) * R, l, ICE, level(l, k));
      }
      const dk = disk();
      for (let i = 0; i < dk.length / 3; i++) {
        const q0 = dk[i * 3 + 1];
        const a = dk[i * 3] + (t * 0.9) / (q0 * Math.sqrt(q0));
        const k = dk[i * 3 + 2];
        const x = Math.cos(a) * q0;
        const z = Math.sin(a) * q0;
        const y = z * 0.085;
        if (z < 0 && Math.abs(x) < 1.02) continue;
        const l = Math.min(1, (1.45 - 0.42 * q0) * (0.4 + 0.5 * k) * (0.78 - 0.32 * Math.cos(a)));
        c.put(cx + (x * cl - y * sl) * R, cy + (x * sl + y * cl) * R, Math.max(0, l), ICE, level(l, k));
      }
    },
  };

  const faseA: Scene = {
    fs: () => 6,
    step: SLOW,
    prepare: [rockPoints],
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

  const moonPts = lazy(() => globe(41, "craters", 0.026, 0.0275));
  const faseB: Scene = {
    fs: () => 6,
    step: SLOW,
    prepare: [moonPts],
    draw(c, { t }) {
      const { w, h } = c;
      c.ball({
        pts: moonPts(),
        pal: MOON,
        cx: w / 2,
        cy: h / 2,
        R: Math.min(w, h) * 0.45,
        rot: t * 0.09,
        tilt: 0.1,
        light: MOON_LIGHT,
        halo: 1.11,
      });
    },
  };

  const worldPts = lazy(() => globe(71, "land", 0.032, 0.034));
  const faseC: Scene = {
    fs: () => 6,
    step: SLOW,
    prepare: [worldPts, prepareColony],
    draw(c, { t }) {
      const { w, h } = c;
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(h * 0.36, w * 0.325);
      const rot = t * 0.1;
      const tilt = -0.3;
      c.ball({ pts: worldPts(), pal: BLUE, cx, cy, R, rot, tilt, light: WORLD_LIGHT, halo: 1.22 });
      drawColony({
        t, rot, tilt,
        roll: -0.16,
        light: WORLD_LIGHT,
        ascii: false,
        plot: (x, y, l, pal, k, mark) =>
          c.put(cx + x * R, cy + y * R, l, pal, mark ? GLYPHS.indexOf(mark) : level(l * 0.72, k), true),
      });
    },
  };

  // Casquete del horizonte: posición, brillo y azar
  const cap = lazy(() => {
    const total = phone ? 30000 : 46000;
    const out = new Float32Array(total * 5);
    const r = rng(77);
    for (let i = 0; i < total; i++) {
      const y = 1 - (phone ? 0.58 : 0.3) * ((i + 0.5) / total);
      const th = i * 2.399963;
      const q = Math.sqrt(1 - y * y);
      const x = Math.cos(th) * q;
      const z = Math.sin(th) * q;
      out.set([x, y, z, 0.66 + 0.36 * noise(x * 5, y * 5, z * 5), r()], i * 5);
    }
    return out;
  });
  const horizonte: Scene = {
    fs: (w) => (w < 760 ? 5.5 : 6.5),
    step: SLOW,
    prepare: [stars, cap],
    draw(c, { t }) {
      const { w, h } = c;
      const pts = cap();
      const total = pts.length / 5;
      const R = Math.max(w * 0.86, 620);
      const cx = w / 2;
      const cy = h - 330 + R;
      const cr = Math.cos(t * 0.03);
      const sr = Math.sin(t * 0.03);
      c.stars(stars(), h - 330, 0.85);
      c.bodies.push({ cx, cy, R, pal: ICE, light: [0, -1, 0.1], k: 0.75, halo: 1.16, spread: 0.36 });
      for (let i = 0; i < total; i++) {
        const o = i * 5;
        const z = pts[o + 2] * cr - pts[o] * sr;
        if (z < 0) continue;
        const px = cx + (pts[o] * cr + pts[o + 2] * sr) * R;
        const py = cy - pts[o + 1] * R;
        if (px < 0 || px > w || py > h) continue;
        const l = Math.max(0, Math.min(1, (1 - z * 1.2) * pts[o + 3]));
        const k = pts[o + 4];
        if (k > 0.14 + l * 1.15) continue;
        c.put(px, py, 0.14 + 0.6 * l, ICE, level(l * 0.8, k));
      }
    },
  };

  const scenes: Record<SceneKey, Scene> = { hero, sistema, retrato, faseA, faseB, faseC, horizonte };

  return {
    forgetGlyphs: forgetSheets,
    create(view): Painter {
      const scene = scenes[view.key];
      const canvas = new SoftCanvas(view);
      return {
        step: scene.step,
        prepare: [...scene.prepare, () => canvas.prepare(scene.fs(view.el.clientWidth))],
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
