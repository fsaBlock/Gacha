import fs from "fs";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "js/champions.json"), "utf8"));

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "lol-universe-gacha/1.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          get(res.headers.location).then(resolve, reject);
          return;
        }
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      })
      .on("error", reject);
  });
}

function extractPick(wikitext) {
  const start = wikitext.indexOf(";Pick");
  if (start < 0) return "";
  const ban = wikitext.indexOf(";Ban", start);
  const section = wikitext.slice(start, ban > start ? ban : start + 1000);
  const quoted = section.match(/''"([^"]+)"''/);
  if (quoted) return quoted[1].trim();
  const curly = section.match(/“([^”]+)”/);
  return curly ? curly[1].trim() : "";
}

async function mapPool(list, size, fn) {
  const out = [];
  for (let i = 0; i < list.length; i += size) {
    const chunk = await Promise.all(list.slice(i, i + size).map(fn));
    out.push(...chunk);
    console.log(`${out.length}/${list.length}`);
  }
  return out;
}

const bios = {};
await mapPool(data.champions, 10, async (c) => {
  const url = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champions/${c.id}.json`;
  const res = await get(url);
  if (res.status !== 200) {
    bios[c.key] = "";
    return;
  }
  const json = JSON.parse(res.body);
  bios[c.key] = (json.shortBio || "").trim();
});

const quotes = JSON.parse(fs.readFileSync(path.join(root, "js/quotes.json"), "utf8"));
const missing = [];
const fives = data.champions.filter((c) => c.stars === 5);
await mapPool(fives, 4, async (c) => {
  const page = encodeURIComponent(`${c.name}/Audio`);
  const url = `https://wiki.leagueoflegends.com/en-us/api.php?action=parse&page=${page}&prop=wikitext&format=json&formatversion=2`;
  const res = await get(url);
  if (res.status !== 200) {
    missing.push(`${c.key} http ${res.status}`);
    return;
  }
  let json;
  try {
    json = JSON.parse(res.body);
  } catch {
    missing.push(`${c.key} bad json`);
    return;
  }
  const text = json?.parse?.wikitext || "";
  const pick = extractPick(text);
  if (pick) quotes[c.key] = pick;
  else missing.push(c.key);
});

fs.writeFileSync(path.join(root, "js/bios.json"), JSON.stringify(bios, null, 2));
fs.writeFileSync(path.join(root, "js/quotes.json"), JSON.stringify(quotes, null, 2));
const bioCount = Object.values(bios).filter(Boolean).length;
console.log(`bios ${bioCount}, missing quotes: ${missing.join(", ") || "none"}`);
console.log("Ahri", quotes.Ahri);
