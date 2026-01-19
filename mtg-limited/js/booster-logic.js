// # Play booster formula
// --------------------------------------
// 1–6	Commons	Standard common cards from the main set.
// 7	Common or "The List"	Usually a 7th common, but has a 12.5% (1 in 8) chance of being a card from The List or a Special Guest.
// 8–10	Uncommons	Standard uncommon cards from the main set.
// 11	Main Rare/Mythic	Your guaranteed Rare or Mythic Rare slot. (Mythic odds are approx. 1 in 7).
// 12	Land	Can be a basic land or common dual land. Has a 20% chance of being traditional foil.
// 13	Non-Foil Wildcard	Can be any rarity (Common to Mythic) and any booster-fun treatment.
// 14	Traditional Foil Wildcard	Guaranteed foil card of any rarity.
// 15	Non-Playable Card	65% Token/Ad card, 30% Art card, 5% Art card with gold-foil signature.

const BoosterLogic = {
  createPool() {
    return {
      common: [],
      uncommon: [],
      rare: [],
      mythic: [],
      land: [], // Common duals / non-basics
      basic: [] // Basic lands
    };
  },

  processCards(cards, pool) {
    cards.forEach(card => {
      const type = card.type_line || (card.faces ? card.faces[0].type_line : '');
      const rarity = card.rarity;

      if (type.includes('Basic Land')) {
        pool.basic.push(card);
        return;
      }

      if (rarity === 'common') {
        if (type.includes('Land')) {
          pool.land.push(card);
        } else {
          pool.common.push(card);
        }
      }
      else if (rarity === 'uncommon') pool.uncommon.push(card);
      else if (rarity === 'rare') pool.rare.push(card);
      else if (rarity === 'mythic') pool.mythic.push(card);
    });
  },

  separateBasicLands(cards) {
    const basics = [];
    const others = [];

    cards.forEach(c => {
      const type = c.type_line || (c.faces ? c.faces[0].type_line : '');
      if (type.includes('Basic Land')) {
        basics.push(c);
      } else {
        others.push(c);
      }
    });

    return { basics, others };
  },

  addBasics(pool, basics) {
    if (basics && Array.isArray(basics)) {
      pool.basic.push(...basics);
    }
  },

  getRandomItem(array, rng) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(rng() * array.length)];
  },

  pickN(amount, source, rng) {
    const result = [];
    if (!source || source.length === 0) return result;

    // If we need more than we have, just return what we have (or dupe? usually limited means unique pulls per pack but duplication across packs. 
    // real packs don't duplicate usually. But for simulation if pool is small, unique is better.)
    // Let's stick to unique indices logic if possible, but fallback if not enough.

    if (source.length < amount) {
      for (let i = 0; i < amount; i++) {
        result.push(this.getRandomItem(source, rng));
      }
      return result;
    }

    const indices = new Set();
    while (indices.size < amount) {
      indices.add(Math.floor(rng() * source.length));
    }
    indices.forEach(i => result.push(source[i]));
    return result;
  },

  // 1–6 Commons
  // 7 Common or "The List" (1/8 chance). For now, just Common.
  // 8–10 Uncommons
  // 11 Rare/Mythic
  // 12 Land (Basic or Common Dual)
  // 13 Non-Foil Wildcard
  // 14 Traditional Foil Wildcard (Simulated as random card)

  getTheListOrCommonSlot(pool, rng) {
    // 12.5% chance of List. User said: "Ignore The list... generate 1 common card."
    return this.getRandomItem(pool.common, rng);
  },

  getLandSlot(pool, rng) {
    // 20% chance of Common Non-Basic Land (e.g. Duals)
    const wantCommonLand = rng() < 0.2;

    if (wantCommonLand && pool.land.length > 0) {
      return this.getRandomItem(pool.land, rng);
    }

    // 80% or Fallback: Basic Land
    if (pool.basic.length > 0) {
      return this.getRandomItem(pool.basic, rng);
    }

    return null;
  },

  getWildcardSlot(pool, rng) {
    // "Any rarity". Weighted?
    // Common: ~50%, Uncommon: ~25%, Rare/Mythic: ~10%?
    // Or just pure random across all cards? pure random biases heavily to common.
    // Let's use a rough rarity weight.
    const roll = rng();
    if (roll < 0.05) return this.getRandomItem(pool.mythic, rng) || this.getRandomItem(pool.rare, rng);
    if (roll < 0.15) return this.getRandomItem(pool.rare, rng);
    if (roll < 0.40) return this.getRandomItem(pool.uncommon, rng);
    return this.getRandomItem(pool.common, rng);
  },

  getRareSlot(pool, rng) {
    const hasMythics = pool.mythic.length > 0;
    const isMythic = hasMythics && (rng() < 0.14); // ~1/7

    if (isMythic) {
      return this.getRandomItem(pool.mythic, rng);
    } else {
      if (pool.rare.length > 0) return this.getRandomItem(pool.rare, rng);
      else if (pool.mythic.length > 0) return this.getRandomItem(pool.mythic, rng);
    }
    return null;
  },

  deepCopy(array) {
    return JSON.parse(JSON.stringify(array));
  },

  generatePackData(pool, rng) {
    const pack = [];

    // 1-6: Commons (6)
    pack.push(...this.pickN(6, pool.common, rng));

    // 7: Common/List (1)
    const slot7 = this.getTheListOrCommonSlot(pool, rng);
    if (slot7) pack.push(slot7);

    // 8-10: Uncommons (3)
    pack.push(...this.pickN(3, pool.uncommon, rng));

    // 11: Main Rare/Mythic (1)
    const rare = this.getRareSlot(pool, rng);
    if (rare) pack.push(rare);

    // 12: Land (1)
    const land = this.getLandSlot(pool, rng);
    if (land) pack.push(land);

    // 13: Wildcard (1)
    const wc1 = this.getWildcardSlot(pool, rng);
    if (wc1) pack.push(wc1);

    // 14: Regular Foil Wildcard (1) -> Treated as non-foil wildcard for logic
    const wc2 = this.getWildcardSlot(pool, rng);
    if (wc2) pack.push(wc2);

    return this.deepCopy(pack);
  }
};
