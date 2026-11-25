/**
 * Láminas: dibujos geométricos que responden al cursor. Solo trabajan cuando se mueve.
 * [data-apunta]: su aguja (--giro) mira hacia el cursor. [data-mira]: cruz con coordenadas sobre una captura.
 */
export function startPlates(): void {
  let event: PointerEvent | null = null;
  let raf = 0;
  const apply = () => {
    raf = 0;
    const e = event;
    if (!e) return;
    const target = e.target instanceof Element ? e.target : null;

    const area = target?.closest("[data-zona]");
    for (const el of area?.querySelectorAll<HTMLElement | SVGElement>("[data-apunta]") ?? []) {
      const q = el.getBoundingClientRect();
      if (!q.width) continue;
      const a = Math.atan2(e.clientX - q.left - q.width / 2, q.top + q.height / 2 - e.clientY);
      el.style.setProperty("--giro", `${((a * 180) / Math.PI).toFixed(1)}deg`);
    }

    if (e.pointerType !== "mouse") return;
    const shot = target?.closest<HTMLElement>("[data-mira]");
    if (!shot) return;
    const q = shot.getBoundingClientRect();
    const x = e.clientX - q.left - shot.clientLeft;
    const y = e.clientY - q.top - shot.clientTop;
    const cross = shot.querySelector<HTMLElement>(".mira");
    if (!cross) return;
    cross.style.setProperty("--x", `${x.toFixed(0)}px`);
    cross.style.setProperty("--y", `${y.toFixed(0)}px`);
    let read = cross.firstElementChild;
    if (!read) {
      read = document.createElement("span");
      read.className = "lectura";
      cross.append(read);
    }
    // Al llegar al borde derecho, las coordenadas pasan al otro lado
    cross.toggleAttribute("data-alreves", x > shot.clientWidth - 150);
    read.textContent = `x ${((x / shot.clientWidth) * 100).toFixed(0)} · y ${((y / shot.clientHeight) * 100).toFixed(0)}`;
  };
  addEventListener(
    "pointermove",
    (e) => {
      event = e;
      raf ||= requestAnimationFrame(apply);
    },
    { passive: true },
  );
}
