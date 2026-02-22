class KeywordExtractor {
  static customRulesLoaded = false;
  static setCustomConfig = {};

  static getRuleDescription(setCode) {
    if (KeywordExtractor.setCustomConfig[setCode]) {
      return KeywordExtractor.setCustomConfig[setCode].description || "Custom set rules applied.";
    }
    return "Default extraction rules (Creature types & Keywords)";
  }

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
            let propValue = card[rule.property];
            if (!propValue && card.faces) {
              propValue = card.faces[0][rule.property];
            }
            if (!propValue) propValue = '';

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
