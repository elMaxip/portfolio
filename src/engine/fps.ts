import type { Engine } from "./loop";

/**
 * Medidor para probar en el teléfono: con `pnpm movil`, se abre con ?fps en la dirección.
 * Muestra cuadros por segundo y cuánto tarda cada escena. Se carga solo si se pide.
 */
export function showFps(engine: Engine): void {
  (window as unknown as { __motor: Engine }).__motor = engine;
  const box = document.createElement("pre");
  box.setAttribute("aria-hidden", "true");
  box.style.cssText =
    "position:fixed;left:8px;bottom:8px;z-index:400;margin:0;padding:8px 10px;background:#000c;color:#8fd3ff;font:12px/1.4 monospace;pointer-events:none";
  document.body.append(box);

  let frames = 0;
  let worst = 0;
  let prev = performance.now();
  let since = prev;
  const spent = new Map<string, [ms: number, n: number]>();
  engine.onPaint = (key, ms) => {
    const s = spent.get(key) ?? [0, 0];
    spent.set(key, [s[0] + ms, s[1] + 1]);
  };
  const tick = (now: number) => {
    frames++;
    worst = Math.max(worst, now - prev);
    prev = now;
    if (now - since > 1000) {
      const lines = [...spent].map(([k, [ms, n]]) => `${k} ${(ms / n).toFixed(1)} ms ×${n}`);
      const fps = Math.round((frames * 1000) / (now - since));
      box.textContent = [`${fps} fps · peor ${Math.round(worst)} ms`, ...lines].join("\n");
      frames = worst = 0;
      since = now;
      spent.clear();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
