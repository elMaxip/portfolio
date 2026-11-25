import { Orbit } from "./orbit";
import { chosenStyle, loadStyle, type CreateStyle } from "./styles";
import type { Env, Painter, SceneKey, Style, StyleName, View } from "./types";

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
  /** Lo que acompaña a una escena: se llama después de dibujarla. */
  readonly after: Map<SceneKey, (view: View) => void>;
  onPaint?: (key: SceneKey, ms: number) => void;
  onFrame?: () => void;
}

const SMALL = matchMedia("(max-width: 759px)");
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)");

/** Un solo requestAnimationFrame para todas las escenas. Se duerme si no hay nada que dibujar. */
export function startEngine(name: StyleName, create: CreateStyle): Engine {
  const html = document.documentElement;
  const env: Env = {
    reduce: REDUCED.matches,
    paused: html.hasAttribute("data-paused"),
    phone: SMALL.matches,
    mouse: { x: -9999, y: -9999 },
    orbit: new Orbit(),
  };

  // Los estilos ya usados se guardan con sus cálculos, para volver a ellos al instante
  const makers = new Map<StyleName, CreateStyle>([[name, create]]);
  const styles = new Map<StyleName, Style>();
  const styleFor = (name: StyleName): Style => {
    const made = styles.get(name) ?? makers.get(name)!(env);
    styles.set(name, made);
    return made;
  };
  let current = name;
  let style = styleFor(name);
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

  const engine: Engine = { scenes, env, wake, after: new Map() };
  const isStill = () => env.paused || env.reduce;

  function fit(sc: EngineScene): void {
    sc.w = sc.el.clientWidth;
    sc.h = sc.el.clientHeight;
    sc.fitted = sc.w > 0 && sc.h > 0;
    if (sc.fitted && sc.key === "sistema") env.orbit.measure(sc.w, sc.h);
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
      if (sc.key === "sistema") {
        // Un planeta elegido viaja al frente aunque la página esté en pausa
        if (still && env.orbit.target !== null) sc.dirty = true;
        env.orbit.move(dt, still);
        more ||= env.orbit.target !== null;
      }
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
      engine.after.get(sc.key)?.(sc);
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
    // Si el navegador descarta el lienzo, vuelve vacío
    sc.el.addEventListener("contextrestored", () => {
      if (sc.fitted) fit(sc);
      wake();
    });
  }

  /** Cambia el dibujo de los planetas sin recargar. El de portada se vuelve a formar. */
  async function restyle(): Promise<void> {
    const want = chosenStyle();
    if (want === current) return;
    if (!makers.has(want)) {
      const create = await loadStyle(want).catch(() => null);
      if (create) makers.set(want, create);
    }
    // Mientras cargaba se pudo elegir otro
    if (chosenStyle() !== want || want === current) return;
    if (!makers.has(want)) {
      // No se pudo descargar: se queda el que había
      html.dataset.planetas = current;
      return;
    }
    current = want;
    repaint();
    const hero = scenes.find((sc) => sc.key === "hero");
    if (hero) hero.t0 = isStill() ? -9 : Math.max(0.001, hero.t);
    prepareAhead(scenes.map((sc) => sc.painter), 1600);
  }
  function repaint(): void {
    style = styleFor(current);
    for (const sc of scenes) {
      sc.painter = style.create(sc);
      // Cada una se ajusta cuando se ve
      sc.fitted = false;
    }
    wake();
  }

  // La interfaz avisa con atributos en <html>
  new MutationObserver((changes) => {
    env.paused = html.hasAttribute("data-paused");
    const changed = (attribute: string) => changes.some((c) => c.attributeName === attribute);
    if (changed("data-tipo")) measureText();
    if (changed("data-planetas")) void restyle();
    wake();
  }).observe(html, { attributeFilter: ["data-paused", "data-tipo", "data-planetas"] });

  // Al abrir el panel Apariencia se adelantan la descarga y los cálculos del otro estilo
  document.addEventListener("apariencia:abierta", async () => {
    const create = await loadStyle("ascii").catch(() => null);
    if (!create) return;
    makers.set("ascii", create);
    if (current !== "ascii") prepareAhead(scenes.map((sc) => styleFor("ascii").create(sc)), 0);
  });

  REDUCED.addEventListener("change", () => {
    env.reduce = REDUCED.matches;
    for (const sc of scenes) sc.dirty = true;
    wake();
  });
  SMALL.addEventListener("change", () => {
    env.phone = SMALL.matches;
    styles.clear();
    repaint();
  });

  // Al cargar una tipografía cambian las zonas de texto y, si es la de los planetas, sus caracteres
  document.fonts.addEventListener("loadingdone", (e) => {
    if (e.fontfaces.some((f) => f.family.includes("IBM Plex Mono") && /^[56]00$/.test(f.weight))) {
      for (const made of styles.values()) made.forgetGlyphs();
      refit();
    } else {
      measureText();
    }
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

  const system = scenes.find((sc) => sc.key === "sistema");
  if (system?.el.parentElement) {
    env.orbit.listen(system.el.parentElement, () => env.reduce);
    env.orbit.onChange = () => {
      system.dirty = true;
      wake();
    };
  }

  // Adelanta los cálculos de las escenas de más abajo, de a una, cuando el equipo está libre
  const idle = (fn: () => void) =>
    "requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 300);
  function prepareAhead(painters: Painter[], wait: number): void {
    const steps = painters.flatMap((p) => p.prepare);
    const next = () => {
      steps.shift()?.();
      if (steps.length) idle(next);
    };
    setTimeout(() => idle(next), wait);
  }
  // Después de que se forma el planeta de portada, que es lo más pesado
  prepareAhead(scenes.map((sc) => sc.painter), 3500);
  // La elección pudo cambiar antes de que el motor empezara a escuchar
  void restyle();

  return engine;
}
