export const GACHA_CONFIG = {
  PITY_MAX: 80,
  SOFT_PITY_START: 70,
  BASE_FIVE_STAR_RATE: 0.02,
  STORAGE_KEY: "lol_universe_gacha_v1",
};

/** @returns {number} 0–1 probability of 5★ on this pull (before hard pity). */
export function getFiveStarRate(pityBeforePull) {
  const { PITY_MAX, SOFT_PITY_START, BASE_FIVE_STAR_RATE } = GACHA_CONFIG;
  const pullsSinceFive = pityBeforePull;
  if (pullsSinceFive + 1 >= PITY_MAX) return 1;
  if (pullsSinceFive < SOFT_PITY_START) return BASE_FIVE_STAR_RATE;
  const steps = PITY_MAX - SOFT_PITY_START;
  const progress = pullsSinceFive - SOFT_PITY_START + 1;
  const bonus = (1 - BASE_FIVE_STAR_RATE) * (progress / steps);
  return Math.min(1, BASE_FIVE_STAR_RATE + bonus);
}
