import { defineCollection } from "astro/content/config";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";

const link = z.object({ label: z.string(), href: z.url() });

/** Textos de la portada, Sobre mí, cierre y pie. Una sola entrada: "main". */
const site = defineCollection({
  loader: file("src/content/site.yaml"),
  schema: z.object({
    firstName: z.string(),
    lastName: z.string(),
    // Para la pestaña, los buscadores y la vista previa al compartir.
    title: z.string(),
    description: z.string(),
    whatsapp: z.object({
      // Solo dígitos y con código de país (569XXXXXXXX). Vacío mientras sea provisorio.
      number: z.string().regex(/^(\d{8,15})?$/),
      label: z.string(),
    }),
    hero: z.object({ tagline: z.string(), explore: z.string() }),
    about: z.object({
      title: z.string(),
      // Cada fragmento se ilumina por separado al bajar.
      highlights: z.array(z.string()),
      text: z.string(),
    }),
    projects: z.object({ title: z.string(), hint: z.string() }),
    process: z.object({ title: z.string() }),
    services: z.object({ title: z.string() }),
    closing: z.object({ title: z.string(), text: z.string() }),
    footer: z.object({ text: z.string(), links: z.array(link) }),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "src/content/projects" }),
  schema: ({ image }) =>
    z.object({
      order: z.number().int(),
      name: z.string(),
      summary: z.string(),
      problem: z.string(),
      solution: z.string(),
      note: z.string().optional(),
      link: link.optional(),
      // Color que se ve mientras carga la captura.
      screenshotBackground: z.string(),
      screenshots: z
        .array(z.object({ label: z.string(), alt: z.string(), image: image() }))
        .length(3),
    }),
});

const steps = defineCollection({
  loader: file("src/content/steps.yaml"),
  schema: z.object({
    order: z.number().int(),
    title: z.string(),
    text: z.string(),
    // Cuántos # lleva la barra de 18 espacios.
    progress: z.number().int().min(0).max(18),
  }),
});

const services = defineCollection({
  loader: file("src/content/services.yaml"),
  schema: z.object({
    order: z.number().int(),
    name: z.string(),
    text: z.string(),
    // Pesos chilenos.
    priceFrom: z.number().int().positive(),
  }),
});

export const collections = { site, projects, steps, services };
