/**
 * Simple Seeded Random Number Generator
 * Uses Mulberry32 algorithm
 */
const RNG = {
  create(seed) {
    // If seed is a string, hash it to a number
    if (typeof seed === 'string') {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = Math.imul(31, hash) + seed.charCodeAt(i) | 0;
      }
      seed = hash;
    }

    // Ensure seed is an integer
    let s = seed >>> 0;

    return function () {
      let t = s += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  },

  // Generate a random seed string
  generateSeed() {
    return Math.random().toString(36).substring(2, 10);
  }
};
