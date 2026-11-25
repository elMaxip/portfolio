// @ts-check
import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  // PENDIENTE: agregar `site` con el dominio real antes de publicar.
  output: "static",
  integrations: [react()],
});
