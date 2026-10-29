import fs from "fs";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "js/champions.json"), "utf8"));

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "lol-gacha" } }, (res) => {
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

const SLUG = {
  MonkeyKing: "wukong",
  Renata: "renata-glasc",
};

async function quoteFor(champ) {
  const slug = SLUG[champ.key] || champ.key.toLowerCase();
  const url = `https://universe-meeps.leagueoflegends.com/v1/en_us/champions/${slug}/index.json`;
  const res = await get(url);
  if (res.status !== 200) return { key: champ.key, quote: "", status: res.status, slug };
  const json = JSON.parse(res.body);
  const quote = (json?.champion?.biography?.quote || "").replace(/[“”"]/g, "").trim();
  return { key: champ.key, quote, status: 200, slug };
}

const fives = data.champions.filter((c) => c.stars === 5);
const quotes = {};
const missing = [];
const batch = 8;
for (let i = 0; i < fives.length; i += batch) {
  const chunk = fives.slice(i, i + batch);
  const rows = await Promise.all(chunk.map(quoteFor));
  for (const row of rows) {
    if (row.quote) quotes[row.key] = row.quote;
    else missing.push(`${row.key} (${row.status} ${row.slug})`);
  }
  console.log(`fetched ${Math.min(i + batch, fives.length)}/${fives.length}`);
}

fs.writeFileSync(path.join(root, "js/quotes.json"), JSON.stringify(quotes, null, 2));
console.log("quotes", Object.keys(quotes).length, "missing", missing.join(", ") || "none");
