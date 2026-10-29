import { GachaEngine } from "./gacha.js";
import { GachaUI } from "./ui.js";
import { GACHA_CONFIG } from "./config.js";

async function loadChampionData() {
  const res = await fetch("./js/champions.json");
  if (!res.ok) throw new Error("Failed to load champions.json");
  return res.json();
}

function showLoadError(err) {
  const main = document.querySelector(".gacha-stage");
  if (!main) return;
  main.innerHTML = `
    <p style="color:#f0e6d2;padding:2rem">
      Could not load champion data: ${err.message}<br><br>
      Open this folder with a local server, for example<br>
      <code>npx --yes serve .</code>
    </p>`;
}

async function main() {
  try {
    const data = await loadChampionData();
    try {
      const quotesRes = await fetch("./js/quotes.json");
      if (quotesRes.ok) {
        const quotes = await quotesRes.json();
        for (const champ of data.champions) {
          if (quotes[champ.key]) champ.quote = quotes[champ.key];
        }
      }
      const biosRes = await fetch("./js/bios.json");
      if (biosRes.ok) {
        const bios = await biosRes.json();
        for (const champ of data.champions) {
          if (bios[champ.key]) champ.bio = bios[champ.key];
        }
      }
    } catch {
      /* extra data is optional */
    }
    const engine = new GachaEngine(data);
    const ui = new GachaUI(engine, data);

    document.getElementById("overlay")?.addEventListener("click", (e) => {
      if (e.target.id === "multi-close-inline") ui.closeOverlay();
    });

    document.body.addEventListener("click", (e) => {
      if (e.target.id === "multi-close-inline") ui.closeOverlay();
    });

    if (new URLSearchParams(location.search).get("testPity") === "79") {
      engine.resetPityForTest(79);
      ui.updateHud();
    }

    window.__lolGacha = { engine, ui, config: GACHA_CONFIG };
  } catch (err) {
    showLoadError(err);
  }
}

main();
