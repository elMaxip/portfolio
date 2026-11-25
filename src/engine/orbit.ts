/** Planetas en orden de giro. Son los id de los proyectos en src/content/projects. */
export const PLANETS = ["lumina", "huerto", "horario"] as const;
export type PlanetId = (typeof PLANETS)[number];

const TURN = Math.PI * 2;
const THIRD = TURN / 3;
const LEAN = -0.05;
const CL = Math.cos(LEAN);
const SL = Math.sin(LEAN);
/** Distancia del centro del planeta a su nombre, en tamaños de botón. */
const LABEL = [0.41, 0.39, 0.34];
/** Segundos que descansa la órbita después de que un planeta llega al frente. */
const REST = 5;

const isPlanet = (id: string | undefined): id is PlanetId => PLANETS.some((p) => p === id);

export interface OrbitBody {
  k: number;
  id: PlanetId;
  /** Posición respecto del centro de la órbita. */
  x: number;
  y: number;
  /** 0: al fondo · 1: al frente */
  depth: number;
  scale: number;
}

export interface OrbitLayout {
  cx: number;
  cy: number;
  /** Tamaño del botón de un planeta al frente. */
  box: number;
  /** Del fondo al frente. */
  bodies: OrbitBody[];
  /** Punto de la órbita en el ángulo `t`, o null si lo tapa un nombre. */
  line(t: number): { x: number; y: number; depth: number } | null;
  /** Cuánto brilla la línea por la estela de los planetas. */
  trail(t: number, gain: number, decay: number): number;
}

interface PlanetButton {
  el: HTMLElement;
  label: HTMLElement | null;
  summary: HTMLElement | null;
}

/**
 * La órbita de proyectos. La línea dibujada, los planetas y los botones
 * salen todos de `layout()`, el mismo cálculo.
 */
export class Orbit {
  a = Math.PI / 2;
  v = 0;
  target: number | null = null;
  hold = 2.5;
  hover = false;
  /** Planeta bajo el cursor o con foco. */
  hot: PlanetId | null = null;
  selected: PlanetId = "lumina";
  /** Avisa que hay que volver a dibujar aunque la página esté en pausa. */
  onChange: () => void = () => {};

  private stage: HTMLElement | null = null;
  private buttons = new Map<PlanetId, PlanetButton>();
  private stageWidth = 0;
  private box = 400;
  private narrow = false;
  private w = 0;
  private h = 0;

  /** Escucha el escenario: los botones los maneja Projects.tsx. */
  listen(stage: HTMLElement, instant: () => boolean): void {
    this.stage = stage;
    const canHover = matchMedia("(hover: hover)");
    const planetOf = (e: Event) => {
      const id = (e.target as Element).closest<HTMLElement>("[data-planeta]")?.dataset.planeta;
      return isPlanet(id) ? id : null;
    };
    const settle = () => {
      // En pantallas táctiles :hover queda pegado después de tocar
      this.hover = (canHover.matches && stage.matches(":hover")) || !!stage.querySelector(":focus-visible");
    };
    stage.addEventListener("pointerenter", () => (this.hover = true));
    for (const n of ["focusin", "pointerleave", "focusout", "pointerup", "pointercancel"]) {
      // focusout ocurre antes de que el foco llegue a su nuevo lugar
      stage.addEventListener(n, () => queueMicrotask(settle));
    }
    stage.addEventListener("pointerover", (e) => this.setHot(planetOf(e)));
    // Al tocar con el dedo también llega el foco, pero solo el de teclado detiene y apunta
    stage.addEventListener("focusin", (e) => {
      if ((e.target as Element).matches(":focus-visible")) this.setHot(planetOf(e));
    });
    for (const n of ["pointerleave", "focusout"]) stage.addEventListener(n, () => this.setHot(null));

    stage.addEventListener("click", (e) => {
      const id = planetOf(e);
      if (id) this.to(id, instant());
    });
    const read = () => {
      const id = stage.dataset.elegido;
      if (isPlanet(id)) this.selected = id;
      this.onChange();
    };
    new MutationObserver(read).observe(stage, { attributeFilter: ["data-elegido"] });
    read();
  }

  private setHot(id: PlanetId | null): void {
    if (this.hot === id) return;
    this.hot = id;
    this.onChange();
  }

  /** Lleva un planeta al frente por el camino más corto. */
  to(id: PlanetId, instant: boolean): void {
    const want = Math.PI / 2 - PLANETS.indexOf(id) * THIRD;
    let diff = (want - this.a) % TURN;
    if (diff > Math.PI) diff -= TURN;
    if (diff < -Math.PI) diff += TURN;
    this.target = this.a + diff;
    if (instant) this.a = this.target;
    this.onChange();
  }

