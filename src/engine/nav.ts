/** Marca en qué sección está la pantalla y abre el menú en celular. Solo trabaja al desplazarse. */
export function startNav(): void {
  const nav = document.querySelector<HTMLElement>("[data-carta]");
  const button = nav?.querySelector("button");
  const angle = nav?.querySelector<HTMLElement>("[data-angulo]");
  if (!nav || !button || !angle) return;
  const links = [...nav.querySelectorAll<HTMLAnchorElement>("a")];
  const sections = links.map((a) => document.querySelector<HTMLElement>(a.hash));

  let tops: number[] = [];
  let active = 0;
  let raf = 0;
  let hush = 0;

  function measure(): void {
    tops = sections.map((el) => (el ? el.getBoundingClientRect().top + scrollY : 0));
    request();
  }

  function update(): void {
    raf = 0;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const progress = Math.min(1, Math.max(0, scrollY / max));
    // Una sección manda desde que llega al 40 % de la pantalla (al principio de la página, menos)
    const line = scrollY + innerHeight * 0.4 * Math.min(1, scrollY / (innerHeight * 0.5));
    let i = 0;
    while (i + 1 < tops.length && tops[i + 1] <= line) i++;
    let position = i;
    if (i + 1 < tops.length) position += Math.max(0, (line - tops[i]) / (tops[i + 1] - tops[i]));
    if (progress > 0.995) position = i = tops.length - 1;

    const theta = progress * 360;
    nav!.style.setProperty("--giro", `${theta.toFixed(1)}deg`);
    nav!.style.setProperty("--lugar", Math.min(tops.length - 1, position).toFixed(3));
    angle!.textContent = `θ ${theta.toFixed(0).padStart(3, "0")}°`;
    nav!.toggleAttribute("data-arriba", scrollY < innerHeight * 0.35);
    if (i === active) return;
    links[active].removeAttribute("aria-current");
    links[i].setAttribute("aria-current", "location");
    active = i;
    // El nombre de la sección se asoma un momento
    nav!.toggleAttribute("data-avisa", true);
    clearTimeout(hush);
    hush = window.setTimeout(() => nav!.removeAttribute("data-avisa"), 1800);
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
  for (const a of links) a.addEventListener("click", () => open(false));
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
