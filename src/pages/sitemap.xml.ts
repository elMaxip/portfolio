import type { APIRoute } from "astro";

/** El portafolio profesional y la página para clientes. Sin dominio queda vacío. */
const PAGES = ["/", "/servicios/"];

export const GET: APIRoute = ({ site }) => {
  const urls = site ? PAGES.map((p) => `<url><loc>${new URL(p, site).href}</loc></url>`).join("") : "";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
};
