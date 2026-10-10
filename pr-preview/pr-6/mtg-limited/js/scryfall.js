/**
 * scryfall.js
 * Centralized logic for interacting with the Scryfall API.
 *
 * Results are cached in a two-tier store (in-memory Map + localStorage)
 * so repeat visits, new tabs, and browser restarts don't re-hit the
 * Scryfall API. Card and set data is immutable once released, so entries
 * live for 24h (TTL checked on read); spoiler season gets fresh data at
 * most once a day. localStorage outlives the tab, unlike sessionStorage,
 * and the pruned card/set shapes (PR A) keep entries small enough for
 * its ~5 MB quota; on quota pressure the oldest entries are evicted.
 */

const Scryfall = {
  // ---- Ephemeral result cache -------------------------------------------
  CACHE_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
  CACHE_PREFIX: 'scryfall-cache-v3:',
  LEGACY_PREFIXES: ['scryfall-cache-v2:', 'scryfall-cache-v1:'],
  _memoryCache: new Map(),

  /**
   * Read a cached value. Returns a deep clone so callers can't mutate the
   * cached copy, or null on miss/expiry.
   */
  _cacheGet(key) {
    const now = Date.now();
    const mem = this._memoryCache.get(key);
    if (mem && now - mem.ts < this.CACHE_TTL_MS) {
      return structuredClone(mem.value);
    }
    try {
      const raw = localStorage.getItem(this.CACHE_PREFIX + key);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      if (now - entry.ts > this.CACHE_TTL_MS) {
        localStorage.removeItem(this.CACHE_PREFIX + key);
        return null;
      }
      this._memoryCache.set(key, entry); // promote to memory tier
      return structuredClone(entry.value);
    } catch (e) {
      return null; // storage unavailable or corrupt entry
    }
  },

  /**
   * Store a value in both cache tiers. localStorage may throw on quota
   * (many cached sets) or when blocked; on quota pressure, evict the
   * oldest cache entries and retry once, else fall back to memory-only.
   */
  _cacheSet(key, value) {
    const entry = { ts: Date.now(), value };
    this._memoryCache.set(key, entry);
    try {
      localStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(entry));
    } catch (e) {
      try {
        this._evictOldest();
        localStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(entry));
      } catch (e2) {
        console.warn('Scryfall cache: localStorage unavailable, memory-only.', e2);
      }
    }
  },

  /** Remove the oldest half of this cache's localStorage entries. */
  _evictOldest() {
    const entries = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this.CACHE_PREFIX)) {
        let ts = 0;
        try { ts = JSON.parse(localStorage.getItem(k)).ts || 0; } catch (e) { /* corrupt: evict first */ }
        entries.push({ k, ts });
      }
    }
    entries.sort((a, b) => a.ts - b.ts);
    const n = Math.max(1, Math.ceil(entries.length / 2));
    entries.slice(0, n).forEach(e => localStorage.removeItem(e.k));
  },

  /** Clear all cached Scryfall responses from both tiers, plus legacy
   *  sessionStorage entries left by older cache versions. */
  clearCache() {
    this._memoryCache.clear();
    const sweep = (storage, prefixes) => {
      try {
        const keys = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k && prefixes.some(p => k.startsWith(p))) keys.push(k);
        }
        keys.forEach(k => storage.removeItem(k));
      } catch (e) { /* storage unavailable */ }
    };
    sweep(localStorage, [this.CACHE_PREFIX]);
    sweep(sessionStorage, this.LEGACY_PREFIXES);
  },

  /**
   * Generic paginated fetch helper.
   * @param {string} initialUrl - The URL to start fetching from.
   * @param {Function} onData - Callback function to handle the 'data' array from each page.
   * @returns {Promise<Object>} The final response JSON object (or null if 404).
   */
  async fetchPaginated(initialUrl, onData) {
    let url = initialUrl;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.data && onData) {
        onData(data.data);
      }

      hasMore = data.has_more;
      if (hasMore) {
        url = data.next_page;
      }
    }
    return 200;
  },

  /**
   * Reduce a Scryfall set object to the fields the pages read
   * (code/name/icon/released_at/set_type/card_count/parent_set_code).
   * The /sets listing is 1,056 objects / ~660 KB raw; slimmed it is
   * ~216 KB (-67%), and this is the copy retained by AppController and
   * the cache tiers for the page's lifetime.
   */
  _slimSet(set) {
    const SET_FIELDS = ['code', 'name', 'icon_svg_uri', 'released_at', 'set_type', 'card_count', 'parent_set_code'];
    const out = {};
    for (const f of SET_FIELDS) {
      if (set[f] !== undefined) out[f] = set[f];
    }
    return out;
  },

  /**
   * Fetch a single set's information from Scryfall.
   * @param {string} setCode
   * @returns {Promise<Object>} The set object.
   */
  async fetchSet(setCode) {
    const key = `set:${setCode.toLowerCase()}`;
    const cached = this._cacheGet(key);
    if (cached) return cached;

    const url = `https://api.scryfall.com/sets/${setCode}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    const set = await response.json();
    const slim = Scryfall._slimSet(set);
    this._cacheSet(key, slim);
    return slim;
  },

  /**
   * Fetch all sets from Scryfall.
   * @returns {Promise<Array>} Array of set objects.
   */
  async fetchAllSets() {
    const key = 'sets:all';
    const cached = this._cacheGet(key);
    if (cached) return cached;

    let allSets = [];
    try {
      await this.fetchPaginated('https://api.scryfall.com/sets/', (data) => {
        allSets = allSets.concat(data);
      });
      const filtered = allSets.filter(set => set.card_count > 0).map(set => Scryfall._slimSet(set));
      this._cacheSet(key, filtered);
      return filtered;
    } catch (error) {
      console.error("Error fetching sets:", error);
      throw error;
    }
  },

  /**
   * Fetch all cards matching a query.
   * Handles pagination automatically.
   * @param {string} query - Scryfall search query string.
   * @returns {Promise<Array>} Array of card objects.
   */
  async fetchCards(query) {
    const key = `cards:${query}`;
    const cached = this._cacheGet(key);
    if (cached) return cached;

    let allCards = [];
    const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`;

    try {
      await this.fetchPaginated(url, (data) => {
        const parsed = data.map(Scryfall.parseCardData).filter(c => c !== null);
        allCards = allCards.concat(parsed);
      });

      // Sort by collector number
      Scryfall.sortByCollectorNumber(allCards);

      this._cacheSet(key, allCards);
      return allCards;

    } catch (error) {
      console.error("Error fetching cards:", error);
      throw error;
    }
  },

  /**
   * Sorts an array of cards by collector number in place.
   * @param {Array} cards - Array of card objects
   * @returns {Array} The sorted array
   */
  sortByCollectorNumber(cards) {
    return cards.sort((a, b) => {
      const setA = (a.set || "").toLowerCase();
      const setB = (b.set || "").toLowerCase();
      if (setA !== setB) {
        return setA.localeCompare(setB);
      }
      const numA = (a.collector_number || "0").toString();
      const numB = (b.collector_number || "0").toString();
      return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
    });
  },

  /**
   * normalize card data structure, handling double-faced cards etc.
   */
  parseCardData(cardData) {
    try {
      // Keep only the fields the mtg-limited pages actually read. A raw
      // Scryfall card object carries prices, legalities, purchase URIs,
      // ruling links, six image sizes, etc. \u2014 none of which any page here
      // uses. Measured on a real set (FRA, 461 prints): 2.50 MB of raw JSON
      // drops to ~0.38 MB pruned (-85%), which also shrinks what the cache
      // tiers retain and what BoosterLogic/SealedApp keep in memory.
      const CARD_FIELDS = ['name', 'set', 'collector_number', 'rarity', 'lang', 'promo', 'booster', 'layout', 'keywords', 'cmc', 'colors', 'type_line', 'full_art'];
      const FACE_FIELDS = ['name', 'mana_cost', 'type_line', 'colors', 'power', 'toughness', 'oracle_text'];
      const pick = (src, fields) => {
        const out = {};
        for (const f of fields) {
          if (src[f] !== undefined) out[f] = src[f];
        }
        return out;
      };

      const mapFace = (face) => {
        const slim = pick(face, FACE_FIELDS);
        const img = face.image_uris || cardData.image_uris || {};
        if (img.normal) slim.image_uris = { normal: img.normal };
        slim.rarity = cardData.rarity;
        if (face.cmc !== undefined) slim.cmc = face.cmc;
        return slim;
      };

      const parsed = pick(cardData, CARD_FIELDS);

      const isTransform = !!(cardData.card_faces && !cardData.image_uris);
      const sourceFaces = isTransform ? cardData.card_faces : [cardData];

      parsed.is_transform = isTransform;
      parsed.faces = sourceFaces.map(mapFace);

      return parsed;
    } catch (e) {
      console.warn("Failed to parse card:", cardData, e);
      return null;
    }
  },

  /**
   * Helper to get the primary image URL for a card.
   * @param {Object} card - Parsed card object
   * @returns {string} Image URL
   */
  getPrimaryImage(card) {
    if (card.faces && card.faces.length > 0 && card.faces[0].image_uris) {
      return card.faces[0].image_uris.normal;
    }
    return "";
  }
};
