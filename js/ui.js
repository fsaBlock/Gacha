import { GACHA_CONFIG } from "./config.js";

const VO_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-choose-vo";
const MATCH_FOUND_SFX =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/sounds/sfx-readycheck-intro.ogg";

function portraitUrl(champion) {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champion.key}_0.jpg`;
}

export class GachaUI {
  /**
   * @param {import('./gacha.js').GachaEngine} engine
   * @param {{ champions: object[] }} data
   */
  constructor(engine, data) {
    this.engine = engine;
    this.champions = data.champions;
    this.muted = false;
    this.busy = false;
    this.audioUnlocked = false;
    this.catalogFilter = "all";

    this.els = {
      pityText: document.getElementById("pity-text"),
      pityFill: document.getElementById("pity-fill"),
      totalPulls: document.getElementById("total-pulls"),
      collectionCount: document.getElementById("collection-count"),
      portal: document.getElementById("portal"),
      summonStage: document.getElementById("summon-stage"),
      summonKicker: document.getElementById("summon-kicker"),
      summonLabel: document.getElementById("summon-label"),
      lore: document.getElementById("lore"),
      lorePortrait: document.getElementById("lore-portrait"),
      loreStars: document.getElementById("lore-stars"),
      loreName: document.getElementById("lore-name"),
      loreTitle: document.getElementById("lore-title"),
      loreBody: document.getElementById("lore-body"),
      overlay: document.getElementById("overlay"),
      overlayContent: document.getElementById("overlay-content"),
      overlayClose: document.getElementById("overlay-close"),
      catalogGrid: document.getElementById("catalog-grid"),
      btnPull1: document.getElementById("btn-pull-1"),
      btnPull10: document.getElementById("btn-pull-10"),
      btnMute: document.getElementById("btn-mute"),
      voPlayer: document.getElementById("vo-player"),
      sfxPull: document.getElementById("sfx-pull"),
    };

    this.els.overlayClose.addEventListener("click", () => this.closeOverlay());
    this.els.overlay.addEventListener("click", (e) => {
      if (e.target === this.els.overlay || e.target.classList.contains("overlay-backdrop")) {
        this.closeOverlay();
      }
    });

    this.els.catalogGrid.addEventListener("click", (e) => {
      const card = e.target.closest("[data-key]");
      if (!card) return;
      this.openLore(this.championByKey(card.dataset.key));
    });
    this.els.overlayContent.addEventListener("click", (e) => {
      const card = e.target.closest("[data-key]");
      if (!card) return;
      e.stopPropagation();
      this.openLore(this.championByKey(card.dataset.key));
    });
    document.getElementById("lore-close").addEventListener("click", () => this.closeLore());
    this.els.lore.addEventListener("click", (e) => {
      if (e.target === this.els.lore || e.target.classList.contains("lore-backdrop")) this.closeLore();
    });

    document.querySelectorAll(".catalog-tabs .tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".catalog-tabs .tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        this.catalogFilter = tab.dataset.filter;
        this.renderCatalog();
      });
    });

    this.els.btnMute.addEventListener("click", () => {
      this.muted = !this.muted;
      this.els.btnMute.textContent = this.muted ? "Sound: Off" : "Sound: On";
      this.els.btnMute.setAttribute("aria-pressed", String(this.muted));
      if (this.muted) {
        this.els.sfxPull.pause();
        this.els.voPlayer.pause();
      }
    });

    this.els.btnPull1.addEventListener("click", () => this.handlePull(1));
    this.els.btnPull10.addEventListener("click", () => this.handlePull(10));

    document.addEventListener(
      "click",
      () => {
        this.audioUnlocked = true;
      },
      { once: true }
    );

    this.updateHud();
    this.renderCatalog();
    this.initParticles();
  }

  updateHud() {
    const { pity, totalPulls, collection } = this.engine.getState();
    this.els.pityText.textContent = `${pity} / ${GACHA_CONFIG.PITY_MAX}`;
    this.els.pityFill.style.width = `${(pity / GACHA_CONFIG.PITY_MAX) * 100}%`;
    this.els.totalPulls.textContent = String(totalPulls);
    this.els.collectionCount.textContent = String(Object.keys(collection).length);
  }

  setBusy(v) {
    this.busy = v;
    this.els.btnPull1.disabled = v;
    this.els.btnPull10.disabled = v;
  }

  async handlePull(count) {
    if (this.busy) return;
    this.setBusy(true);
    this.audioUnlocked = true;

    const results = this.engine.pull(count);
    this.updateHud();
    this.renderCatalog();

    const fives = results.filter((r) => r.stars === 5);
    for (const result of fives) {
      await this.playFiveStarIntro(result.champion);
    }

    if (count === 1) {
      await this.showSingleReveal(results[0]);
    } else {
      await this.showMultiReveal(results);
    }

    this.setBusy(false);
  }

  championByKey(key) {
    return this.champions.find((c) => c.key === key);
  }

  openLore(champion) {
    if (!champion) return;
    this.els.lorePortrait.src = portraitUrl(champion);
    this.els.lorePortrait.alt = champion.name;
    this.els.loreStars.textContent = "★".repeat(champion.stars);
    this.els.loreName.textContent = champion.name;
    this.els.loreTitle.textContent = champion.title;
    this.els.loreBody.textContent = champion.bio || "No story is available for this champion yet.";
    this.els.lore.classList.remove("hidden");
    this.els.lore.setAttribute("aria-hidden", "false");
  }

  closeLore() {
    this.els.lore.classList.add("hidden");
    this.els.lore.setAttribute("aria-hidden", "true");
  }

  cleanQuote(text) {
    return String(text || "")
      .replace(/^['"“”‘’]+|['"“”‘’]+$/g, "")
      .trim();
  }

  async playFiveStarIntro(champion) {
    const stage = this.els.summonStage;
    const quote = this.cleanQuote(champion.quote);
    this.els.summonKicker.textContent = "★★★★★";
    this.els.summonLabel.textContent = quote;
    stage.classList.remove("hidden", "is-playing");
    stage.classList.add("matchfound--5");
    stage.setAttribute("aria-hidden", "false");
    void stage.offsetWidth;
    stage.classList.add("is-playing");
    this.playMatchFoundSound();
    const voice = this.playChampionVoice(champion);
    await Promise.all([this.delay(2800), voice]);
    this.els.voPlayer.pause();
    stage.classList.add("hidden");
    stage.classList.remove("is-playing");
    stage.setAttribute("aria-hidden", "true");
  }

  playMatchFoundSound() {
    if (this.muted) return;
    const audio = this.els.sfxPull;
    audio.src = MATCH_FOUND_SFX;
    audio.volume = 0.9;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  async showSingleReveal(result) {
    if (result.stars === 5) {
      this.playFiveStarFlash();
      this.spawnConfetti(40);
    }
    await this.openRevealOverlay(result);
  }

  async showMultiReveal(results) {
    const fives = results.filter((r) => r.stars === 5);
    if (fives.length) {
      this.playFiveStarFlash();
      this.spawnConfetti(25 + fives.length * 10);
    }

    this.showOverlay();
    this.els.overlay.classList.toggle("overlay--five", fives.length > 0);
    this.els.overlayContent.innerHTML = this.buildMultiHtml(results);
  }

  buildMultiHtml(results) {
    const fiveCount = results.filter((r) => r.stars === 5).length;
    const items = results
      .map((r, i) => {
        const cls = r.stars === 5 ? "multi-item multi-item--5" : "multi-item";
        const stars = r.stars === 5 ? "★★★★★" : "★★★★";
        return `
          <div class="${cls}" data-key="${r.champion.key}" style="animation-delay:${i * 0.05}s">
            <img src="${portraitUrl(r.champion)}" alt="${r.champion.name}" loading="lazy" />
            <span>${stars} ${r.champion.name}</span>
          </div>`;
      })
      .join("");

    return `
      <div class="multi-summary">
        <h3 class="multi-summary-title">Ten summons${fiveCount ? ` · ${fiveCount} five-star${fiveCount > 1 ? "s" : ""}` : ""}</h3>
        <div class="multi-grid">${items}</div>
        <div class="multi-actions">
          <button type="button" class="btn-gacha" id="multi-close-inline">Continue</button>
        </div>
      </div>`;
  }

  buildRevealCard(result) {
    const { champion, stars } = result;
    const starStr = stars === 5 ? "★★★★★" : "★★★★";
    const tier = stars === 5 ? "5" : "4";
    const rays = stars === 5 ? '<div class="five-star-rays"></div>' : "";
    return `
      <div class="reveal-card reveal-card--${tier}" data-key="${champion.key}">
        <div class="reveal-card__inner animate-in">
          ${rays}
          <div class="reveal-card__art">
            <img class="reveal-card__splash" src="${portraitUrl(champion)}" alt="${champion.name}" />
          </div>
          <div class="reveal-card__info">
            <div class="reveal-card__stars">${starStr}</div>
            <h2 class="reveal-card__name">${champion.name}</h2>
            <p class="reveal-card__title">${champion.title}</p>
            <p class="reveal-card__class">${champion.classes}</p>
          </div>
        </div>
      </div>`;
  }

  async openRevealOverlay(result) {
    this.showOverlay();
    this.els.overlay.classList.toggle("overlay--five", result.stars === 5);
    this.els.overlayContent.innerHTML = this.buildRevealCard(result);
    this.playPullSfx(result.stars);
    await this.delay(100);
  }

  showOverlay() {
    this.els.overlay.classList.remove("hidden");
    this.els.overlay.setAttribute("aria-hidden", "false");
  }

  closeOverlay() {
    this.els.overlay.classList.add("hidden");
    this.els.overlay.setAttribute("aria-hidden", "true");
    this.els.overlay.classList.remove("overlay--five");
    this.els.voPlayer.pause();
  }

  playPullSfx(stars) {
    if (this.muted) return;
    const ctx = window.__gachaAudioCtx || (window.__gachaAudioCtx = new AudioContext());
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = stars === 5 ? 880 : 440;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  }

  playChampionVoice(champion) {
    if (this.muted || !this.audioUnlocked) return Promise.resolve();
    const url = champion.voiceUrl || `${VO_BASE}/${champion.id}.ogg`;
    const audio = this.els.voPlayer;
    audio.pause();
    audio.src = url;
    return new Promise((resolve) => {
      const done = () => {
        audio.removeEventListener("ended", done);
        audio.removeEventListener("error", done);
        resolve();
      };
      audio.addEventListener("ended", done);
      audio.addEventListener("error", done);
      audio.play().catch(done);
    });
  }

  playFiveStarFlash() {
    const el = document.createElement("div");
    el.className = "five-star-flash";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  spawnConfetti(n) {
    for (let i = 0; i < n; i++) {
      const p = document.createElement("div");
      p.className = "confetti-piece";
      p.style.left = `${Math.random() * 100}vw`;
      p.style.top = `-10px`;
      p.style.background = Math.random() > 0.5 ? "#ffd700" : "#c8aa6e";
      p.style.animationDelay = `${Math.random() * 0.3}s`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1500);
    }
  }

  renderCatalog() {
    const { collection } = this.engine.getState();
    let list = this.champions;
    if (this.catalogFilter === "5") list = list.filter((c) => c.stars === 5);
    if (this.catalogFilter === "4") list = list.filter((c) => c.stars === 4);

    this.els.catalogGrid.innerHTML = list
      .map((c) => {
        const owned = collection[c.key] > 0;
        return `
        <article class="catalog-card ${owned ? "catalog-card--owned" : ""}" data-key="${c.key}" title="${c.title}">
          <img src="${portraitUrl(c)}" alt="${c.name}" loading="lazy" />
          <div class="catalog-card__meta">
            <p class="catalog-card__name">${c.name}</p>
            <span class="catalog-card__stars">${"★".repeat(c.stars)}${"☆".repeat(5 - c.stars)}</span>
          </div>
        </article>`;
      })
      .join("");
  }

  initParticles() {
    const canvas = document.getElementById("particles");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const dots = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      vy: Math.random() * 0.3 + 0.05,
      vx: (Math.random() - 0.5) * 0.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.y > canvas.height) d.y = 0;
        if (d.x < 0) d.x = canvas.width;
        if (d.x > canvas.width) d.x = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(200, 170, 110, 0.35)";
        ctx.fill();
      }
      requestAnimationFrame(draw);
    };
    draw();
  }

  delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
