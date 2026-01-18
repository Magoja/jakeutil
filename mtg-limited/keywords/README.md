# Keyword Rules

This folder contains set-specific keyword extraction rules. These files are loaded dynamically based on the selected set.

## File Format

Each file should be named `{setCode}.js` (e.g., `ecl.js`) and should register a custom extractor using the `KeywordExtractor` global object.

### API

```javascript
KeywordExtractor.register(setCode, extractionFunction, description);
```

- **setCode**: The 3-character set code (lowercase).
- **extractionFunction**: A function that takes a `card` object (from Scryfall) and returns an array of strings (keywords/tags).
- **description**: A short string describing the custom rules active for this set.

## Example

**File:** `ecl.js`

```javascript
KeywordExtractor.register('ecl', (card) => {
  const extras = [];
  // normalized text handling for double-faced cards
  const oracleText = card.oracle_text || (card.faces ? card.faces[0].oracle_text : '') || '';

  // Example Rule: Check for specific text
  if (oracleText.includes('-1/-1')) {
    extras.push('-1/-1');
  }

  // Example Rule: Check for mechanics
  if (oracleText.includes('Persist')) {
    extras.push('Persist');
  }

  return extras;
}, "ECL Rules: -1/-1 counters, Persist mechanics");
```

## Usage

When a set is loaded in `sealed.js`, the application attempts to load the corresponding script file from this directory:
`keywords/{setCode}.js`.

If found, the rules are applied to generate filters in the UI.


## Card Data Example

```json
{
  "object": "card",
  "id": "bf708169-a307-494b-b8d8-baae53b2e2f2",
  "oracle_id": "48a773d0-c433-4463-b50f-b6d4604a042c",
  "multiverse_ids": [],
  "tcgplayer_id": 670978,
  "cardmarket_id": 864611,
  "name": "Abigale, Eloquent First-Year",
  "lang": "en",
  "released_at": "2026-01-23",
  "uri": "https://api.scryfall.com/cards/bf708169-a307-494b-b8d8-baae53b2e2f2",
  "scryfall_uri": "https://scryfall.com/card/ecl/204/abigale-eloquent-first-year?utm_source=api",
  "layout": "normal",
  "highres_image": true,
  "image_status": "highres_scan",
  "image_uris": {
    "small": "https://cards.scryfall.io/small/front/b/f/bf708169-a307-494b-b8d8-baae53b2e2f2.jpg?1767658678",
    "normal": "https://cards.scryfall.io/normal/front/b/f/bf708169-a307-494b-b8d8-baae53b2e2f2.jpg?1767658678",
    "large": "https://cards.scryfall.io/large/front/b/f/bf708169-a307-494b-b8d8-baae53b2e2f2.jpg?1767658678",
    "png": "https://cards.scryfall.io/png/front/b/f/bf708169-a307-494b-b8d8-baae53b2e2f2.png?1767658678",
    "art_crop": "https://cards.scryfall.io/art_crop/front/b/f/bf708169-a307-494b-b8d8-baae53b2e2f2.jpg?1767658678",
    "border_crop": "https://cards.scryfall.io/border_crop/front/b/f/bf708169-a307-494b-b8d8-baae53b2e2f2.jpg?1767658678"
  },
  "mana_cost": "{W/B}{W/B}",
  "cmc": 2,
  "type_line": "Legendary Creature — Bird Bard",
  "oracle_text": "Flying, first strike, lifelink\nWhen Abigale enters, up to one other target creature loses all abilities. Put a flying counter, a first strike counter, and a lifelink counter on that creature.",
  "power": "1",
  "toughness": "1",
  "colors": [
    "B",
    "W"
  ],
  "color_identity": [
    "B",
    "W"
  ],
  "keywords": [
    "Flying",
    "Lifelink",
    "First strike"
  ],
  "legalities": {
    "standard": "legal",
    "future": "legal",
    "historic": "legal",
    "timeless": "legal",
    "gladiator": "legal",
    "pioneer": "legal",
    "modern": "legal",
    "legacy": "legal",
    "pauper": "not_legal",
    "vintage": "legal",
    "penny": "not_legal",
    "commander": "legal",
    "oathbreaker": "legal",
    "standardbrawl": "legal",
    "brawl": "legal",
    "alchemy": "not_legal",
    "paupercommander": "not_legal",
    "duel": "legal",
    "oldschool": "not_legal",
    "premodern": "not_legal",
    "predh": "not_legal"
  },
  "games": [
    "paper",
    "arena",
    "mtgo"
  ],
  "reserved": false,
  "game_changer": false,
  "foil": true,
  "nonfoil": true,
  "finishes": [
    "nonfoil",
    "foil"
  ],
  "oversized": false,
  "promo": false,
  "reprint": false,
  "variation": false,
  "set_id": "5d293ad8-a749-4725-bd5c-c4e1db828bd0",
  "set": "ecl",
  "set_name": "Lorwyn Eclipsed",
  "set_type": "expansion",
  "set_uri": "https://api.scryfall.com/sets/5d293ad8-a749-4725-bd5c-c4e1db828bd0",
  "set_search_uri": "https://api.scryfall.com/cards/search?order=set&q=e%3Aecl&unique=prints",
  "scryfall_set_uri": "https://scryfall.com/sets/ecl?utm_source=api",
  "rulings_uri": "https://api.scryfall.com/cards/bf708169-a307-494b-b8d8-baae53b2e2f2/rulings",
  "prints_search_uri": "https://api.scryfall.com/cards/search?order=released&q=oracleid%3A48a773d0-c433-4463-b50f-b6d4604a042c&unique=prints",
  "collector_number": "204",
  "digital": false,
  "rarity": "rare",
  "flavor_text": "The right poem lifts more than spirits.",
  "card_back_id": "0aeebaf5-8c7d-4636-9e82-8c27447861f7",
  "artist": "Mark Zug",
  "artist_ids": [
    "48e2b98c-5467-4671-bd42-4c3746115117"
  ],
  "illustration_id": "1e916c71-cf14-414b-82ec-98a1bf53c13d",
  "border_color": "black",
  "frame": "2015",
  "frame_effects": [
    "legendary"
  ],
  "security_stamp": "oval",
  "full_art": false,
  "textless": false,
  "booster": true,
  "story_spotlight": false,
  "edhrec_rank": 25719,
  "prices": {
    "usd": "6.58",
    "usd_foil": null,
    "usd_etched": null,
    "eur": "4.24",
    "eur_foil": "10.49",
    "tix": null
  },
  "related_uris": {
    "tcgplayer_infinite_articles": "https://partner.tcgplayer.com/c/4931599/1830156/21018?subId1=api&trafcat=tcgplayer.com%2Fsearch%2Farticles&u=https%3A%2F%2Fwww.tcgplayer.com%2Fsearch%2Farticles%3FproductLineName%3Dmagic%26q%3DAbigale%252C%2BEloquent%2BFirst-Year",
    "tcgplayer_infinite_decks": "https://partner.tcgplayer.com/c/4931599/1830156/21018?subId1=api&trafcat=tcgplayer.com%2Fsearch%2Fdecks&u=https%3A%2F%2Fwww.tcgplayer.com%2Fsearch%2Fdecks%3FproductLineName%3Dmagic%26q%3DAbigale%252C%2BEloquent%2BFirst-Year",
    "edhrec": "https://edhrec.com/route/?cc=Abigale%2C+Eloquent+First-Year"
  },
  "purchase_uris": {
    "tcgplayer": "https://partner.tcgplayer.com/c/4931599/1830156/21018?subId1=api&u=https%3A%2F%2Fwww.tcgplayer.com%2Fproduct%2F670978%3Fpage%3D1",
    "cardmarket": "https://www.cardmarket.com/en/Magic/Products?idProduct=864611&referrer=scryfall&utm_campaign=card_prices&utm_medium=text&utm_source=scryfall",
    "cardhoarder": "https://www.cardhoarder.com/cards?affiliate_id=scryfall&data%5Bsearch%5D=Abigale%2C+Eloquent+First-Year&ref=card-profile&utm_campaign=affiliate&utm_medium=card&utm_source=scryfall"
  }
},
```

