class KeywordExtractor {
  static customRulesLoaded = false;
  static setCustomConfig = {};

  static getCustomKeywordConfigs(setCode) {
    if (KeywordExtractor.setCustomConfig[setCode]) {
      return KeywordExtractor.setCustomConfig[setCode].keywords || {};
    }
    return {};
  }

  static async loadSetRules(setCode) {
    if (KeywordExtractor.customRulesLoaded) return;

    try {
      const response = await fetch('keyword.json');
      if (response.ok) {
        const config = await response.json();
        KeywordExtractor.setCustomConfig = config;
      }
    } catch (e) {
      console.error("Failed to load keyword.json", e);
    }
    KeywordExtractor.customRulesLoaded = true;
  }

  /**
   * Collect a property (e.g. oracle_text, type_line) across the whole card,
   * unioning the top-level value with every face. Adventures and split cards
   * carry their spell text on card_faces[1], and Scryfall gives multi-face
   * cards no top-level oracle_text, so matching only the top level or face[0]
   * silently misses that text (e.g. an Adventure's removal half).
   */
  static collectProp(card, prop) {
    const parts = [];
    if (card[prop]) parts.push(card[prop]);
    const faces = card.card_faces || card.faces;
    if (Array.isArray(faces)) {
      faces.forEach(f => { if (f && f[prop]) parts.push(f[prop]); });
    }
    return parts.join('\n');
  }

  static getKeywords(card) {
    const keywords = new Set();
    const typeLine = card.type_line || (card.faces ? card.faces[0].type_line : '');

    // 1. Subtypes (for all cards)
    if (typeLine.includes('—')) {
      const subtypes = typeLine.split('—')[1].trim().split(' ');
      subtypes.forEach(Type => keywords.add(Type));
    }

    // 2. Ability Keywords
    if (card.keywords) {
      card.keywords.forEach(k => keywords.add(this.capitalize(k)));
    }

    // 3. Set Specific Rules
    const setCode = card.set;
    if (KeywordExtractor.setCustomConfig[setCode]) {
      const customKws = KeywordExtractor.setCustomConfig[setCode].keywords;
      if (customKws) {
        for (const [kw, rules] of Object.entries(customKws)) {
          const matches = rules.some(rule => {
            const propValue = KeywordExtractor.collectProp(card, rule.property);
            const regex = new RegExp(rule.regex, 'i');
            return regex.test(propValue);
          });
          if (matches) {
            keywords.add(kw);
          }
        }
      }
    }

    return Array.from(keywords);
  }

  static capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
