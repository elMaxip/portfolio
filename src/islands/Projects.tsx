import { useState } from "react";

export interface Screenshot {
  label: string;
  alt: string;
  src: string;
  srcSet: string;
  width: number;
  height: number;
}

export interface Project {
  id: string;
  name: string;
  summary: string;
  problem: string;
  solution: string;
  note?: string;
  link?: { label: string; href: string };
  background: string;
  screenshots: Screenshot[];
}

interface Props {
  projects: Project[];
}

const SIZES = "(min-width: 1060px) calc(100vw - 540px), calc(100vw - 76px)";

/**
 * Selección de planeta, ventana y capturas. El movimiento es del motor (engine/orbit.ts):
 * lee data-planeta y data-elegido, y escribe el estilo de los botones. Por eso aquí
 * los botones no llevan `style`.
 *
 * Se generan todas las ventanas: sin JavaScript se ven las tres, con sus capturas a la vista.
 */
export default function Projects({ projects }: Props) {
  const [selected, setSelected] = useState(projects[0].id);
  const [shots, setShots] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState("");

  const choose = (project: Project) => {
    setSelected(project.id);
    setNotice(`Mostrando ${project.name}`);
  };

  return (
    <>
      <div className="orbita solo-js" role="group" aria-label="Elegir proyecto" data-elegido={selected}>
        <canvas data-escena="sistema" aria-hidden="true" />
        {projects.map((project) => (
          <button
            key={project.id}
            className="planeta"
            type="button"
            data-planeta={project.id}
            aria-pressed={project.id === selected}
            aria-controls="panel-proyecto"
            onClick={() => choose(project)}
          >
            <span className="rotulo" data-rotulo>
              <span className="rotulo-nombre t-planeta" translate="no">
                {project.name}
              </span>{" "}
              <span className="rotulo-resumen t-resumen" data-resumen>
                {project.summary}
              </span>
            </span>
          </button>
        ))}
      </div>

      <p className="oculto" role="status">
        {notice}
      </p>

      <div className="proyectos-lista" id="panel-proyecto">
        {projects.map((project) => {
          const shot = shots[project.id] ?? 0;
          return (
            <article
              className="proyecto"
              key={project.id}
              aria-labelledby={`proyecto-${project.id}`}
              data-activo={project.id === selected || undefined}
            >
              <div className="proyecto-barra">
                <h3 className="t-ventana" id={`proyecto-${project.id}`} translate="no">
                  <span aria-hidden="true">&gt; </span>
                  {project.name}
                </h3>
              </div>
              <div className="proyecto-cuerpo">
                <div className="proyecto-visual">
                  <div className="capturas" style={{ background: project.background }}>
                    {project.screenshots.map((s, i) => (
                      <figure className="captura" key={s.label} data-activa={i === shot || undefined}>
                        <img
                          src={s.src}
                          srcSet={s.srcSet}
                          sizes={SIZES}
                          width={s.width}
                          height={s.height}
                          alt={s.alt}
                          loading="lazy"
                          decoding="async"
                        />
                        <figcaption>{s.label}</figcaption>
                      </figure>
                    ))}
                  </div>
                  <div className="capturas-botones solo-js" role="group" aria-label={`Capturas de ${project.name}`}>
                    {project.screenshots.map((s, i) => (
                      <button
                        key={s.label}
                        className="tecla"
                        type="button"
                        aria-pressed={i === shot}
                        onClick={() => setShots((all) => ({ ...all, [project.id]: i }))}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="proyecto-textos">
                  <p className="sin-js t-resumen">{project.summary}</p>
                  <div>
                    <h4 className="t-punto">
                      <span aria-hidden="true"># </span>El problema
                    </h4>
                    <p>{project.problem}</p>
                  </div>
                  <div>
                    <h4 className="t-punto">
                      <span aria-hidden="true"># </span>Lo que construí
                    </h4>
                    <p>{project.solution}</p>
                  </div>
                  {project.note && <p className="nota">{project.note}</p>}
                  {project.link && (
                    <a className="nav sub" href={project.link.href}>
                      {project.link.label}
                    </a>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
