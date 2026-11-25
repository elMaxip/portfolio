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
if (/name="robots" content="noindex"/.test(html)) missing.push("dist: la página pide no aparecer en buscadores (falta el dominio)");
if (/href="https:\/\/wa\.me\/"/.test(html)) missing.push("dist: el botón de WhatsApp no tiene número");
if (!/property="og:image"/.test(html)) missing.push("dist: no hay imagen para la vista previa al compartir (falta el dominio)");

if (missing.length) {
  console.error(`Aún no se puede publicar. Falta:\n\n- ${missing.join("\n- ")}\n`);
  process.exit(1);
}
console.log("Listo para publicar: sube la carpeta dist.");
