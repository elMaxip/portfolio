// @ts-check
import react from "@astrojs/react";
import { defineConfig } from "astro/config";

// La dirección pública activa los buscadores, el sitemap y la vista previa al compartir.
// En Vercel se toma sola al publicar en producción; en otro hosting, definir SITE_URL.
// Sin ella (en el computador o en vistas previas), la página pide no aparecer en buscadores.
const { SITE_URL, VERCEL_ENV, VERCEL_PROJECT_PRODUCTION_URL } = /** @type {any} */ (globalThis).process.env;
const vercel = VERCEL_ENV === "production" ? VERCEL_PROJECT_PRODUCTION_URL : undefined;

export default defineConfig({
  site: SITE_URL || (vercel && `https://${vercel}`) || undefined,
  output: "static",
  integrations: [react()],
});
