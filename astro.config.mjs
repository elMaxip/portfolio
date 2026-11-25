// @ts-check
import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  // PENDIENTE: el dominio real, por ejemplo "https://midominio.cl". Con él se activan los buscadores,
  // el sitemap y la vista previa al compartir. Sin él, la página pide no aparecer en buscadores.
  site: undefined,
  output: "static",
  integrations: [react()],
});
