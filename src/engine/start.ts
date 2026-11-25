import { startDecrypt } from "./decrypt";
import { startLightRay } from "./lightray";
import { startEngine } from "./loop";
import { startName } from "./name";
import { startPlates } from "./plates";
import { chosenStyle, loadStyle } from "./styles";
import type { StyleName } from "./types";

startName();
startDecrypt();
startPlates();

let name: StyleName = chosenStyle();
const create = await loadStyle(name).catch(() => {
  // Si ASCII no se pudo descargar, la página sigue con los suaves
  document.documentElement.dataset.planetas = name = "suave";
  return loadStyle(name);
});
const engine = startEngine(name, create);
startLightRay(engine);

// El medidor no va en la versión que se publica: solo en `pnpm dev` y `pnpm movil`
if ((import.meta.env.DEV || import.meta.env.MODE === "movil") && new URLSearchParams(location.search).has("fps")) {
  const { showFps } = await import("./fps");
  showFps(engine);
}