  move(dt: number, still: boolean): void {
    if (this.target !== null) {
      this.a += (this.target - this.a) * (1 - Math.exp(-dt * 3));
      if (Math.abs(this.target - this.a) < 0.004) {
        this.a = this.target;
        this.target = null;
        this.hold = REST;
      }
      this.v = 0;
      return;
    }
    if (still) return;
    if (this.hover) this.hold = Math.max(this.hold, 0.8);
    else if (this.hold > 0) this.hold -= dt;
    const goal = this.hover || this.hold > 0 ? 0 : 0.2;
    this.v += (goal - this.v) * (1 - Math.exp(-dt * 3));
    this.a += this.v * dt;
  }

  /** Mide el escenario. Se llama al cambiar el tamaño, no en cada cuadro. */
  measure(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.narrow = w < 700;
    this.stageWidth = this.stage?.clientWidth ?? w;
    this.buttons.clear();
    for (const id of PLANETS) {
      const el = this.stage?.querySelector<HTMLElement>(`[data-planeta="${id}"]`);
      if (!el) continue;
      this.buttons.set(id, {
        el,
        label: el.querySelector<HTMLElement>("[data-rotulo]"),
        summary: el.querySelector<HTMLElement>("[data-resumen]"),
      });
    }
    this.box = this.buttons.get("lumina")?.el.offsetWidth ?? 400;
  }

  private get nameHeight(): number {
    return this.narrow ? 24 : 42;
  }

  layout(): OrbitLayout {
    const { a, box, narrow, nameHeight: nameH } = this;
    const rx = this.stageWidth * (narrow ? 0.36 : 0.41);
    const ry = this.h * 0.2;
    const at = (t: number): [number, number] => {
      const x = Math.cos(t) * rx;
      const y = Math.sin(t) * ry;
      return [x * CL - y * SL, x * SL + y * CL];
    };
    const bodies: OrbitBody[] = [];
    const tags: [x: number, y: number, halfWidth: number, height: number][] = [];
    for (let k = 0; k < 3; k++) {
      const t = a + k * THIRD;
      const [x, y] = at(t);
      const depth = (Math.sin(t) + 1) / 2;
      const scale = 0.48 + 0.52 * depth;
      bodies.push({ k, id: PLANETS[k], x, y, depth, scale });
      const gap = LABEL[k] * box * scale;
      tags.push([
        x,
        depth < 0.5 ? y - gap - nameH - 6 : y + gap,
        narrow ? 62 : 150,
        nameH + (narrow || depth < 0.55 ? 0 : 34),
      ]);
    }
    bodies.sort((p, q) => p.depth - q.depth);
    return {
      cx: this.w / 2,
      cy: this.h * 0.41,
      box,
      bodies,
      line(t) {
        const [x, y] = at(t);
        for (const g of tags) {
          if (Math.abs(x - g[0]) < g[2] && y > g[1] - 8 && y < g[1] + g[3]) return null;
        }
        return { x, y, depth: (Math.sin(t) + 1) / 2 };
      },
      trail(t, gain, decay) {
        let l = 0;
        for (let k = 0; k < 3; k++) {
          const behind = (((a + k * THIRD - t) % TURN) + TURN) % TURN;
          l += gain * Math.exp(-behind * decay);
        }
        return l;
      },
    };
  }

  /** Mueve los botones y sus nombres adonde quedó dibujado cada planeta. */
  place(layout: OrbitLayout, still: boolean): void {
    const nameH = this.nameHeight;
    const speed = this.target !== null ? 1 : still ? 0 : Math.min(1, this.v / 0.12);
    for (const { k, id, x, y, depth: d, scale } of layout.bodies) {
      const button = this.buttons.get(id);
      if (!button) continue;
      const { el, label, summary } = button;
      el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${scale.toFixed(4)})`;
      el.style.zIndex = String(1 + Math.round(d * 100));
      if (label) {
        // Al fondo el nombre va encima; al frente, debajo
        const up = -2 * LABEL[k] * layout.box - (nameH + 6) / scale;
        label.style.transform = `${d < 0.5 ? `translateY(${up.toFixed(1)}px) ` : ""}scale(${(1 / scale).toFixed(4)})`;
        const swap = 1 - speed * (1 - Math.min(1, Math.abs(d - 0.5) * 14));
        label.style.opacity = (swap * (0.72 + 0.28 * d)).toFixed(3);
      }
      if (summary) summary.style.opacity = Math.max(0, Math.min(1, (d - 0.55) / 0.35)).toFixed(3);
    }
  }

  /** Brillo de la mira alrededor de un planeta. 0: no lleva. */
  aim(id: PlanetId, hot: number, selected: number): number {
    return this.hot === id ? hot : this.selected === id ? selected : 0;
  }
}

/** Medio ancho y medio alto de la mira de cada planeta, en tamaños de botón. */
export const AIM_X = [0.43, 0.41, 0.46];
export const AIM_Y = [0.4, 0.39, 0.33];
export const CORNERS = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] as const;
