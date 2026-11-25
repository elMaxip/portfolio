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

const SIZES_MAIN = "(min-width: 1060px) calc(100vw - 540px), calc(100vw - 76px)";
const SIZES_HALF = "(min-width: 1060px) calc(50vw - 270px), calc(50vw - 46px)";

// Etapa 2: todos los proyectos abiertos y sin estado. Es también la versión sin JavaScript.
// La órbita y la selección llegan en la etapa 4.
export default function Projects({ projects }: Props) {
  return (
    <div className="proyectos-lista">
      {projects.map((project) => (
        <article className="proyecto" key={project.id} aria-labelledby={`proyecto-${project.id}`}>
          <div className="proyecto-barra">
            <h3 className="t-ventana" id={`proyecto-${project.id}`} translate="no">
              <span aria-hidden="true">&gt; </span>
              {project.name}
            </h3>
          </div>
          <div className="proyecto-cuerpo">
            <div className="proyecto-visual">
              <div className="capturas">
                {project.screenshots.map((shot, i) => (
                  <figure className="captura" key={shot.label}>
                    <img
                      src={shot.src}
                      srcSet={shot.srcSet}
                      sizes={i === 0 ? SIZES_MAIN : SIZES_HALF}
                      width={shot.width}
                      height={shot.height}
                      alt={shot.alt}
                      loading="lazy"
                      decoding="async"
                      style={{ background: project.background }}
                    />
                    <figcaption>{shot.label}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
            <div className="proyecto-textos">
              <p className="resumen-ventana t-resumen">{project.summary}</p>
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
      ))}
    </div>
  );
}