And double faced cards has these:
```json
"keywords": [
  "Transform"
],
{
  "object": "card_face",
  "name": "Ashling, Rimebound",
  "mana_cost": "",
  "type_line": "Legendary Creature — Elemental Wizard",
  "oracle_text": "Whenever this creature transforms into Ashling, Rimebound and at the beginning of your first main phase, add two mana of any one color. Spend this mana only to cast spells with mana value 4 or greater.\nAt the beginning of your first main phase, you may pay {R}. If you do, transform Ashling.",
  "colors": [
    "U"
  ],
  "color_indicator": [
    "U"
  ],
  "power": "1",
  "toughness": "3",
  "artist": "Ilse Gort",
  "artist_id": "12070c2e-4de6-46bc-b379-8a580dfb34c5",
  "illustration_id": "43c61eb4-9f45-4d51-8570-9ff7093dabb7",
  "image_uris": {
    "small": "https://cards.scryfall.io/small/back/7/d/7d7faefe-9c0d-45b6-8ea4-5fa666762a2c.jpg?1759144841",
    "normal": "https://cards.scryfall.io/normal/back/7/d/7d7faefe-9c0d-45b6-8ea4-5fa666762a2c.jpg?1759144841",
    "large": "https://cards.scryfall.io/large/back/7/d/7d7faefe-9c0d-45b6-8ea4-5fa666762a2c.jpg?1759144841",
    "png": "https://cards.scryfall.io/png/back/7/d/7d7faefe-9c0d-45b6-8ea4-5fa666762a2c.png?1759144841",
    "art_crop": "https://cards.scryfall.io/art_crop/back/7/d/7d7faefe-9c0d-45b6-8ea4-5fa666762a2c.jpg?1759144841",
    "border_crop": "https://cards.scryfall.io/border_crop/back/7/d/7d7faefe-9c0d-45b6-8ea4-5fa666762a2c.jpg?1759144841"
  }
}
```

TODO: Provide highlevel API to give rule text.