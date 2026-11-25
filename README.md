# client-portfolio

Web para conseguir clientes. Astro, React, TypeScript y pnpm. Sitio estático.

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Desarrollo |
| `pnpm check` | Revisa los tipos |
| `pnpm build` | Revisa los tipos y genera `dist/` |
| `pnpm preview` | Muestra `dist/` |
| `pnpm movil` | Genera y abre el sitio a la red local, para verlo en el teléfono. Con `/?fps` mide la fluidez |

- Los textos, proyectos y precios están en `src/content/`.
- TypeScript queda en 6 porque `astro check` todavía no acepta la 7.
- Lo provisorio está marcado con `PENDIENTE` en el código. Es obligatorio resolverlo antes de publicar: `git grep PENDIENTE`.
