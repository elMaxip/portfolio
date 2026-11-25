import { glyphFontReady, startEngine } from "./loop";
import { startName } from "./name";

startName();
await glyphFontReady();
const engine = startEngine();

if (new URLSearchParams(location.search).has("fps")) {
  const { showFps } = await import("./fps");
  showFps(engine);
}
