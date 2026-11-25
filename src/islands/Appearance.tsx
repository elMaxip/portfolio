import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

type Attribute = "tipo" | "planetas";

interface Option {
  value: string;
  label: string;
  className: string;
}

const GROUPS: { attribute: Attribute; label: string; options: [Option, Option] }[] = [
  {
    attribute: "tipo",
    label: "Letra",
    options: [
      { value: "mini", label: "Minimalista", className: "o-mini" },
      { value: "retro", label: "Retro", className: "o-retro" },
    ],
  },
  {
    attribute: "planetas",
    label: "Planetas",
    options: [
      { value: "suave", label: "Suaves", className: "o-texto" },
      { value: "ascii", label: "ASCII", className: "o-ascii" },
    ],
  },
];

/** La elección vive en <html>: ahí la leen el CSS y el motor. */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-tipo", "data-planetas"] });
  return () => observer.disconnect();
}

function choose(attribute: Attribute, value: string): void {
  const data = document.documentElement.dataset;
  if (data[attribute] === value) return;
  data[attribute] = value;
  try {
    localStorage.setItem("apariencia", JSON.stringify({ tipo: data.tipo, planetas: data.planetas }));
  } catch {
    // Sin almacenamiento, la elección dura hasta recargar
  }
}

function Group({ attribute, label, options }: (typeof GROUPS)[number]) {
  const id = useId();
  const value = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset[attribute],
    () => options[0].value,
  );
  return (
    <div className="ajustes-grupo" role="group" aria-labelledby={id}>
      <span id={id}>{label}</span>
      <div>
        {options.map((option) => (
          <button
            key={option.value}
            className={`opcion ${option.className}`}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => choose(attribute, option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Botón fijo y panel para elegir la letra y el dibujo de los planetas. */
export default function Appearance() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // El motor aprovecha de descargar el estilo ASCII
    document.dispatchEvent(new Event("apariencia:abierta"));
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <section className="ajustes solo-js" aria-label="Apariencia" ref={root}>
      <button
        className="ajustes-boton"
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="panel-apariencia"
        onClick={() => setOpen(!open)}
      >
        <span className="ajustes-icono" aria-hidden="true" />
        <span className="ajustes-texto">Apariencia</span>
      </button>
      <div id="panel-apariencia" className="ajustes-panel" hidden={!open}>
        {GROUPS.map((group) => (
          <Group key={group.attribute} {...group} />
        ))}
      </div>
    </section>
  );
}
