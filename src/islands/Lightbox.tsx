import { type CSSProperties, type KeyboardEvent, useEffect, useRef } from "react";
import { Zoom } from "../engine/zoom";
import type { Project } from "./Projects";
import ShotNav from "./ShotNav";

interface Props {
  project: Project;
  index: number;
  /** Lo que ya está cargado, para mostrarlo mientras llega la imagen grande. */
  preview: string;
  onChange: (index: number) => void;
  onClose: () => void;
}

/** Captura ampliada en medio de la pantalla. El botón atrás del celular la cierra. */
export default function Lightbox({ project, index, preview, onChange, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const read = useRef<HTMLSpanElement>(null);
  const zoom = useRef<Zoom>(null);
  const count = project.screenshots.length;
  const shot = project.screenshots[index];
  const first = useRef(index);

  // Siempre la versión más reciente, sin volver a montar el zoom
  const live = useRef({ step: (_: number) => {}, close: () => {} });
  live.current.step = (way) => onChange((index + way + count) % count);
  live.current.close = () => dialog.current?.close();

  useEffect(() => {
    const el = dialog.current;
    if (!el || !stage.current || !img.current) return;
    el.showModal();
    history.pushState({ captura: true }, "");
    const onPop = () => el.close();
    addEventListener("popstate", onPop);
    const z = new Zoom(stage.current, img.current, {
      onScale: (s) => {
        if (read.current) read.current.textContent = `×${s.toFixed(1).replace(".", ",")}`;
      },
      onSwipe: (way) => live.current.step(way),
      onOutside: () => live.current.close(),
    });
    zoom.current = z;
    z.reset();
    return () => {
      removeEventListener("popstate", onPop);
      z.destroy();
    };
  }, []);

  useEffect(() => zoom.current?.reset(), [index]);

  const closed = () => {
    if ((history.state as { captura?: boolean } | null)?.captura) history.back();
    onClose();
  };

  const onKey = (e: KeyboardEvent) => {
    const z = zoom.current;
    if (!z) return;
    const big = z.scale > 1.01;
    if (e.key === "+" || e.key === "=") z.by(1.5);
    else if (e.key === "-") z.by(1 / 1.5);
    else if (e.key === "0") z.reset(true);
    else if (e.key === "ArrowLeft") big ? z.pan(80, 0) : live.current.step(-1);
    else if (e.key === "ArrowRight") big ? z.pan(-80, 0) : live.current.step(1);
    else if (e.key === "ArrowUp" && big) z.pan(0, 80);
    else if (e.key === "ArrowDown" && big) z.pan(0, -80);
    else return;
    e.preventDefault();
  };

  return (
    <dialog className="visor" ref={dialog} aria-label={`Capturas de ${project.name}`} onClose={closed} onKeyDown={onKey}>
      <div className="visor-barra">
        <p className="t-ventana" translate="no">
          {project.name}
        </p>
        <button className="tecla" type="button" aria-label="Cerrar" onClick={() => live.current.close()}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div className="visor-escena" ref={stage}>
        <img
          ref={img}
          src={shot.full}
          width={shot.width}
          height={shot.height}
          alt={shot.alt}
          draggable={false}
          style={
            {
              "--proporcion": shot.width / shot.height,
              background: `${project.background} ${index === first.current ? `url("${preview}")` : "none"} 0 0 / 100% 100%`,
            } as CSSProperties
          }
        />
      </div>
      <div className="visor-controles">
        <ShotNav labels={project.screenshots.map((s) => s.label)} index={index} onChange={onChange} name={project.name} />
        <div className="visor-zoom" role="group" aria-label="Ampliación">
          <button className="tecla" type="button" aria-label="Alejar" onClick={() => zoom.current?.by(1 / 1.5)}>
            <span aria-hidden="true">−</span>
          </button>
          <span ref={read} aria-hidden="true" />
          <button className="tecla" type="button" aria-label="Acercar" onClick={() => zoom.current?.by(1.5)}>
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
