/** 0: libre · 1: no se dibuja · 2: se atenúa, salvo los planetas */
export interface MaskGrid {
  cols: number;
  rows: number;
  cells: Uint8Array;
}

/**
 * Zonas con texto encima del lienzo. El texto manda: los caracteres del fondo
 * no pasan por debajo de él. `cw` y `ch` son el tamaño de celda en píxeles CSS.
 */
export function textMask(
  canvas: HTMLCanvasElement,
  grid: { cols: number; rows: number; cw: number; ch: number; padX: number; padY: number },
): MaskGrid | null {
  const blocks = canvas.parentElement?.querySelectorAll<HTMLElement>("[data-bloque]");
  const w = canvas.clientWidth;
  if (!blocks?.length || !w) return null;
  const { cols, rows, cw, ch, padX, padY } = grid;
  const b = canvas.getBoundingClientRect();
  const k = b.width ? w / b.width : 1;
  const cells = new Uint8Array(cols * rows);
  for (const el of blocks) {
    const q = el.getBoundingClientRect();
    const c0 = Math.max(0, Math.floor(((q.left - b.left) * k - padX) / cw));
    const c1 = Math.min(cols, Math.ceil(((q.right - b.left) * k + padX) / cw));
    const r0 = Math.max(0, Math.floor(((q.top - b.top) * k - padY) / ch));
    const r1 = Math.min(rows, Math.ceil(((q.bottom - b.top) * k + padY) / ch));
    const kind = Number(el.dataset.bloque);
    for (let y = r0; y < r1; y++) {
      for (let x = c0; x < c1; x++) cells[y * cols + x] = kind;
    }
  }
  return { cols, rows, cells };
}
