/** Cuánto hay que moverse para esconder o mostrar el dial: menos que eso es un temblor del dedo. */
const NUDGE = 8;

/** Marca en qué sección está la pantalla, y en celular esconde el dial y abre el menú. Solo trabaja al desplazarse. */
export function startNav(): void {
  const nav = document.querySelector<HTMLElement>("[data-carta]");
  const button = nav?.querySelector("button");
  const angle = nav?.querySelector<HTMLElement>("[data-angulo]");
  if (!nav || !button || !angle) return;
  const links = [...nav.querySelectorAll<HTMLAnchorElement>("a")];
  const sections = links.map((a) => document.querySelector<HTMLElement>(a.hash));

  /** Hasta dónde se desplaza la página al elegir cada sección. */
  let stops: number[] = [];
  /** La sección que se eligió, por si dos terminan en el mismo lugar. */
  let wanted = -1;
  let active = 0;
  let raf = 0;
  /** Desde dónde se mide si la página sube o baja. */
  let from = 0;

  function measure(): void {
    const max = document.documentElement.scrollHeight - innerHeight;
    stops = sections.map((el) => {
      if (!el) return 0;
      const top = el.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(el).scrollMarginTop);
      return Math.min(max, Math.max(0, top));
    });
    request();
  }

  /** El dial se esconde al bajar y vuelve al subir, arriba de todo y con el menú abierto. */
  function dodge(y: number): void {
    if (y < NUDGE || isOpen()) nav!.removeAttribute("data-baja");
    else if (Math.abs(y - from) < NUDGE) return;
    else nav!.toggleAttribute("data-baja", y > from);
    from = y;
  }

  function update(): void {
    raf = 0;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const progress = Math.min(1, Math.max(0, scrollY / max));
    // Acotado: en iPhone la página rebota en los bordes
    dodge(progress * max);
    // Al llegar a una sección, la circunferencia queda justo sobre su círculo
    let last = stops.length - 1;
    while (last > 0 && stops[last] > scrollY + 2) last--;
    let position = last;
    const gap = (stops[last + 1] ?? 0) - stops[last];
    if (gap > 0) position += Math.max(0, scrollY - stops[last]) / gap;
    if (Math.abs(scrollY - stops[last]) < 2) position = last;
    if (wanted >= 0 && Math.abs(scrollY - stops[wanted]) < 2) position = wanted;
    // La siguiente sección manda un poco antes de llegar arriba
    const i = Math.min(stops.length - 1, Math.floor(position + 0.35));

    const theta = progress * 360;
    nav!.style.setProperty("--giro", `${theta.toFixed(1)}deg`);
    nav!.style.setProperty("--lugar", position.toFixed(3));
    angle!.textContent = `θ ${theta.toFixed(0).padStart(3, "0")}°`;
    nav!.toggleAttribute("data-arriba", scrollY < innerHeight * 0.35);
    if (i === active) return;
    links[active].removeAttribute("aria-current");
    links[i].setAttribute("aria-current", "location");
    active = i;
  }
  function request(): void {
    raf ||= requestAnimationFrame(update);
  }

  const isOpen = () => nav.hasAttribute("data-abierto");
  function open(value: boolean): void {
    nav!.toggleAttribute("data-abierto", value);
    button!.setAttribute("aria-expanded", String(value));
  }
  button.addEventListener("click", () => open(!isOpen()));
  links.forEach((a, i) =>
    a.addEventListener("click", () => {
      wanted = i;
      open(false);
    }),
  );
  for (const n of ["wheel", "touchmove", "keydown"] as const) addEventListener(n, () => (wanted = -1), { passive: true });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !isOpen()) return;
    open(false);
    button.focus();
  });
  document.addEventListener("pointerdown", (e) => {
    if (isOpen() && !nav.contains(e.target as Node)) open(false);
  });

  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", measure);
  new ResizeObserver(measure).observe(document.body);
  measure();
}
