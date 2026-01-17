const BoosterLogic = {
  createPool() {
    return {
      common: [],
      uncommon: [],
      rare: [],
      mythic: [],
      land: []
    };
  },

  processCards(cards, pool) {
    cards.forEach(card => {
      // Basic categorization
      if (['common'].includes(card.rarity)) pool.common.push(card);
      else if (['uncommon'].includes(card.rarity)) pool.uncommon.push(card);
      else if (['rare'].includes(card.rarity)) pool.rare.push(card);
      else if (['mythic'].includes(card.rarity)) pool.mythic.push(card);
      // Land? Note: -type:basic filter is applied in fetch, but we might want to check for non-basic lands if needed.
      // Currently logic just checks rarity.
    });
  },

  getRandomItem(array, rng) {
    if (array.length === 0) return null;
    return array[Math.floor(rng() * array.length)];
  },

  pickN(amount, source, rng) {
    const result = [];
    if (source.length < amount) {
      for (let i = 0; i < amount; i++) result.push(this.getRandomItem(source, rng));
      return result;
    }

    const indices = new Set();
    while (indices.size < amount) {
      indices.add(Math.floor(rng() * source.length));
    }
    indices.forEach(i => result.push(source[i]));
    return result;
  },

  getRareSlot(pool, rng) {
    const hasMythics = pool.mythic.length > 0;
    const isMythic = hasMythics && (rng() < 0.125); // 1/8

    if (isMythic) {
      return this.getRandomItem(pool.mythic, rng);
    } else {
      if (pool.rare.length > 0) return this.getRandomItem(pool.rare, rng);
      else if (pool.mythic.length > 0) return this.getRandomItem(pool.mythic, rng); // Fallback
    }
    return null;
  },

  generatePackData(pool, rng) {
    const pack = [];
    // Slot 1: Rare/Mythic
    const rare = this.getRareSlot(pool, rng);
    if (rare) pack.push(rare);

    // Slot 2-4: Uncommons (3)
    pack.push(...this.pickN(3, pool.uncommon, rng));

    // Slot 5-14: Commons (10)
    pack.push(...this.pickN(10, pool.common, rng));

    return pack;
  }
};
