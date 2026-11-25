# client-portfolio

Sitio de Máximo Soto para conseguir clientes. Astro + React, estático.

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

- `src/content`: textos, proyectos, pasos y servicios en YAML.
- `src/styles`: colores, tipografías y las dos letras (`type-minimal.css` y `type-retro.css`).
- `src/engine`: los planetas y las animaciones de texto. No depende de Astro ni de React.
- `src/islands`: lo interactivo (proyectos y Apariencia), en React.
- TypeScript queda en 6 porque `astro check` todavía no acepta la 7.
- `<html>` lleva la apariencia: `data-tipo` (mini o retro) y `data-planetas` (suave o ascii).

## Antes de publicar

`pnpm publicable` termina con error mientras quede algo marcado `PENDIENTE`. Al resolver cada punto hay que borrar su comentario.

1. `src/content/services.yaml`: confirmar precios y qué incluye cada servicio.
2. `src/content/projects/lumina.yaml`: mejores capturas de Lumina.
3. `astro.config.mjs`: `site` con el dominio. Activa buscadores, sitemap y vista previa al compartir.

Se publica la carpeta `dist` en cualquier hosting estático. Conviene que el hosting:

- sirva por HTTPS y comprima los textos (casi todos lo hacen solos);
- use `404.html` para las direcciones que no existen;
- guarde en caché por un año lo que está en `/_astro/`, porque sus nombres cambian con el contenido.

Después de publicar: pegar la dirección en un chat de WhatsApp para ver la vista previa
(`public/compartir.jpg`, 1200 × 630) y agregar el sitio en Google Search Console.
