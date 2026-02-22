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
  // Set-specific state
  currentSetCode: null,
  pool: null,
  basicLands: [],
  isDataLoaded: false,

  // Default Configuration (Play Booster)
  rules: [
    { count: 6, name: "Common Slots", pool: { "common": 1 } },
    { count: 1, name: "List/Common Slot", pool: { "common": 7, "spg": 1 } },
    { count: 3, name: "Uncommon Slots", pool: { "uncommon": 1 } },
    { count: 1, name: "Rare/Mythic Slot", pool: { "rare": 7, "mythic": 1 } },
    { count: 1, name: "Land Slot", pool: { "basic": 4, "land": 1 } }, // 80% Basic, 20% Non-Basic Common
    { count: 1, name: "Wildcard Slot", pool: { "common": 60, "uncommon": 25, "rare": 7, "mythic": 1 } },
    { count: 1, name: "Foil Wildcard Slot", pool: { "common": 60, "uncommon": 25, "rare": 7, "mythic": 1 } }
  ],

  setRules(newRules) {
    if (Array.isArray(newRules)) {
      this.rules = newRules;
    }
  },

  async fetchSetCards(setCode, uniqueMode = 'prints') {
    const mainPromise = Scryfall.fetchCards(`set:${setCode} unique:${uniqueMode}`);
    let spgPromise = Promise.resolve([]);

    try {
      const allSets = await Scryfall.fetchAllSets();
      const masterpieceSet = allSets.find(s => s.set_type === "masterpiece" && s.parent_set_code === setCode);

      if (masterpieceSet) {
        spgPromise = Scryfall.fetchCards(`set:${masterpieceSet.code} unique:${uniqueMode}`).catch(() => []);
      } else {
        const setInfo = allSets.find(s => s.code === setCode) || await Scryfall.fetchSet(setCode).catch(() => null);
        if (setInfo && setInfo.released_at) {
          spgPromise = Scryfall.fetchCards(`set:spg date:${setInfo.released_at} unique:${uniqueMode}`).catch(() => []);
        }
      }
    } catch (e) {
      console.warn(`Error figuring out SPG/Masterpiece for ${setCode}`, e);
    }

    const [mainCards, spgCards] = await Promise.all([mainPromise, spgPromise]);
    return { mainCards, spgCards };
  },

  async fetchAndBuildPool(setCode) {
    if (this.isDataLoaded && this.currentSetCode === setCode) {
      return true;
    }

    this.currentSetCode = setCode;
    this.pool = this.createPool();
    this.basicLands = [];
    this.isDataLoaded = false;

    try {
      const { mainCards, spgCards } = await this.fetchSetCards(setCode);

      if (mainCards && mainCards.length > 0) {
        const { basics, others } = this.separateBasicLands(mainCards);
        this.basicLands = basics;
        this.processCards(others, this.pool);
        this.addBasics(this.pool, this.basicLands);

        if (spgCards && spgCards.length > 0) {
          this.pool.spg = this.groupCardsByName(spgCards);
        }

        this.isDataLoaded = true;
        return true;
      }
      return false;
    } catch (e) {
      console.error("Error building booster pool:", e);
      throw e;
    }
  },

  getBasicLands() {
    return this.basicLands || [];
  },

  generatePack(rng) {
    if (!this.isDataLoaded || !this.pool) return [];
    return this.generatePackData(this.pool, rng);
  },

  createPool() {
    return {
      common: [],
      uncommon: [],
      rare: [],
      mythic: [],
      land: [], // Common duals / non-basics
      basic: [], // Basic lands
      spg: [] // Special Guests / The List
    };
  },

  // Helper to group cards by name
  groupCardsByName(cards) {
    const groups = {};
    cards.forEach(c => {
      if (!groups[c.name]) groups[c.name] = [];
      groups[c.name].push(c);
    });
    return Object.values(groups);
  },

  processCards(cards, pool) {
    const commons = [];
    const uncommons = [];
    const rares = [];
    const mythics = [];
    const lands = []; // Non-basic common lands
    const basics = []; // Just in case basics slipped in by mistake

    cards.forEach(card => {
      // Filter out promos (keep only if promo field exists AND is strictly false)
      if (card.promo !== false) return;
      // Filter out meld cards
      if (card.layout === 'meld') return;

      const type = card.type_line || (card.faces ? card.faces[0].type_line : '');
      const rarity = card.rarity;

      if (type.includes('Basic Land')) {
        basics.push(card);
        return;
      }

      if (rarity === 'common') {
        if (type.includes('Land')) {
          lands.push(card);
        } else {
          commons.push(card);
        }
      }
      else if (rarity === 'uncommon') uncommons.push(card);
      else if (rarity === 'rare') rares.push(card);
      else if (rarity === 'mythic') mythics.push(card);
    });

    // Store as Arrays of Groups (Card[][])
    pool.common = this.groupCardsByName(commons);
    pool.uncommon = this.groupCardsByName(uncommons);
    pool.rare = this.groupCardsByName(rares);
    pool.mythic = this.groupCardsByName(mythics);
    pool.land = this.groupCardsByName(lands);
    // Basics handled via addBasics typically
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
      const nonPromos = basics.filter(c => !c.promo);
      pool.basic = this.groupCardsByName(nonPromos);
    }
  },

  getRandomItem(sourceGroups, rng) {
    if (!sourceGroups || sourceGroups.length === 0) return null;
    // 1. Pick a random group (Equal probability per unique card name)
    const group = sourceGroups[Math.floor(rng() * sourceGroups.length)];
    // 2. Pick a random card from that group (Equal probability per variant)
    return group[Math.floor(rng() * group.length)];
  },

  // Helper: Generic Weighted Picker
  // items: array of objects with 'weight' property
  pickWeighted(items, rng) {
    if (!items || items.length === 0) return null;

    let totalWeight = 0;
    items.forEach(o => totalWeight += o.weight);

    let random = rng() * totalWeight;
    for (const item of items) {
      if (random < item.weight) {
        return item;
      }
      random -= item.weight;
    }
    return items[items.length - 1];
  },

  // Helper: Weighted Selection for Pools
  // Inputs: poolConfig object (key: weight), poolData source, RNG
  selectPoolKey(poolConfig, poolData, rng) {
    // Filter out pools that are empty to avoid trying to pick from them
    const validOptions = [];

    for (const [key, weight] of Object.entries(poolConfig)) {
      const w = weight !== undefined ? weight : 1;

      if (poolData[key] && poolData[key].length > 0) {
        validOptions.push({ key, weight: w });
      }
    }

    const selected = this.pickWeighted(validOptions, rng);
    return selected ? selected.key : null;
  },

  deepCopy(array) {
    return JSON.parse(JSON.stringify(array));
  },

  generatePackData(pool, rng) {
    const pack = [];

    this.rules.forEach(rule => {
      // Validate rule structure
      if (!rule.pool || typeof rule.pool !== 'object') {
        console.warn('Invalid rule: missing pool object', rule);
        return;
      }

      for (let i = 0; i < rule.count; i++) {
        // Select which pool to pull from based on map weights
        const poolKey = this.selectPoolKey(rule.pool, pool, rng);

        if (poolKey) {
          const card = this.getRandomItem(pool[poolKey], rng);
          if (card) pack.push(card);
        }
      }
    });

    return this.deepCopy(pack);
  }
};
