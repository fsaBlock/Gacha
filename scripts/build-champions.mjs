import fs from "fs";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wikiPath =
  "C:/Users/usEr/.cursor/projects/c-Users-usEr-Downloads-Test-Gacha/agent-tools/17496196-6a43-4613-8c23-caa7e46f47fd.txt";

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(d));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

function parseWikiLine(line) {
  if (!line.startsWith("| An icon")) return null;
  const parts = line.split("|").map((s) => s.trim());
  if (parts.length < 7) return null;
  const cell = parts[1].replace(/^An icon representing /, "");
  const dup = cell.match(/^(.+?) \1(?: (.*))?$/);
  if (!dup) return null;
  const name = dup[1].trim();
  const title = (dup[2] || "").trim();
  const classes = parts[2];
  const be = parseInt(parts[5], 10);
  const rp = parseInt(parts[6], 10);
  if (Number.isNaN(be) || Number.isNaN(rp)) return null;
  return { name, title, classes, be, rp };
}

const WIKI_TO_DD = {
  "Nunu & Willump": "Nunu",
  "Dr. Mundo": "DrMundo",
  "Jarvan IV": "JarvanIV",
  "Miss Fortune": "MissFortune",
  "Master Yi": "MasterYi",
  "Twisted Fate": "TwistedFate",
  "Tahm Kench": "TahmKench",
  "Renata Glasc": "Renata",
  "Aurelion Sol": "AurelionSol",
  "Lee Sin": "LeeSin",
  "Xin Zhao": "XinZhao",
};

function findDdChamp(ddData, wikiName) {
  const candidates = [wikiName, WIKI_TO_DD[wikiName]].filter(Boolean);
  for (const c of Object.values(ddData)) {
    for (const cand of candidates) {
      if (c.name === cand || c.id === cand) return c;
      if (c.name.toLowerCase() === cand.toLowerCase()) return c;
    }
  }
  for (const c of Object.values(ddData)) {
    if (c.name.toLowerCase() === wikiName.toLowerCase()) return c;
  }
  return null;
}

const versions = await fetchJson(
  "https://ddragon.leagueoflegends.com/api/versions.json"
);
const ver = versions[0];
const dd = await fetchJson(
  `https://ddragon.leagueoflegends.com/cdn/${ver}/data/en_US/champion.json`
);

const wikiText = fs.readFileSync(wikiPath, "utf8");
const lines = wikiText.split("\n");
const champions = [];
const missing = [];

for (const line of lines) {
  const row = parseWikiLine(line);
  if (!row) continue;
  const ddChamp = findDdChamp(dd.data, row.name);
  if (!ddChamp) {
    missing.push(row.name);
    continue;
  }
  const key = ddChamp.id;
  const id = parseInt(ddChamp.key, 10);
  const stars = row.rp >= 880 ? 5 : 4;
  champions.push({
    id,
    key,
    name: ddChamp.name,
    title: ddChamp.title,
    classes: row.classes,
    rp: row.rp,
    be: row.be,
    stars,
    splashUrl: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${key}_0.jpg`,
    iconUrl: `https://ddragon.leagueoflegends.com/cdn/${ver}/img/champion/${key}.png`,
    voiceUrl: `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-choose-vo/${id}.ogg`,
  });
}

champions.sort((a, b) => a.name.localeCompare(b.name));

const outDir = path.join(__dirname, "../js");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "champions.json"),
  JSON.stringify({ version: ver, champions }, null, 2)
);

console.log(`Generated ${champions.length} champions (DD ${ver})`);
console.log(
  `5★: ${champions.filter((c) => c.stars === 5).length}, 4★: ${champions.filter((c) => c.stars === 4).length}`
);
if (missing.length) console.warn("Missing:", missing.join(", "));
