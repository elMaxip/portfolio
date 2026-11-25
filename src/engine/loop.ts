import { createSoft } from "./suave/scenes";
import type { Env, Painter, SceneKey, Style, View } from "./types";

export interface EngineScene extends View {
  painter: Painter;
  fitted: boolean;
  visible: boolean;
  dirty: boolean;
  /** Segundos desde el último cuadro dibujado. */
  acc: number;
}

/** Para medir y probar (ver fps.ts). */
export interface Engine {
  readonly scenes: readonly EngineScene[];
  readonly env: Env;
  wake(): void;
  onPaint?: (key: SceneKey, ms: number) => void;
  onFrame?: () => void;
}

const SMALL = matchMedia("(max-width: 759px)");
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)");
/** Un solo requestAnimationFrame para todas las escenas. Se duerme si no hay nada que dibujar. */
export function startEngine(): Engine {
  const html = document.documentElement;
  const env: Env = {
    reduce: REDUCED.matches,
    paused: html.hasAttribute("data-paused"),
    phone: SMALL.matches,
    mouse: { x: -9999, y: -9999 },
  };

  let style: Style = createSoft(env);
  const scenes: EngineScene[] = [];
  const byCanvas = new Map<Element, EngineScene>();
  for (const el of document.querySelectorAll<HTMLCanvasElement>("canvas[data-escena]")) {
    const ctx = el.getContext("2d");
    if (!ctx) continue;
    const view: View = { key: el.dataset.escena as SceneKey, el, ctx, w: 0, h: 0, t: 0, t0: 0 };
    const scene: EngineScene = Object.assign(view, {
      painter: style.create(view),
      fitted: false,
      visible: false,
      dirty: true,
      acc: 1,
    });
    scenes.push(scene);
    byCanvas.set(el, scene);
  }

  const engine: Engine = { scenes, env, wake };
  const isStill = () => env.paused || env.reduce;

  function fit(sc: EngineScene): void {
    sc.w = sc.el.clientWidth;
    sc.h = sc.el.clientHeight;
    sc.fitted = sc.w > 0 && sc.h > 0;
    if (sc.fitted) sc.painter.fit();
    sc.dirty = true;
  }
  const refit = () => {
    for (const sc of scenes) if (sc.fitted) fit(sc);
    wake();
  };
  const measureText = () => {
    for (const sc of scenes) {
      if (!sc.fitted) continue;
      sc.painter.measureText();
      sc.dirty = true;
    }
    wake();
  };

  let raf = 0;
  let last = 0;
  function wake(): void {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function frame(now: number): void {
    raf = 0;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const still = isStill();
    let more = false;
    for (const sc of scenes) {
      if (!sc.visible) continue;
      if (!sc.fitted) fit(sc);
      if (!sc.fitted) continue;
      if (!still) {
        more = true;
        sc.t += dt;
        sc.acc += dt;
        if (sc.acc < sc.painter.step && !sc.dirty) continue;
        sc.acc = 0;
      } else if (!sc.dirty) {
        continue;
      } else if (sc.key === "hero") {
        sc.t0 = -9;
      }
      sc.dirty = false;
      const start = engine.onPaint ? performance.now() : 0;
      sc.painter.paint();
      engine.onPaint?.(sc.key, performance.now() - start);
    }
    engine.onFrame?.();
    if (more && !raf) raf = requestAnimationFrame(frame);
  }

  // Solo se dibuja lo visible
  const seen = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const sc = byCanvas.get(e.target);
        if (sc) sc.visible = e.isIntersecting;
      }
      wake();
    },
    { rootMargin: "120px" },
  );
  const sized = new ResizeObserver((entries) => {
    for (const e of entries) {
      const sc = byCanvas.get(e.target);
      if (sc?.fitted && (sc.w !== sc.el.clientWidth || sc.h !== sc.el.clientHeight)) fit(sc);
    }
    wake();
  });
  for (const sc of scenes) {
    seen.observe(sc.el);
    sized.observe(sc.el);
  }

  // La interfaz avisa con atributos en <html>
  new MutationObserver((changes) => {
    env.paused = html.hasAttribute("data-paused");
    if (changes.some((c) => c.attributeName === "data-tipo")) measureText();
    wake();
  }).observe(html, { attributes: true, attributeFilter: ["data-paused", "data-tipo"] });

  REDUCED.addEventListener("change", () => {
    env.reduce = REDUCED.matches;
    for (const sc of scenes) sc.dirty = true;
    wake();
  });
  SMALL.addEventListener("change", () => {
    env.phone = SMALL.matches;
    style = createSoft(env);
    for (const sc of scenes) sc.painter = style.create(sc);
    refit();
  });

  // Al cargar una tipografía cambian los caracteres y las zonas de texto
  document.fonts.addEventListener("loadingdone", () => {
    style.forgetGlyphs();
    refit();
  });

  const hero = scenes.find((sc) => sc.key === "hero");
  const stage = hero?.el.parentElement;
  if (hero && stage) {
    // Las letras del nombre entran más delgadas: al terminar, el texto ocupa otro espacio
    stage.addEventListener("animationend", measureText);
    stage.addEventListener("pointermove", (e) => {
      const b = hero.el.getBoundingClientRect();
      const k = b.width ? hero.el.clientWidth / b.width : 1;
      env.mouse.x = (e.clientX - b.left) * k;
      env.mouse.y = (e.clientY - b.top) * k;
    });
    stage.addEventListener("pointerleave", () => {
      env.mouse.x = env.mouse.y = -9999;
    });
  }

  // Adelanta los cálculos de las escenas de más abajo, de a una, cuando el equipo está libre
  const idle = (fn: () => void) =>
    "requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 300);
  const pending = [...scenes];
  const next = () => {
    pending.shift()?.painter.prepare();
    if (pending.length) idle(next);
  };
  idle(next);

  return engine;
}

/** Los planetas se dibujan con IBM Plex Mono: la espera un momento, pero no se bloquea por ella. */
export async function glyphFontReady(): Promise<void> {
  const font = document.fonts.load('500 12px "IBM Plex Mono"').catch(() => {});
  await Promise.race([font, new Promise((ok) => setTimeout(ok, 1500))]);
}
