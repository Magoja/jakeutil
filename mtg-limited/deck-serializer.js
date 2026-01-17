class DeckSerializer {
  static serialize(allCards, deckCards) {
    // 1. Bitmask of pool cards
    // Map uniqueId back to index 0..N based on allCards (which is deterministic from seed)
    // Actually, allCards includes lands added later? No, 'allCards' in sealed.js logic accumulates everything.
    // We need the *initial* pool indices.
    // The pool is generated first. Let's assume the first X cards in allCards are the seeded pool.
    // But 'allCards' grows as we add basic lands.
    // Strategy: Identify pool cards by their 'card-INDEX' format.

    const indices = [];
    const lands = { W: 0, U: 0, B: 0, R: 0, G: 0 };

    deckCards.forEach(card => {
      if (card.uniqueId.startsWith('card-')) {
        const idx = parseInt(card.uniqueId.split('-')[1]);
        if (!isNaN(idx)) indices.push(idx);
      } else if (card.uniqueId.startsWith('land-')) {
        // Count basic lands
        // We need to map card name back to WUBRG
        if (card.type_line.includes('Plains')) lands.W++;
        else if (card.type_line.includes('Island')) lands.U++;
        else if (card.type_line.includes('Swamp')) lands.B++;
        else if (card.type_line.includes('Mountain')) lands.R++;
        else if (card.type_line.includes('Forest')) lands.G++;
      }
    });

    // Create Bitmask
    if (indices.length === 0 && Object.values(lands).every(v => v === 0)) return '';

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

    // Convert to Base64
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary)
      .replace(/\+/g, '-') // URL safe
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Land suffix
    // Format: .W5.U3...
    let suffix = '';
    if (lands.W > 0) suffix += `.W${lands.W}`;
    if (lands.U > 0) suffix += `.U${lands.U}`;
    if (lands.B > 0) suffix += `.B${lands.B}`;
    if (lands.R > 0) suffix += `.R${lands.R}`;
    if (lands.G > 0) suffix += `.G${lands.G}`;

    return base64 + suffix;
  }

  static deserialize(encoded, allCards, addBasicLandFn) {
    if (!encoded) return [];

    const parts = encoded.split('.');
    const base64 = parts[0];
    const landParts = parts.slice(1);

    const deckCards = [];

    // Decode Base64
    if (base64) {
      try {
        const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        for (let i = 0; i < bytes.length * 8; i++) {
          const byteIndex = Math.floor(i / 8);
          const bitIndex = i % 8;
          if (bytes[byteIndex] & (1 << bitIndex)) {
            // Check if this index exists in allCards (and is the right card)
            // Implementation detail: allCards in sealed.js contains the initial pool at indices 0..N
            // We must ensure we're picking from that initial range.
            const cardId = `card-${i}`;
            const card = allCards.find(c => c.uniqueId === cardId);
            if (card) {
              deckCards.push(card);
            }
          }
        }
      } catch (e) {
        console.error("Error decoding deck:", e);
      }
    }

    // Decode Lands
    // We can't just push objects, we need to call the app's 'addBasicLand' logic to generate unique IDs and track them properly 
    // OR we return instructions on what to add.
    // The prompt says "if it has card selection, add them".
    // For separation of concerns, this deserializer should probably just return the pool cards 
    // and a counts object for lands?
    // But fitting back into 'sealed.js' might be easier if we just return the data structure.

    const landCounts = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    landParts.forEach(p => {
      const type = p.charAt(0);
      const count = parseInt(p.substring(1));
      if (landCounts[type] !== undefined && !isNaN(count)) {
        landCounts[type] = count;
      }
    });

    return { deckCards, landCounts };
  }
}
