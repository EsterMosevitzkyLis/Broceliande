// Seeded PRNG (spec §3.6). All gameplay randomness goes through createRng().

// mulberry32: small, fast, good enough for gameplay. Returns floats in [0, 1).
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed) {
  const next = mulberry32(seed);
  return {
    seed,
    next,
    // Float in [min, max)
    range(min, max) {
      return min + next() * (max - min);
    },
    // Integer in [min, max], inclusive
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
  };
}

// Only used to *choose* a seed when DEBUG_SEED is null; never for gameplay.
export function makeRandomSeed() {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
