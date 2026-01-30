/**
 * scryfall.js
 * Centralized logic for interacting with the Scryfall API.
 */

const Scryfall = {
  /**
   * Fetch all sets from Scryfall.
   * @returns {Promise<Array>} Array of set objects.
   */
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
   * Fetch all sets from Scryfall.
   * @returns {Promise<Array>} Array of set objects.
   */
  async fetchAllSets() {
    let allSets = [];
    try {
      await this.fetchPaginated('https://api.scryfall.com/sets/', (data) => {
        allSets = allSets.concat(data);
      });
      return allSets.filter(set => set.card_count > 0);
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
  async fetchCards(query, uniqueMode = 'cards') {
    let allCards = [];
    const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=${uniqueMode}`;

    try {
      await this.fetchPaginated(url, (data) => {
        const parsed = data.map(Scryfall.parseCardData).filter(c => c !== null);
        allCards = allCards.concat(parsed);
      });

      // Sort by collector number
      Scryfall.sortByCollectorNumber(allCards);

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
