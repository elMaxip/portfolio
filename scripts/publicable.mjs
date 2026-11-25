// Revisa qué falta antes de publicar. Se usa con `pnpm publicable`, después de generar el sitio.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const files = (dir) =>
  readdirSync(path.join(root, dir), { recursive: true, withFileTypes: true })
    .filter((f) => f.isFile() && /\.(astro|tsx?|ya?ml|css|mjs)$/.test(f.name))
    .map((f) => path.join(f.parentPath, f.name));

const missing = [];
for (const file of [...files("src"), path.join(root, "astro.config.mjs")]) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      const note = line.match(/PENDIENTE:\s*(.+)/);
      if (note) missing.push(`${path.relative(root, file)}:${i + 1}  ${note[1].replace(/\s*-->$/, "")}`);
    });
}

const html = readFileSync(path.join(root, "dist", "index.html"), "utf8");
if (/href="https:\/\/wa\.me\/"/.test(html)) missing.push("dist: el botón de WhatsApp no tiene número");

if (missing.length) {
  console.error(`Aún no se puede publicar. Falta:\n\n- ${missing.join("\n- ")}\n`);
  process.exit(1);
}
console.log("Listo para publicar.");
if (/name="robots" content="noindex"/.test(html)) {
  console.log("Esta copia no tiene dirección pública: en Vercel se toma sola; en otro hosting, define SITE_URL al generar.");
}
