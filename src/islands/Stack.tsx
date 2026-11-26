import { type CSSProperties, type KeyboardEvent, useRef, useState } from "react";

export interface Folder {
  id: string;
  label: string;
  items: string[];
}

interface Props {
  folders: Folder[];
  /** Proyectos en el orden de la órbita: son las columnas de la tabla. */
  projects: { id: string; name: string }[];
  /** Tecnología → id de los proyectos donde se usó. */
  uses: Record<string, string[]>;
  /** Dónde se usó lo que no está en ningún proyecto. */
  notes: Record<string, string>;
  /** Para lo que no está en ningún proyecto ni tiene nota. */
  elsewhere: string;
}

/** Color de cada proyecto: el nombre de su planeta elegido (colors.css). */
const colorOf = (id: string) => ({ "--color": `var(--planeta-${id}, var(--acento))` }) as CSSProperties;

/** Elige el planeta en la órbita de Proyectos (Projects.tsx y engine/orbit.ts escuchan su clic). */
function pickProject(id: string): void {
  document.querySelector<HTMLButtonElement>(`[data-planeta="${id}"]`)?.click();
}

/**
 * El stack como un explorador: a la izquierda las carpetas (pestañas), a la derecha una tabla con
 * las tecnologías de la carpeta elegida y los proyectos donde usé cada una. Un punto lleva a ese proyecto.
 */
export default function Stack({ folders, projects, uses, notes, elsewhere }: Props) {
  const [active, setActive] = useState(folders[0].id);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const shown = folders.find((f) => f.id === active)!;
  const index = folders.indexOf(shown);

  /** Flechas, Inicio y Fin pasan de una carpeta a otra, como en cualquier lista de pestañas. */
  function onKeyDown(e: KeyboardEvent) {
    const n = folders.length;
    const keys: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: n - 1,
    };
    const to = keys[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const next = (to + n) % n;
    setActive(folders[next].id);
    tabs.current[next]?.focus();
  }

  return (
    <div className="explorador">
      <div className="explorador-cuerpo">
        <div className="carpetas" role="tablist" aria-label="Carpetas del stack" aria-orientation="vertical">
          {folders.map((f, i) => {
            const last = i === folders.length - 1;
            const selected = f.id === active;
            return (
              <button
                key={f.id}
                ref={(el) => void (tabs.current[i] = el)}
                className="carpeta"
                type="button"
                role="tab"
                id={`pestana-${f.id}`}
                aria-selected={selected}
                aria-controls="panel-stack"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(f.id)}
                onKeyDown={onKeyDown}
              >
                <span className="carpeta-fila">
                  <span className="rama" aria-hidden="true">
                    {last ? "└── " : "├── "}
                  </span>
                  <span className="carpeta-nombre">{f.label}</span>
                  <span className="cuenta">{f.items.length}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="matriz" role="tabpanel" id="panel-stack" aria-labelledby={`pestana-${active}`}>
          <table>
            <caption className="oculto">Proyectos donde usé cada tecnología de {shown.label}</caption>
            <thead>
              <tr>
                <td />
                {projects.map((p) => (
                  <th key={p.id} scope="col" style={colorOf(p.id)}>
                    <span className="columna-nombre" translate="no">
                      {p.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.items.map((name) => {
                const here = uses[name] ?? [];
                return (
                  <tr key={name}>
                    <th scope="row">
                      <span className="fila-nombre">{name}</span>
                    </th>
                    {here.length ? (
                      projects.map((p) => (
                        <td key={p.id} className="celda" style={colorOf(p.id)}>
                          {here.includes(p.id) ? (
                            <a
                              className="celda-uso"
                              href="#proyectos"
                              aria-label={`Sí: ver ${p.name}`}
                              onClick={() => pickProject(p.id)}
                            >
                              <span aria-hidden="true" />
                            </a>
                          ) : (
                            <span className="oculto">No</span>
                          )}
                        </td>
                      ))
                    ) : (
                      <td className="fila-nota" colSpan={projects.length}>
                        {notes[name] ?? elsewhere}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">
                  <span className="pie-nombre">por proyecto</span>
                </th>
                {projects.map((p) => {
                  const count = shown.items.filter((name) => uses[name]?.includes(p.id)).length;
                  return (
                    <td key={p.id} className="pie-cuenta" data-vacia={count === 0 || undefined}>
                      {count}/{shown.items.length}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
