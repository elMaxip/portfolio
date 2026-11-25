import { follow } from "./pointer";

/** Cuánto queda marcado lo que se tocó con el dedo. */
const LINGER_MS = 1200;

/**
 * Láminas: dibujos geométricos que responden al cursor o al dedo. Solo trabajan cuando se mueve.
 * [data-apunta]: su aguja (--giro) lo mira. [data-mira]: cruz con coordenadas sobre una captura.
 */
export function startPlates(): void {
  let x = 0;
  let y = 0;
  let target: Element | null = null;
  let raf = 0;
  let linger = 0;
  let marked: Element | null = null;

  function mark(el: Element | null): void {
    if (marked === el) return;
    marked?.removeAttribute("data-tocada");
    el?.setAttribute("data-tocada", "");
    marked = el;
  }

  function apply(): void {
    raf = 0;
    const area = target?.closest("[data-zona]");
    for (const el of area?.querySelectorAll<HTMLElement | SVGElement>("[data-apunta]") ?? []) {
      const q = el.getBoundingClientRect();
      if (!q.width) continue;
      const a = Math.atan2(x - q.left - q.width / 2, q.top + q.height / 2 - y);
      el.style.setProperty("--giro", `${((a * 180) / Math.PI).toFixed(1)}deg`);
    }
    mark(area ? (target?.closest("li") ?? null) : null);
    cross();
  }

  /** La cruz se ve solo con cursor (plates.css). */
  function cross(): void {
    const shot = target?.closest<HTMLElement>("[data-mira]");
    const el = shot?.querySelector<HTMLElement>(".mira");
    if (!shot || !el) return;
    const q = shot.getBoundingClientRect();
    const px = x - q.left - shot.clientLeft;
    const py = y - q.top - shot.clientTop;
    el.style.setProperty("--x", `${px.toFixed(0)}px`);
    el.style.setProperty("--y", `${py.toFixed(0)}px`);
    let read = el.firstElementChild;
    if (!read) {
      read = document.createElement("span");
      read.className = "lectura";
      el.append(read);
    }
    // Al llegar al borde derecho, las coordenadas pasan al otro lado
    el.toggleAttribute("data-alreves", px > shot.clientWidth - 150);
    const percent = (v: number, of: number) => ((v / of) * 100).toFixed(0);
    read.textContent = `x ${percent(px, shot.clientWidth)} · y ${percent(py, shot.clientHeight)}`;
  }

  follow(document.body, {
    move(cx, cy, el) {
      x = cx;
      y = cy;
      target = el instanceof Element ? el : null;
      clearTimeout(linger);
      raf ||= requestAnimationFrame(apply);
    },
    end(touch) {
      clearTimeout(linger);
      linger = window.setTimeout(() => mark(null), touch ? LINGER_MS : 0);
    },
  });
}
