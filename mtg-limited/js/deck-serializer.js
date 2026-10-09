class DeckSerializer {
  static serialize(deckCards) {
    const { indices, lands } = DeckSerializer.extractDeckData(deckCards);

    if (indices.length === 0 && Object.values(lands).every(v => v === 0)) return '';

    return DeckSerializer.encodeBase64Url(DeckSerializer.indicesToBytes(indices)) + DeckSerializer.makeLandSuffix(lands);
  }

  static extractDeckData(deckCards) {
    const indices = [];
    const lands = { W: 0, U: 0, B: 0, R: 0, G: 0 };

    deckCards.forEach(card => {
      if (card.uniqueId.startsWith('card-')) {
        const idx = parseInt(card.uniqueId.split('-')[1]);
        if (!isNaN(idx)) indices.push(idx);
      } else if (card.uniqueId.startsWith('land-')) {
        if (card.type_line.includes('Plains')) lands.W++;
        else if (card.type_line.includes('Island')) lands.U++;
        else if (card.type_line.includes('Swamp')) lands.B++;
        else if (card.type_line.includes('Mountain')) lands.R++;
        else if (card.type_line.includes('Forest')) lands.G++;
      }
    });

    return { indices, lands };
  }

  static deserialize(encoded, allCards) {
    if (!encoded) return [];

    const parts = encoded.split('.');
    const base64 = parts[0];
    const landParts = parts.slice(1);

    const deckCards = [];

    // Decode Base64
    if (base64) {
      try {
        const indices = DeckSerializer.bytesToIndices(DeckSerializer.decodeBase64Url(base64));
        deckCards.push(...DeckSerializer.indicesToDeckCards(indices, allCards));
      } catch (e) {
        console.error("Error decoding deck:", e);
      }
    }

    const landCounts = DeckSerializer.parseLandCounts(landParts);
    return { deckCards, landCounts };
  }

  static indicesToBytes(indices) {
    const maxIndex = indices.length > 0 ? Math.max(...indices) : 0;
    // We need a bitset capable of holding maxIndex
    // But since we just want to know which of the *available* pool was selected.

    // Optimization: Just store list of indices if sparse? 
    // Sealed pool is ~90 cards (6 packs * 15).
    // Deck is ~23 cards + lands.
    // Bitmask is 90 bits = 12 bytes. Very small.
    // Base64 of 12 bytes is ~16 chars. Efficient.

    // Construct byte array
    const numBytes = Math.ceil((maxIndex + 1) / 8);
    const bytes = new Uint8Array(numBytes);

    indices.forEach(idx => {
      const byteIndex = Math.floor(idx / 8);
      const bitIndex = idx % 8;
      bytes[byteIndex] |= (1 << bitIndex);
    });
    return bytes;
  }

  static bytesToIndices(bytes) {
    const indices = [];
    for (let i = 0; i < bytes.length * 8; i++) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = i % 8;
      if (bytes[byteIndex] & (1 << bitIndex)) {
        indices.push(i);
      }
    }
    return indices;
  }

  static encodeBase64Url(bytes) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-') // URL safe
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  static decodeBase64Url(base64) {
    const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  static makeLandSuffix(lands) {
    let suffix = '';
    if (lands.W > 0) suffix += `.W${lands.W}`;
    if (lands.U > 0) suffix += `.U${lands.U}`;
    if (lands.B > 0) suffix += `.B${lands.B}`;
    if (lands.R > 0) suffix += `.R${lands.R}`;
    if (lands.G > 0) suffix += `.G${lands.G}`;
    return suffix;
  }

  static parseLandCounts(landParts) {
    const landCounts = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    landParts.forEach(p => {
      const type = p.charAt(0);
      const count = parseInt(p.substring(1));
      if (landCounts[type] !== undefined && !isNaN(count)) {
        landCounts[type] = count;
      }
    });
    return landCounts;
  }

  static indicesToDeckCards(indices, allCards) {
    const deckCards = [];
    indices.forEach(i => {
      const cardId = `card-${i}`;
      const card = allCards.find(c => c.uniqueId === cardId);
      if (card) {
        deckCards.push(card);
      }
    });
    return deckCards;
  }
}
