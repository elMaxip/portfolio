interface Follow {
  /** Posición en la pantalla. `target` es lo que se tocó o lo que está bajo el cursor. */
  move(x: number, y: number, target: EventTarget | null): void;
  /** El cursor salió o se levantó el dedo. */
  end(touch: boolean): void;
}

/**
 * Sigue el cursor o el dedo. Con el dedo usa eventos táctiles: los de puntero se cortan
 * apenas el navegador empieza a desplazar la página, y estos siguen llegando.
 */
export function follow(el: HTMLElement, { move, end }: Follow): void {
  el.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "touch") move(e.clientX, e.clientY, e.target);
  });
  el.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "touch") end(false);
  });
  const touch = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t) move(t.clientX, t.clientY, t.target);
  };
  el.addEventListener("touchstart", touch, { passive: true });
  el.addEventListener("touchmove", touch, { passive: true });
  for (const n of ["touchend", "touchcancel"] as const) {
    el.addEventListener(n, (e) => {
      if (!e.touches.length) end(true);
    });
  }
}
