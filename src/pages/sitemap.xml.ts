import type { APIRoute } from "astro";

/** Una sola página. Sin dominio queda vacío. */
export const GET: APIRoute = ({ site }) => {
  const urls = site ? `<url><loc>${new URL("/", site).href}</loc></url>` : "";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
};
