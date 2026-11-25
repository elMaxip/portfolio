import type { Orbit } from "./orbit";

export type Vec3 = readonly [number, number, number];

export interface Mouse {
  x: number;
  y: number;
  /** Fuerza del efecto, de 0 a 1. Al levantar el dedo se apaga de a poco. */
  force: number;
}

export type SceneKey = "hero" | "sistema" | "retrato" | "faseA" | "faseB" | "faseC" | "horizonte";

/** Lo que cada estilo necesita saber de la página. Lo mantiene al día loop.ts. */
export interface Env {
  reduce: boolean;
  paused: boolean;
  phone: boolean;
  /** Cursor o dedo, en píxeles CSS dentro del lienzo de la portada. */
  mouse: Mouse;
  readonly orbit: Orbit;
}

/** Un lienzo y su reloj. Lo comparten todos los estilos. */
export interface View {
  readonly key: SceneKey;
  readonly el: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  /** Tiempo de la escena, en segundos. Avanza solo mientras se ve. */
  t: number;
  /** Cuándo empezó a formarse el planeta de portada. Negativo: ya está formado. */
  t0: number;
}

export interface Painter {
  /** Segundos mínimos entre cuadros. */
  readonly step: number;
  /** Ajusta el lienzo al tamaño de `view` y recalcula las zonas de texto. */
  fit(): void;
  /** Solo recalcula las zonas de texto. */
  measureText(): void;
  /** Cálculos que se pueden adelantar, en pasos cortos y sin dibujar. */
  readonly prepare: readonly (() => unknown)[];
  paint(): void;
}

export type StyleName = "suave" | "ascii";

export interface Style {
  create(view: View): Painter;
  /** Olvida los caracteres dibujados con una tipografía que aún no había cargado. */
  forgetGlyphs(): void;
}

/** Segundos entre cuadros: unos 30 por segundo. */
export const SLOW = 1 / 31;
/** Unos 60. Deja margen para pantallas de 120 o 144 Hz. */
export const FAST = 1 / 75;

/** Índices de las paletas, iguales en los dos estilos. */
export const ICE = 0;
export const BLUE = 1;
export const GREEN = 2;
export const AMBER = 3;
export const MOON = 4;
export const LIGHT = 5;
