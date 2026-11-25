const POOL = "01<>#$%&*+=_@";
/** No ocupa espacio y prohíbe cortar la línea: entre signos como %$ se cortaría y el texto saltaría. */
const JOINER = "⁠";

/** El texto a medio descifrar: cada letra pendiente es un signo al azar. */
function scramble(run: Run, p: number): string {
  let out = "";
  run.chars.forEach((c, i) => {
    if (c === " ") {
      out += c;
      return;
    }
    if (i > 0 && run.chars[i - 1] !== " ") out += JOINER;
    out += p < run.at[i] ? POOL[Math.floor(Math.random() * POOL.length)] : c;
  });
  return out;
}

interface Run {
  text: string;
  chars: string[];
  /** Momento en que se fija cada letra, de 0 a 1. */
  at: number[];
  start: number;
  ms: number;
  painted: number;
}

/**
 * Textos que se descifran de izquierda a derecha. Solo con letra retro, que tiene ancho fijo.
 * Se aplica a textos con aria-hidden: los lectores de pantalla reciben el texto real.
 */
export function startDecrypt(): void {
  const html = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const letters = document.querySelectorAll<HTMLElement>("[data-letra]");
  const texts = document.querySelectorAll<HTMLElement>("[data-decrypt]");
  const runs = new Map<Text, Run>();
  let raf = 0;

  const isRetro = () => html.dataset.tipo === "retro";

  function frame(now: number): void {
    raf = 0;
    for (const [node, run] of runs) {
      const p = (now - run.start) / run.ms;
      if (p >= 1) {
        node.data = run.text;
        runs.delete(node);
      } else if (now - run.painted > 45) {
        run.painted = now;
        node.data = scramble(run, p);
      }
    }
    if (runs.size) raf = requestAnimationFrame(frame);
  }

  function decrypt(el: HTMLElement, ms: number): void {
    const node = el.firstChild;
    if (!(node instanceof Text)) return;
    const text = runs.get(node)?.text ?? node.data;
    const chars = [...text];
    const at = chars.map((_, i) => Math.min(1, ((i + 1) / chars.length) * 0.85 + Math.random() * 0.15));
    runs.set(node, { text, chars, at, start: performance.now(), ms, painted: 0 });
    raf ||= requestAnimationFrame(frame);
  }

  function restore(): void {
    for (const [node, run] of runs) node.data = run.text;
    runs.clear();
  }

  const seen = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting || !isRetro()) continue;
        const el = e.target as HTMLElement;
        seen.unobserve(el);
        decrypt(el, Math.max(800, Number(el.dataset.decrypt)));
      }
    },
    { threshold: 0.6 },
  );

  function spell(): void {
    seen.disconnect();
    if (!isRetro() || reduced.matches) {
      restore();
      return;
    }
    letters.forEach((el, i) => decrypt(el, 700 + i * 110));
    for (const el of texts) seen.observe(el);
  }

  new MutationObserver(spell).observe(html, { attributeFilter: ["data-tipo"] });
  reduced.addEventListener("change", spell);
  spell();
}
