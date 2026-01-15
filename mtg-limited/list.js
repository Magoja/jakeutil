// list.js

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const setCode = params.get('set');
  const statusMessage = document.getElementById('status-message');
  const cardsContainer = document.getElementById('cards-container');

  if (!setCode) {
    statusMessage.textContent = "Error: No set selected.";
    statusMessage.classList.add('error');
    return;
  }

  if (!setCode) {
    statusMessage.textContent = "Error: No set selected.";
    statusMessage.classList.add('error');
    return;
  }

  statusMessage.textContent = `Loading cards for set: ${setCode.toUpperCase()}...`;

  try {
    const cards = await fetchAllCards(setCode);
    if (cards.length === 0) {
      statusMessage.textContent = `No cards found for set: ${setCode.toUpperCase()}`;
      statusMessage.classList.add('error');
      return;
    }

    statusMessage.style.display = 'none'; // Hide loading message on success

    // Initialize Filters
    createFilterBar();
    renderCards(cards); // Initial render
  } catch (error) {
    console.error("Error loading cards:", error);
    statusMessage.textContent = "Error loading cards. Please try again later.";
    statusMessage.classList.add('error');
  }
});

async function fetchAllCards(setCode) {
  let url = `https://api.scryfall.com/cards/search?q=set:${setCode}`;
  let allCards = [];
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    const data = await response.json();

    if (data.data) {
      const parsedCards = data.data.map(parseCardData).filter(c => c !== null);
      allCards = allCards.concat(parsedCards);
    }

    hasMore = data.has_more;
    if (hasMore) {
      url = data.next_page;
    }
  }

  // Sort by collector number
  allCards.sort((a, b) => {
    // secure sort for numeric strings (e.g. "1", "2", "10", "100")
    // and also handles variants like "10a" vs "10b" correctly
    return a.collector_number.localeCompare(b.collector_number, undefined, { numeric: true, sensitivity: 'base' });
  });


  allCardsGlobal = allCards; // Save to global variable
  return allCards;
}

function parseCardData(cardData) {
  try {
    // Start with a shallow copy of everything so we don't drop metadata
    const parsed = { ...cardData };

    // Add our normalized fields on top
    parsed.is_transform = false;
    parsed.faces = [];

    if (cardData.card_faces && !cardData.image_uris) {
      // Transform card (double-faced)
      parsed.is_transform = true;
      parsed.faces = cardData.card_faces.map(face => ({
        name: face.name,
        mana_cost: face.mana_cost,
        type_line: face.type_line,
        colors: face.colors || [],
        power: face.power,
        toughness: face.toughness,
        oracle_text: face.oracle_text,
        image_uris: face.image_uris
      }));
    } else {
      // Normal card (single-faced)
      parsed.faces.push({
        name: cardData.name,
        mana_cost: cardData.mana_cost,
        cmc: cardData.cmc,
        type_line: cardData.type_line,
        colors: cardData.colors || [],
        power: cardData.power,
        toughness: cardData.toughness,
        oracle_text: cardData.oracle_text,
        image_uris: cardData.image_uris
      });
    }

    return parsed;
  } catch (e) {
    console.warn("Failed to parse card:", cardData, e);
    return null;
  }
}

function renderCards(cards) {
  const container = document.getElementById('cards-container');
  container.innerHTML = '';

  cards.forEach(card => {
    const cardElement = document.createElement('div');
    cardElement.classList.add('card-item');

    // Default to front face
    let currentFaceIndex = 0;
    const face = card.faces[0];
    const imageUrl = face.image_uris ? face.image_uris.normal : ''; // Fallback if no image

    const img = document.createElement('img');
    img.src = imageUrl;
    img.loading = "lazy"; // Native lazy loading
    img.alt = face.name;
    img.classList.add('card-image');

    cardElement.appendChild(img);

    if (card.is_transform) {
      cardElement.classList.add('transformable');

      const flipBtn = document.createElement('button');
      flipBtn.classList.add('flip-button');
      flipBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>`;

      // Make whole card clickable for transform cards
      cardElement.onclick = () => {
        currentFaceIndex = (currentFaceIndex + 1) % card.faces.length;
        const newFace = card.faces[currentFaceIndex];
        if (newFace.image_uris) {
          img.src = newFace.image_uris.normal;
          img.alt = newFace.name;
        }
      };

      cardElement.appendChild(flipBtn);
    }

    // Add tooltip or other info if needed? 
    // For now request just asked to load images on screen.

    container.appendChild(cardElement);
  });
}

// Filtering Logic
let allCardsGlobal = []; // Store all cards globally to re-filter
let filterState = new Set(); // Stores keys of filters that are ACTIVE (Filtering OUT)

function createFilterBar() {
  const container = document.getElementById('filter-container');
  if (!container) return;
  container.innerHTML = '';

  const filters = [
    { key: 'W', icon: 'icons/icon-3.png', label: 'W' },
    { key: 'U', icon: 'icons/icon-2.png', label: 'U' },
    { key: 'B', icon: 'icons/icon-4.png', label: 'B' },
    { key: 'R', icon: 'icons/icon-5.png', label: 'R' },
    { key: 'G', icon: 'icons/icon-1.png', label: 'G' },
    { key: 'C', icon: 'icons/icon-6.png', label: 'C' },
    { key: 'M', icon: 'icons/icon-31.png', label: 'M' },
    { key: 'L', icon: 'icons/icon-9.png', label: 'L' }
  ];

  filters.forEach(f => {
    const btn = document.createElement('div');
    btn.classList.add('filter-btn');
    btn.title = f.title || f.label;

    if (f.icon) {
      btn.innerHTML = `<img src="${f.icon}" alt="${f.label}">`;
    } else {
      btn.textContent = f.label;
    }

    btn.onclick = () => {
      if (filterState.has(f.key)) {
        filterState.delete(f.key);
        btn.classList.remove('active');
      } else {
        filterState.add(f.key);
        btn.classList.add('active');
      }
      applyFilters();
    };

    container.appendChild(btn);
  });
}

// Helper to get colors safely (handling transform cards)
function getCardColors(card) {
  if (card.is_transform && card.faces && card.faces.length > 0) {
    return card.faces[0].colors || [];
  }
  return card.colors || [];
}

// Helper to get type_line safely
function getCardTypeLine(card) {
  if (card.is_transform && card.faces && card.faces.length > 0) {
    return card.faces[0].type_line || "";
  }
  return card.type_line || "";
}

function applyFilters() {
  if (filterState.size === 0) {
    renderCards(allCardsGlobal);
    return;
  }

  const filtered = allCardsGlobal.filter(card => {
    // Logic: Show card if it matches ANY of the active filters.
    // If multiple filters are active, it's a UNION (OR).

    const colors = getCardColors(card);
    const typeLine = getCardTypeLine(card);

    const isLand = typeLine.includes('Land');
    const isMulticolor = colors.length > 1;
    const isColorless = colors.length === 0 && !isLand;

    // Check Matches
    if (filterState.has('W') && colors.includes('W')) return true;
    if (filterState.has('U') && colors.includes('U')) return true;
    if (filterState.has('B') && colors.includes('B')) return true;
    if (filterState.has('R') && colors.includes('R')) return true;
    if (filterState.has('G') && colors.includes('G')) return true;

    if (filterState.has('C') && isColorless) return true;
    if (filterState.has('M') && isMulticolor) return true;
    if (filterState.has('L') && isLand) return true;

    return false; // No match
  });

  renderCards(filtered);
}
