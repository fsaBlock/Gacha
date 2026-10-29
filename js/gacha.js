import { GACHA_CONFIG, getFiveStarRate } from "./config.js";

function loadState() {
  try {
    const raw = localStorage.getItem(GACHA_CONFIG.STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

function defaultState() {
  return {
    pity: 0,
    totalPulls: 0,
    collection: {},
    history: [],
  };
}

function saveState(state) {
  localStorage.setItem(GACHA_CONFIG.STORAGE_KEY, JSON.stringify(state));
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollOne(pools, pityBefore) {
  const forceFive = pityBefore + 1 >= GACHA_CONFIG.PITY_MAX;
  let stars = 5;
  if (!forceFive) {
    const rate = getFiveStarRate(pityBefore);
    stars = Math.random() < rate ? 5 : 4;
  }
  const pool = stars === 5 ? pools.five : pools.four;
  const champion = pickRandom(pool);
  return { champion, stars, forceFive };
}

export class GachaEngine {
  /** @param {{ champions: import('./champions.json').Champion[] }} data */
  constructor(data) {
    this.champions = data.champions;
    this.pools = {
      four: this.champions.filter((c) => c.stars === 4),
      five: this.champions.filter((c) => c.stars === 5),
    };
    this.state = loadState();
  }

  getPity() {
    return this.state.pity;
  }

  getState() {
    return this.state;
  }

  /** @param {number} count */
  pull(count = 1) {
    const results = [];
    for (let i = 0; i < count; i++) {
      const pityBefore = this.state.pity;
      const { champion, stars, forceFive } = rollOne(this.pools, pityBefore);
      this.state.pity = stars === 5 ? 0 : pityBefore + 1;
      this.state.totalPulls += 1;
      const key = champion.key;
      this.state.collection[key] = (this.state.collection[key] || 0) + 1;
      const entry = {
        champion,
        stars,
        forceFive,
        pityAfter: this.state.pity,
        at: Date.now(),
      };
      results.push(entry);
      this.state.history.unshift(entry);
    }
    this.state.history = this.state.history.slice(0, 50);
    saveState(this.state);
    return results;
  }

  resetPityForTest(value) {
    this.state.pity = value;
    saveState(this.state);
  }
}
