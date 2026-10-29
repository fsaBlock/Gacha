import fs from "fs";
const p = "index.html";
let t = fs.readFileSync(p, "utf8");
const a = t.indexOf("<footer");
const b = t.indexOf("</footer>") + "</footer>".length;
const next = `<footer class="site-footer">
      Fan project. League of Legends is a trademark of Riot Games. Champion stories from the
      <a href="https://wiki.leagueoflegends.com/en-us/" target="_blank" rel="noopener">League of Legends Wiki</a>.
      Open this page through a local server.
    </footer>`;
fs.writeFileSync(p, t.slice(0, a) + next + t.slice(b));
