const spokes = Array.from({ length: 24 }, (_, i) => i * 15);

/** Lámina pequeña de cada planeta. La aguja sigue al cursor (engine/plates.ts). */
export default function ProjectFigure({ id, number }: { id: string; number: number }) {
  return (
    <div className="figura solo-js" aria-hidden="true">
      <svg viewBox="-130 -66 260 132" data-apunta="" suppressHydrationWarning>
        <g className="trazo">
          <path d="M-126 0H126M0 -62V62" strokeDasharray="2 4" />
          <path d="M-100 -4v8M-75 -3v6M-50 -4v8M50 -4v8M75 -3v6M100 -4v8" />
          <circle r="58" strokeDasharray="1 5" />
        </g>
        <g className="trazo fuerte">
          {id === "lumina" && (
            <>
              <circle r="24" />
              <circle r="34" strokeDasharray="3 3" />
              {spokes.map((a, i) => (
                <path key={a} d={`M0 -38V${i % 2 ? -44 : -50}`} transform={`rotate(${a})`} />
              ))}
            </>
          )}
          {id === "huerto" && (
            <g transform="rotate(20)">
              <circle r="40" />
              <ellipse rx="14" ry="40" />
              <ellipse rx="29" ry="40" />
              <path d="M-40 0H40M-34.6 -20H34.6M-34.6 20H34.6" />
              <path d="M0 -52V-40M0 40V52" strokeDasharray="2 2" />
            </g>
          )}
          {id === "horario" && (
            <g transform="rotate(-20)">
              <circle r="27" />
              <path d="M-26 -8H26M-26 8H26M-20 -18H20M-20 18H20" strokeDasharray="4 3" />
              <path d="M-27 0A44 12 0 1 1 27 0" />
              <path d="M-27 -4A58 18 0 1 1 27 -4" transform="translate(0 2)" />
            </g>
          )}
        </g>
        <g className="carta-aguja trazo aguja">
          <path d="M0 0V-58" />
          <circle cy="-58" r="3.5" />
        </g>
      </svg>
      <span>Fig. {number}</span>
    </div>
  );
}
