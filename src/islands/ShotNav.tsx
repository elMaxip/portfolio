interface Props {
  labels: string[];
  index: number;
  onChange: (index: number) => void;
  /** Para lectores de pantalla. */
  name: string;
  className?: string;
}

const two = (n: number) => String(n).padStart(2, "0");

/** Pasa de una captura a otra: un eje con un círculo por captura. Siempre simétrico. */
export default function ShotNav({ labels, index, onChange, name, className = "" }: Props) {
  const count = labels.length;
  const go = (way: number) => onChange((index + way + count) % count);
  return (
    <div className={`eje-capturas ${className}`} role="group" aria-label={`Capturas de ${name}`}>
      <button className="eje-flecha" type="button" aria-label="Captura anterior" onClick={() => go(-1)}>
        <span aria-hidden="true">‹</span>
      </button>
      <div className="eje-puntos">
        {labels.map((label, i) => (
          <button key={label} type="button" aria-label={label} aria-pressed={i === index} onClick={() => onChange(i)}>
            <span aria-hidden="true" />
          </button>
        ))}
      </div>
      <button className="eje-flecha" type="button" aria-label="Captura siguiente" onClick={() => go(1)}>
        <span aria-hidden="true">›</span>
      </button>
      <p aria-live="polite">
        <span className="eje-numero">
          {two(index + 1)} / {two(count)}
        </span>{" "}
        · {labels[index]}
      </p>
    </div>
  );
}
