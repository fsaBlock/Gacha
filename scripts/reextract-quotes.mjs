import fs from "fs";
import https from "https";

const data = JSON.parse(fs.readFileSync("js/champions.json", "utf8"));
const quotes = JSON.parse(fs.readFileSync("js/quotes.json", "utf8"));

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "lol-gacha/1.0" } }, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve(d));
      })
      .on("error", reject);
  });
}

function pick(text) {
  const start = text.indexOf(";Pick");
  if (start < 0) return "";
  const ban = text.indexOf(";Ban", start);
  const section = text.slice(start, ban > start ? ban : start + 900);
  const quoted = section.match(/''"([^"]+)"/);
  if (quoted) return quoted[1].trim();
  const notes = [...section.matchAll(/''([^']{3,80})''/g)].map((m) => m[1].trim());
  const spoken = notes.find((n) => !/sound effect/i.test(n));
  return spoken || "";
}

const fives = data.champions.filter((c) => c.stars === 5);
const missing = [];
for (let i = 0; i < fives.length; i += 4) {
  await Promise.all(
    fives.slice(i, i + 4).map(async (c) => {
      const page = encodeURIComponent(`${c.name}/Audio`);
      const raw = await get(
        `https://wiki.leagueoflegends.com/en-us/api.php?action=parse&page=${page}&prop=wikitext&format=json&formatversion=2`
      );
      let text = "";
      try {
        text = JSON.parse(raw).parse?.wikitext || "";
      } catch {
        missing.push(c.name);
        return;
      }
      const line = pick(text);
      if (!line) missing.push(c.name);
      else if (/chimes/i.test(line)) quotes[c.key] = "";
      else quotes[c.key] = line;
    })
  );
}
fs.writeFileSync("js/quotes.json", JSON.stringify(quotes, null, 2));
console.log("missing", missing.join(", ") || "none");
console.log("Milio:", quotes.Milio);
console.log("Hecarim:", quotes.Hecarim);
console.log("RekSai:", quotes.RekSai);
