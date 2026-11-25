/**
 * Trazos de la órbita: sus ejes, sus focos y los dos segmentos que la construyen.
 * En una elipse, las distancias de un punto a los dos focos siempre suman lo mismo: r₁ + r₂ = 2a.
 */
export class OrbitPlate {
  private readonly svg: SVGSVGElement | null;
  private readonly part: (name: string) => SVGElement | null;
  private c = 0;
  private cl = 1;
  private sl = 0;

  constructor(stage: HTMLElement) {
    const svg = stage.querySelector<SVGSVGElement>("[data-trazos]");
    this.svg = svg;
    if (svg) {
      svg.innerHTML =
        '<g data-t="ejes"><path data-t="lineas"/><path data-t="focos"/>' +
        '<text data-t="f1" text-anchor="middle">F₁</text><text data-t="f2" text-anchor="middle">F₂</text>' +
        '<text data-t="o">O</text><text data-t="a">a</text></g>' +
        '<path class="radios" data-t="radios"/><text data-t="nota" text-anchor="end"/>';
    }
    this.part = (name) => svg?.querySelector<SVGElement>(`[data-t="${name}"]`) ?? null;
  }

  /** `rx` y `ry` son los semiejes; `lean`, la inclinación. */
  measure(w: number, h: number, cy: number, rx: number, ry: number, lean: number): void {
    this.svg?.setAttribute("viewBox", `${-w / 2} ${-cy} ${w} ${h}`);
    this.cl = Math.cos(lean);
    this.sl = Math.sin(lean);
    this.c = Math.sqrt(Math.max(0, rx * rx - ry * ry));
    let axes = `M${-rx - 24} 0H${rx + 24}M0 ${-ry - 24}V${ry + 24}`;
    const step = rx / 10;
    for (let i = -10; i <= 10; i++) axes += `M${i * step} ${i % 5 ? -2.5 : -5}v${i % 5 ? 5 : 10}`;
    for (let i = -2; i <= 2; i++) axes += `M-2.5 ${(i * ry) / 2}h5`;
    const { c } = this;
    const turn = `rotate(${(lean * 180) / Math.PI})`;
    this.part("ejes")?.setAttribute("transform", turn);
    this.part("lineas")?.setAttribute("d", axes);
    this.part("focos")?.setAttribute("d", `M${-c - 5} 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0M${c - 5} 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0`);
    for (const [name, x, y] of [["f1", -c, 20], ["f2", c, 20], ["o", 7, -7], ["a", rx / 2, -8]] as const) {
      this.part(name)?.setAttribute("x", String(x));
      this.part(name)?.setAttribute("y", String(y));
    }
    const note = this.part("nota");
    note?.setAttribute("x", String(w / 2 - 24));
    note?.setAttribute("y", String(h - cy - 6));
  }

  /** Posición y ángulo del planeta elegido. */
  update(x: number, y: number, angle: number): void {
    const fx = this.c * this.cl;
    const fy = this.c * this.sl;
    const at = `${x.toFixed(1)} ${y.toFixed(1)}`;
    this.part("radios")?.setAttribute("d", `M${(-fx).toFixed(1)} ${(-fy).toFixed(1)}L${at}L${fx.toFixed(1)} ${fy.toFixed(1)}`);
    // El ángulo se mide como en geometría: desde la derecha y hacia arriba
    const deg = Math.round((((-angle * 180) / Math.PI) % 360) + 360) % 360;
    const note = this.part("nota");
    if (note) note.textContent = `r₁ + r₂ = 2a · θ ${String(deg).padStart(3, "0")}°`;
  }
}
