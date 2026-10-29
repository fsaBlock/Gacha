import https from "https";
const page = encodeURIComponent("Rek'Sai/Audio");
const url = `https://wiki.leagueoflegends.com/en-us/api.php?action=parse&page=${page}&prop=wikitext&format=json&formatversion=2&redirects=1`;
https.get(url, { headers: { "User-Agent": "lol-gacha/1.0" } }, (res) => {
  let d = "";
  res.on("data", (c) => (d += c));
  res.on("end", () => {
    const j = JSON.parse(d);
    const t = j.parse?.wikitext || JSON.stringify(j.error || j).slice(0, 400);
    const i = t.indexOf(";Pick");
    console.log(t.slice(Math.max(0, i), i + 600));
  });
});
