import { createSoft } from "./suave/scenes";
import type { Env, Style, StyleName } from "./types";

export type CreateStyle = (env: Env) => Style;

/** Los planetas se dibujan con IBM Plex Mono: la espera un momento, pero no se bloquea por ella. */
async function glyphFont(weight: number): Promise<void> {
  const font = document.fonts.load(`${weight} 12px "IBM Plex Mono"`).catch(() => {});
  await Promise.race([font, new Promise((ok) => setTimeout(ok, 1500))]);
}

/** El estilo ASCII se descarga solo si se elige. */
export async function loadStyle(name: StyleName): Promise<CreateStyle> {
  if (name === "suave") {
    await glyphFont(500);
    return createSoft;
  }
  const [ascii] = await Promise.all([import("./ascii/scenes"), glyphFont(600)]);
  return ascii.createAscii;
}

export const chosenStyle = (): StyleName =>
  document.documentElement.dataset.planetas === "ascii" ? "ascii" : "suave";
