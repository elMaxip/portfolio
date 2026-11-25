const MAX = 6;
const TAP_SCALE = 2.5;

interface Callbacks {
  /** Cambió la ampliación (1: la imagen completa). */
  onScale(scale: number): void;
  /** Se deslizó de lado sin ampliar: -1 anterior, 1 siguiente. */
  onSwipe(way: -1 | 1): void;
  /** Se tocó fuera de la imagen. */
  onOutside(): void;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Ampliar y recorrer una imagen con dedos, cursor, rueda o botones.
 * Escribe el `transform` directo en la imagen: React no se entera de cada movimiento.
 */
export class Zoom {
  scale = 1;
  private x = 0;
  private y = 0;
  private readonly pointers = new Map<number, Point>();
  private readonly off = new AbortController();
  private start: Point & { time: number } = { x: 0, y: 0, time: 0 };
  private tap: Point & { time: number } = { x: 0, y: 0, time: -1e9 };
  private moved = false;
  private pinched = false;
  private readonly sized: ResizeObserver;

  constructor(
    private readonly stage: HTMLElement,
    private readonly img: HTMLImageElement,
    private readonly on: Callbacks,
  ) {
    const signal = this.off.signal;
    stage.addEventListener("pointerdown", (e) => this.down(e), { signal });
    stage.addEventListener("pointermove", (e) => this.move(e), { signal });
    stage.addEventListener("pointerup", (e) => this.up(e), { signal });
    stage.addEventListener("pointercancel", (e) => this.pointers.delete(e.pointerId), { signal });
    stage.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.zoomAt(this.scale * Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0016)), this.local(e), false);
      },
      { signal, passive: false },
    );
    stage.addEventListener("dragstart", (e) => e.preventDefault(), { signal });
    this.sized = new ResizeObserver(() => this.apply(false));
    this.sized.observe(stage);
  }

  destroy(): void {
    this.off.abort();
    this.sized.disconnect();
  }

  reset(animate = false): void {
    this.scale = 1;
    this.x = this.y = 0;
    this.apply(animate);
  }

  /** Desde los botones o el teclado: amplía sobre el centro. */
  by(factor: number): void {
    this.zoomAt(this.scale * factor, { x: 0, y: 0 }, true);
  }

  pan(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
    this.apply(true);
  }

  /** Respecto del centro del escenario. */
  private local(e: { clientX: number; clientY: number }): Point {
    const q = this.stage.getBoundingClientRect();
    return { x: e.clientX - q.left - q.width / 2, y: e.clientY - q.top - q.height / 2 };
  }

  private zoomAt(scale: number, p: Point, animate: boolean): void {
    const next = Math.min(MAX, Math.max(1, scale));
    const k = next / this.scale;
    // El punto bajo el dedo o el cursor queda quieto
    this.x = p.x - (p.x - this.x) * k;
    this.y = p.y - (p.y - this.y) * k;
    this.scale = next;
    this.apply(animate);
  }

  private apply(animate: boolean): void {
    const limit = (image: number, stage: number) => Math.max(0, (image * this.scale - stage) / 2);
    const mx = limit(this.img.offsetWidth, this.stage.clientWidth);
    const my = limit(this.img.offsetHeight, this.stage.clientHeight);
    this.x = Math.min(mx, Math.max(-mx, this.x));
    this.y = Math.min(my, Math.max(-my, this.y));
    this.img.style.transition = animate ? "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)" : "none";
    this.img.style.transform = `translate(${this.x.toFixed(1)}px, ${this.y.toFixed(1)}px) scale(${this.scale.toFixed(4)})`;
    this.stage.toggleAttribute("data-ampliada", this.scale > 1.01);
    this.on.onScale(this.scale);
  }

  private down(e: PointerEvent): void {
    if (e.button !== 0) return;
    if (!this.pointers.size) {
      this.start = { ...this.local(e), time: e.timeStamp };
      this.moved = this.pinched = false;
    }
    this.pointers.set(e.pointerId, this.local(e));
    this.stage.setPointerCapture(e.pointerId);
    if (this.pointers.size > 1) this.pinched = true;
  }

  private move(e: PointerEvent): void {
    const before = this.pointers.get(e.pointerId);
    if (!before) return;
    const now = this.local(e);
    if (Math.hypot(now.x - this.start.x, now.y - this.start.y) > 8) this.moved = true;
    if (this.pointers.size === 2) {
      const other = [...this.pointers].find(([id]) => id !== e.pointerId)![1];
      const spread = (p: Point) => Math.hypot(p.x - other.x, p.y - other.y);
      const middle = { x: (now.x + other.x) / 2, y: (now.y + other.y) / 2 };
      this.x += (now.x - before.x) / 2;
      this.y += (now.y - before.y) / 2;
      this.zoomAt((this.scale * spread(now)) / Math.max(1, spread(before)), middle, false);
    } else if (this.pointers.size === 1 && this.scale > 1) {
      this.x += now.x - before.x;
      this.y += now.y - before.y;
      this.apply(false);
    }
    this.pointers.set(e.pointerId, now);
  }

  private up(e: PointerEvent): void {
    if (!this.pointers.delete(e.pointerId) || this.pointers.size || this.pinched) return;
    const p = this.local(e);
    const dx = p.x - this.start.x;
    const dy = p.y - this.start.y;
    if (this.moved) {
      if (this.scale < 1.01 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) this.on.onSwipe(dx < 0 ? 1 : -1);
      return;
    }
    if (e.timeStamp - this.start.time > 500) return;
    if (!this.onImage(p)) {
      this.on.onOutside();
      return;
    }
    const twice = e.timeStamp - this.tap.time < 320 && Math.hypot(p.x - this.tap.x, p.y - this.tap.y) < 32;
    this.tap = twice ? { x: 0, y: 0, time: -1e9 } : { ...p, time: e.timeStamp };
    if (!twice) return;
    if (this.scale > 1.01) this.reset(true);
    else this.zoomAt(TAP_SCALE, p, true);
  }

  private onImage(p: Point): boolean {
    const w = (this.img.offsetWidth * this.scale) / 2;
    const h = (this.img.offsetHeight * this.scale) / 2;
    return Math.abs(p.x - this.x) <= w && Math.abs(p.y - this.y) <= h;
  }
}
