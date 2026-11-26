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
    services: z.object({ title: z.string(), quote: z.string(), note: z.string() }),
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
        .min(3)
        .max(4),
    }),
});

const steps = defineCollection({
  loader: file("src/content/steps.yaml"),
  schema: z
    .object({
      order: z.number().int(),
      title: z.string(),
      text: z.string(),
      // Tramo de la línea de tiempo de 18 espacios que ocupa la fase: de start a end.
      start: z.number().int().min(0).max(18),
      end: z.number().int().min(0).max(18),
      // Va junto a la barra: "días 1–2"
      duration: z.string(),
    })
    .refine((s) => s.start < s.end, { message: "start debe ser menor que end", path: ["end"] }),
});

const services = defineCollection({
  loader: file("src/content/services.yaml"),
  schema: z.object({
    order: z.number().int(),
    name: z.string(),
    text: z.string(),
    // Mensaje de WhatsApp ya escrito; la persona lo puede editar.
    message: z.string(),
    // Pesos chilenos.
    priceFrom: z.number().int().positive(),
  }),
});

/* --- Portafolio profesional (la raíz del sitio): src/content/profesional --- */

const text = z.object({ title: z.string(), hint: z.string() });

/** Una sola entrada: "main". */
const proSite = defineCollection({
  loader: file("src/content/profesional/site.yaml"),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    hero: z.object({ tagline: z.string(), cta: z.object({ label: z.string(), href: z.string() }), explore: z.string() }),
    about: z.object({
      title: z.string(),
      highlights: z.array(z.string()),
      text: z.string(),
      links: z.array(link),
      cv: z.object({ label: z.string(), href: z.string(), file: z.string() }),
    }),
    projects: text,
    stack: text.extend({ elsewhere: z.string(), notes: z.record(z.string(), z.string()).default({}) }),
    contact: z.object({
      title: z.string(),
      text: z.string(),
      emailjs: z.object({ serviceId: z.string(), templateId: z.string(), publicKey: z.string() }),
    }),
  }),
});

const proProjects = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "src/content/profesional/projects" }),
  schema: ({ image }) =>
    z.object({
      order: z.number().int(),
      name: z.string(),
      summary: z.string(),
      problem: z.string(),
      solution: z.string(),
      note: z.string().optional(),
      technologies: z.array(z.string()).min(1),
      // Tecnologías del Stack que se usaron sin estar en la lista (NestJS corre en Node).
      alsoUses: z.array(z.string()).default([]),
      links: z.array(link).default([]),
      // "phone": capturas verticales de celular, que se muestran enteras.
      device: z.enum(["desktop", "phone"]).default("desktop"),
      screenshotBackground: z.string(),
      screenshots: z
        .array(z.object({ label: z.string(), alt: z.string(), image: image(), description: z.string() }))
        .min(3)
        .max(4),
    }),
});

const stack = defineCollection({
  loader: file("src/content/profesional/stack.yaml"),
  schema: z.object({
    order: z.number().int(),
    label: z.string(),
    items: z.array(z.string()).min(1),
  }),
});

export const collections = { site, projects, steps, services, proSite, proProjects, stack };
