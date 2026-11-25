import type { Engine } from "./loop";
import { follow } from "./pointer";
import type { View } from "./types";

/**
 * Rayo de luz que se curva junto al agujero negro de Sobre mí. Cae desde arriba a la altura del cursor.
 * Unidades: el radio de la sombra dibujada. En un agujero negro real mide 2,6 radios de Schwarzschild (rₛ).
 */
const RS = 1 / 2.598;
/** Igual que en las escenas: retrato. */
const SHADOW = 0.185;

interface Ray {
  path: string;
  /** Cuánto se desvió, en grados. */
  bend: number;
  caught: boolean;
}

/** Trayectoria de un fotón: aceleración 1,5 rₛ h² / r⁴ hacia el centro (ecuación de Binet). */
function trace(b: number, reach: number): Ray {
  let x = b;
  let y = -reach;
  let vx = 0;
  let vy = 1;
  const h = b;
  const k = 1.5 * RS * h * h;
  let path = `M${x.toFixed(3)} ${y.toFixed(3)}`;
  let caught = false;
  for (let i = 0; i < 1600; i++) {
    const r = Math.hypot(x, y);
    if (r < RS) {
      caught = true;
      break;
    }
    const dt = Math.min(0.04, 0.02 * r);
    const mx = x + (vx * dt) / 2;
    const my = y + (vy * dt) / 2;
    const q = k / Math.hypot(mx, my) ** 5;
    vx -= mx * q * dt;
    vy -= my * q * dt;
    x = mx + (vx * dt) / 2;
    y = my + (vy * dt) / 2;
    if (i % 2 === 0) path += `L${x.toFixed(3)} ${y.toFixed(3)}`;
    if (Math.abs(x) > reach * 1.6 || Math.abs(y) > reach * 1.05) break;
  }
  return { path, bend: Math.abs((Math.atan2(vx, vy) * 180) / Math.PI), caught };
}

export function startLightRay(engine: Engine): void {
  const svg = document.querySelector<SVGSVGElement>("[data-luz]");
  const box = svg?.parentElement;
  const ray = svg?.querySelector<SVGPathElement>("[data-rayo]");
  const read = box?.querySelector<HTMLElement>("[data-lectura]");
  if (!svg || !box || !ray || !read) return;

  let R = 0;
  let reach = 3;
  let b = 1.4;
  /** Dónde está el cursor; null: el rayo se mueve solo. */
  let wanted: number | null = null;

  function fit({ w, h }: View): void {
    R = Math.min(w, h) * SHADOW;
    reach = h / 2 / R + 0.4;
    svg!.setAttribute("viewBox", `${-w / 2 / R} ${-h / 2 / R} ${w / R} ${h / R}`);
    for (const el of svg!.querySelectorAll<SVGPathElement>("[data-b]")) {
      el.setAttribute("d", trace(Number(el.dataset.b), reach).path);
    }
  }
  function draw(): void {
    const { path, bend, caught } = trace(b, reach);
    ray!.setAttribute("d", path);
    const impact = `b ${(Math.abs(b) / RS).toFixed(1).replace(".", ",")} rₛ`;
    read!.textContent = caught ? `${impact} · la luz no escapa` : `${impact} · δ ${Math.round(bend)}°`;
  }

  let size = "";
  engine.after.set("retrato", (view) => {
    const now = `${view.w}x${view.h}`;
    if (size !== now) {
      size = now;
      fit(view);
    }
    const goal = wanted ?? 1.9 - 0.85 * Math.cos(view.t * 0.4);
    b += (goal - b) * (wanted === null ? 0.05 : 0.3);
    draw();
  });

  /** La lectura se ve solo mientras alguien mueve el rayo. */
  const show = (value: boolean) => read.toggleAttribute("data-visible", value);

  let off = 0;
  follow(box, {
    move(x) {
      if (!R) return;
      clearTimeout(off);
      show(true);
      const q = box.getBoundingClientRect();
      wanted = (x - q.left - q.width / 2) / R;
      // En pausa el motor no dibuja: se responde de inmediato
      if (engine.env.paused || engine.env.reduce) {
        b = wanted;
        draw();
      }
    },
    end(touch) {
      clearTimeout(off);
      show(false);
      off = window.setTimeout(() => (wanted = null), touch ? 1200 : 0);
    },
  });
}
