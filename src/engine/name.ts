import { follow } from "./pointer";

/** Las letras del nombre reaccionan al cursor: engordan (minimalista) o se deforman (retro). */
export function startName(): void {
  const title = document.querySelector<HTMLElement>("#nombre");
  const stage = title?.closest<HTMLElement>(".hero");
  if (!title || !stage) return;
  const letters = [...title.querySelectorAll<HTMLElement>("[data-letra]")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  let x = 0;
  let y = 0;
  let raf = 0;
  const apply = () => {
    raf = 0;
    const width = stage.clientWidth || 1;
    const retro = document.documentElement.dataset.tipo === "retro";
    // Primero se mide todo y después se escribe, para no recalcular la página por cada letra
    const near = letters.map((el) => {
      const q = el.getBoundingClientRect();
      const d = Math.hypot(x - q.left - q.width / 2, y - q.top - q.height / 2) / width;
      return Math.max(0, 1 - d / 0.16);
    });
    letters.forEach((el, i) => {
      const n = near[i];
      if (retro) {
        el.style.fontVariationSettings = `"BLED" ${Math.round(n * 26)}, "SCAN" ${Math.round(2 - n * 34)}`;
      } else {
        el.style.fontWeight = String(Math.round(600 + 300 * n));
      }
    });
  };
  const clear = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    for (const el of letters) {
      el.style.fontWeight = "";
      el.style.fontVariationSettings = "";
    }
  };

  let off = 0;
  follow(stage, {
    move(cx, cy) {
      if (reduced.matches) return;
      clearTimeout(off);
      x = cx;
      y = cy;
      raf ||= requestAnimationFrame(apply);
    },
    end(touch) {
      clearTimeout(off);
      off = window.setTimeout(clear, touch ? 500 : 0);
    },
  });
  new MutationObserver(clear).observe(document.documentElement, { attributeFilter: ["data-tipo"] });
}
