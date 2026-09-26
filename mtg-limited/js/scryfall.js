/**
 * scryfall.js
 * Centralized logic for interacting with the Scryfall API.
 *
 * Results are cached in ephemeral storage (in-memory Map + sessionStorage)
 * so repeat visits and re-rolls don't hammer the Scryfall API. Card and set
 * data is immutable once released, so entries live for 24h; spoiler season
 * gets fresh data at most once a day.
 */

const Scryfall = {
  // ---- Ephemeral result cache -------------------------------------------
  CACHE_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
  CACHE_PREFIX: 'scryfall-cache-v1:',
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
      const raw = sessionStorage.getItem(this.CACHE_PREFIX + key);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      if (now - entry.ts > this.CACHE_TTL_MS) {
        sessionStorage.removeItem(this.CACHE_PREFIX + key);
        return null;
      }
      this._memoryCache.set(key, entry); // promote to memory tier
      return structuredClone(entry.value);
    } catch (e) {
      return null; // storage unavailable or corrupt entry
    }
  },

  /**
   * Store a value in both cache tiers. sessionStorage may throw on quota
   * (large sets) or when blocked; the memory tier still covers the session.
   */
  _cacheSet(key, value) {
    const entry = { ts: Date.now(), value };
    this._memoryCache.set(key, entry);
    try {
      sessionStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(entry));
    } catch (e) {
      console.warn('Scryfall cache: sessionStorage unavailable, memory-only.', e);
    }
  },

  /** Clear all cached Scryfall responses from both tiers. */
  clearCache() {
    this._memoryCache.clear();
    try {
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(this.CACHE_PREFIX)) keys.push(k);
      }
      keys.forEach(k => sessionStorage.removeItem(k));
    } catch (e) { /* storage unavailable */ }
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
    this._cacheSet(key, set);
    return set;
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
      const filtered = allSets.filter(set => set.card_count > 0);
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
      const mapFace = (face) => ({
        name: face.name,
        mana_cost: face.mana_cost,
        type_line: face.type_line,
        colors: face.colors || [],
        power: face.power,
        toughness: face.toughness,
        oracle_text: face.oracle_text,
        image_uris: face.image_uris,
        rarity: cardData.rarity,
        set_name: cardData.set_name,
        ...(face.cmc !== undefined ? { cmc: face.cmc } : {})
      });

      const parsed = { ...cardData };

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
