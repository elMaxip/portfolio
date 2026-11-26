# portfolio

Sitio de Máximo Soto. Astro + React, estático. Son dos páginas con el mismo diseño:

- `/`: portafolio profesional, para reclutadores y equipos (`src/pages/index.astro`).
- `/servicios/`: página para conseguir clientes, con precios y WhatsApp (`src/pages/servicios.astro`).

```
pnpm install
pnpm dev         # http://localhost:4321
pnpm build       # revisa tipos y genera dist/
pnpm preview     # abre lo generado
pnpm movil       # lo abre en la red local, puerto 4400
pnpm publicable  # genera el sitio y dice qué falta antes de publicar
```

Para probar en el teléfono: `pnpm movil`, misma red wifi y abrir la dirección "Network" que aparece.
Con `/?fps` al final se ven los cuadros por segundo.

- `src/content`: textos, proyectos, pasos y servicios de la página para clientes, en YAML.
- `src/content/profesional`: textos, proyectos (con tecnologías y el detalle de cada captura) y el Stack del portafolio profesional.
- Los componentes de `src/components` sirven a las dos páginas: sin props usan los textos de la página para clientes.
- `src/styles`: colores, tipografías y las dos letras (`type-minimal.css` y `type-retro.css`).
- `src/engine`: los planetas y las animaciones de texto. No depende de Astro ni de React.
- `src/islands`: lo interactivo (proyectos, Stack, formulario de contacto y Apariencia), en React.
- El formulario de contacto envía con EmailJS; sus claves públicas están en `src/content/profesional/site.yaml`.
  Si el panel de EmailJS limita los dominios, hay que agregar el del sitio.
- TypeScript queda en 6 porque `astro check` todavía no acepta la 7.
- `<html>` lleva la apariencia: `data-tipo` (mini o retro) y `data-planetas` (suave o ascii).

## Publicar

`pnpm publicable` revisa los tipos, genera el sitio y termina con error si queda algo marcado `PENDIENTE`.

En Vercel no hay que configurar nada: detecta Astro y pnpm, usa `404.html`, guarda en caché `/_astro/`
y entrega la dirección de producción, con la que se activan los buscadores, el sitemap y la vista previa
al compartir (ver `astro.config.mjs`). En otro hosting estático: definir `SITE_URL` y subir la carpeta `dist`.

Después de publicar: pegar la dirección en un chat de WhatsApp para ver la vista previa
(`public/compartir.jpg`, 1200 × 630) y agregar el sitio en Google Search Console.

Las capturas de Lumina se tomaron con datos de demostración, sin marcas ni personas reales.
