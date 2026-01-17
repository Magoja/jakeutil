class KeywordExtractor {
  static rules = {};

  static register(setCode, ruleFn) {
    KeywordExtractor.rules[setCode] = ruleFn;
  }

  static async loadSetRules(setCode) {
    if (KeywordExtractor.rules[setCode]) return; // Already loaded

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = `keywords/keywords-${setCode}.js`;
      script.onload = () => {
        console.log(`Loaded rules for ${setCode}`);
        resolve();
      };
      script.onerror = () => {
        // No specific rules for this set, ignore
        resolve();
      };
      document.body.appendChild(script);
    });
  }

  static getKeywords(card) {
    const keywords = new Set();
    const typeLine = card.type_line || (card.faces ? card.faces[0].type_line : '');
    const oracleText = card.oracle_text || (card.faces ? card.faces[0].oracle_text : '') || '';

    // Only for creatures? User said "return creature types and ability keyword", "show only matching creature cards".
    // But extraction might happen on non-creatures? Not usually useful for "Kithkin" unless Tribal. 
    // Assuming we process all cards but UI might filter. 
    // However, user said "Click it, to show only the matching CREATURE cards".

    if (typeLine.includes('Creature') || typeLine.includes('Tribal')) {
      // 1. Creature Types
      // Remove "Legendary", "Creature", "Artifact", etc to just get subtypes? 
      // User example: "Kithkin", "Knight". These are subtypes.
      // We generally split by "—" and take the right side.

      if (typeLine.includes('—')) {
        const subtypes = typeLine.split('—')[1].trim().split(' ');
        subtypes.forEach(Type => keywords.add(Type));
      }
    }

    // 2. Ability Keywords
    if (card.keywords) {
      card.keywords.forEach(k => keywords.add(this.capitalize(k)));
    }

    // 3. Set Specific Rules
    const setCode = card.set;
    if (KeywordExtractor.rules[setCode]) {
      const extra = KeywordExtractor.rules[setCode](card);
      if (extra && Array.isArray(extra)) {
        extra.forEach(k => keywords.add(k));
      }
    }

    return Array.from(keywords);
  }

  static capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
