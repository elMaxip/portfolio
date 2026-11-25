import ProjectFigure from "./ProjectFigure";
import { type MouseEvent, useEffect, useRef, useState } from "react";

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

/** Su contenido lo escribe el motor, quizá antes de que React llegue: React no lo toca. */
const OWNED_BY_ENGINE = { suppressHydrationWarning: true, dangerouslySetInnerHTML: { __html: "" } };

/** Deja ver el viaje del planeta al frente antes de bajar. */
const TRAVEL_MS = 900;

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

  const panel = useRef<HTMLDivElement>(null);
  const cancel = useRef(() => {});
  useEffect(() => () => cancel.current(), []);

  /** Baja a la ventana, salvo que ya se vea o que la persona se mueva antes. */
  const goToPanel = () => {
    cancel.current();
    const root = document.documentElement;
    const still = root.hasAttribute("data-paused") || matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(
      () => {
        cancel.current();
        const box = panel.current?.getBoundingClientRect();
        if (!box || (box.top >= 0 && box.top < innerHeight * 0.3)) return;
        panel.current?.scrollIntoView({ block: "start" });
      },
      still ? 0 : TRAVEL_MS,
    );
    const stop = () => cancel.current();
    const moves = ["wheel", "touchmove", "keydown"] as const;
    for (const m of moves) addEventListener(m, stop, { passive: true });
    cancel.current = () => {
      clearTimeout(timer);
      for (const m of moves) removeEventListener(m, stop);
    };
  };

  const choose = (project: Project, e: MouseEvent) => {
    setSelected(project.id);
    setNotice(`Mostrando ${project.name}`);
    // Con teclado (detail 0) no se baja: el foco quedaría fuera de la pantalla
    if (e.detail > 0) goToPanel();
  };

  return (
    <>
      <div className="orbita solo-js" role="group" aria-label="Elegir proyecto" data-elegido={selected}>
        {/* Trazos detrás de los planetas: engine/orbitplate.ts */}
        <svg className="lamina" data-trazos="" aria-hidden="true" {...OWNED_BY_ENGINE} />
        <canvas data-escena="sistema" aria-hidden="true" />
        {projects.map((project) => (
          <button
            key={project.id}
            className="planeta"
            type="button"
            data-planeta={project.id}
            aria-pressed={project.id === selected}
            aria-controls="panel-proyecto"
            onClick={(e) => choose(project, e)}
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

      <div className="proyectos-lista" id="panel-proyecto" ref={panel}>
        {projects.map((project, index) => {
          const shot = shots[project.id] ?? 0;
          return (
            <article
              className="proyecto"
              key={project.id}
              aria-labelledby={`proyecto-${project.id}`}
              data-activo={project.id === selected || undefined}
              data-zona=""
            >
              <div className="proyecto-barra">
                <h3 className="t-ventana" id={`proyecto-${project.id}`} translate="no">
                  <span aria-hidden="true">&gt; </span>
                  {project.name}
                </h3>
                <a className="nav solo-js" href="#proyectos">
                  Otros planetas <span aria-hidden="true">&nbsp;↑</span>
                </a>
              </div>
              <div className="proyecto-cuerpo">
                <div className="proyecto-visual">
                  <div className="capturas" data-mira="" style={{ background: project.background }}>
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
                    <span className="mira" aria-hidden="true" {...OWNED_BY_ENGINE} />
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
                  <div className="hito">
                    <h4 className="t-punto">
                      <span aria-hidden="true"># </span>El problema
                    </h4>
                    <p>{project.problem}</p>
                  </div>
                  <div className="hito">
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
                  <ProjectFigure id={project.id} number={index + 1} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
