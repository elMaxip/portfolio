import { type MouseEvent, type TouchEvent, useEffect, useRef, useState } from "react";
import Lightbox from "./Lightbox";
import ProjectFigure from "./ProjectFigure";
import ShotNav from "./ShotNav";

export interface Screenshot {
  label: string;
  alt: string;
  /** Tamaño completo: se descarga solo al ampliar. */
  full: string;
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

  /** Captura ampliada. `preview` es la imagen ya cargada. */
  const [zoomed, setZoomed] = useState<{ id: string; preview: string } | null>(null);

  const show = (id: string, index: number) => setShots((all) => ({ ...all, [id]: index }));

  // Deslizar la captura de lado pasa a otra
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    swipe.current = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent, project: Project) => {
    const from = swipe.current;
    swipe.current = null;
    if (!from || e.touches.length) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - from.x;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(t.clientY - from.y) * 1.5) return;
    const count = project.screenshots.length;
    show(project.id, ((shots[project.id] ?? 0) + (dx < 0 ? 1 : -1) + count) % count);
  };

  const closeZoom = () => {
    const id = zoomed?.id;
    setZoomed(null);
    // El foco vuelve a la captura que quedó a la vista
    requestAnimationFrame(() => {
      panel.current
        ?.querySelector<HTMLElement>(`[data-proyecto="${id}"] [data-activa] .ampliar`)
        ?.focus({ preventScroll: true });
    });
  };
  const zoomedProject = projects.find((p) => p.id === zoomed?.id);

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
        {projects.map((project) => {
          const shot = shots[project.id] ?? 0;
          return (
            <article
              className="proyecto"
              key={project.id}
              aria-labelledby={`proyecto-${project.id}`}
              data-activo={project.id === selected || undefined}
              data-zona=""
              data-proyecto={project.id}
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
                  <div
                    className="capturas"
                    data-mira=""
                    style={{ background: project.background }}
                    onTouchStart={onTouchStart}
                    onTouchEnd={(e) => onTouchEnd(e, project)}
                  >
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
                        <button
                          className="ampliar solo-js"
                          type="button"
                          aria-label={`Ampliar: ${s.label}`}
                          aria-haspopup="dialog"
                          onClick={(e) =>
                            setZoomed({ id: project.id, preview: e.currentTarget.parentElement?.querySelector("img")?.currentSrc ?? s.src })
                          }
                        >
                          <span aria-hidden="true">+</span>
                        </button>
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
                        onClick={() => show(project.id, i)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <ShotNav
                    className="solo-js"
                    labels={project.screenshots.map((s) => s.label)}
                    index={shot}
                    onChange={(i) => show(project.id, i)}
                    name={project.name}
                  />
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
                  <ProjectFigure id={project.id} />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {zoomed && zoomedProject && (
        <Lightbox
          project={zoomedProject}
          index={shots[zoomedProject.id] ?? 0}
          preview={zoomed.preview}
          onChange={(i) => show(zoomedProject.id, i)}
          onClose={closeZoom}
        />
      )}
    </>
  );
}
