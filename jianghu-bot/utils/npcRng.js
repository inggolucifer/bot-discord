/**
 * Pure Mulberry32 Seeded Pseudo-Random Number Generator for Jianghu Bot V27
 * Deterministic: Identical seed produces identical sequence. Zero Math.random().
 */

function stringToSeed(str) {
  let hash = 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash >>> 0;
}

function makeRng(seed = 123456789) {
  let s = typeof seed === 'number' ? (seed >>> 0) : stringToSeed(seed);
  if (s === 0) s = 123456789;

  return function nextFloat() {
    let t = (s += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rangeInt(rng, min, max) {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  return Math.floor(rng() * (high - low + 1)) + low;
}

function rangeFloat(rng, min, max) {
  return rng() * (max - min) + min;
}

function pickOne(rng, array) {
  if (!array || array.length === 0) return null;
  const idx = Math.floor(rng() * array.length);
  return array[idx];
}

function pickWeighted(rng, items, weightFn = (item) => item.weight || 1) {
  if (!items || items.length === 0) return null;
  let totalWeight = 0;
  for (const item of items) {
    totalWeight += Math.max(0, weightFn(item));
  }
  if (totalWeight <= 0) return pickOne(rng, items);

  let roll = rng() * totalWeight;
  for (const item of items) {
    const w = Math.max(0, weightFn(item));
    if (roll < w) return item;
    roll -= w;
  }
  return items[items.length - 1];
}

function diceRoll(rng, chanceFloat) {
  return rng() < chanceFloat;
}

function shuffle(rng, array) {
  if (!array) return [];
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function hash32(str) {
  return stringToSeed(str);
}

module.exports = {
  makeRng,
  hash32,
  stringToSeed,
  rangeInt,
  rangeFloat,
  pickOne,
  pickWeighted,
  diceRoll,
  shuffle
};
