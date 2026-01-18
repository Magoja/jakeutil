// list.js

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const setCode = params.get('set');
  const statusMessage = document.getElementById('status-message');
  const cardsContainer = document.getElementById('cards-container');
  const loading = new LoadingOverlay();

  if (!setCode) {
    loading.showError("Error: No set selected.");
    if (statusMessage) {
      statusMessage.textContent = "Error: No set selected.";
      statusMessage.classList.add('error');
    }
    return;
  }

  async function init() {
    // Overlay is visible by default
    loading.show(`Loading cards for set: ${setCode.toUpperCase()}...`);

    try {
      const cards = await Scryfall.fetchCards(`set:${setCode}`);
      if (cards.length === 0) {
        if (loading) loading.showError(`No cards found for set: ${setCode.toUpperCase()}`);
        return;
      }

      loading.hide();

      // Save last viewed set
      localStorage.setItem('mtg_limited_last_set', setCode);

      // Initialize Filters
      allCardsGlobal = cards; // Global update
      createFilterBar();
      renderCards(cards);

    } catch (error) {
      console.error("Error loading cards:", error);
      loading.showError("Error loading cards. Please try again later.");
    }
  }

  init();
});


function renderCards(cards) {
  const container = document.getElementById('cards-container');
  container.innerHTML = '';

  cards.forEach(card => {
    const cardElement = CardUI.createCardElement(card);

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
    { key: 'M', icon: 'icons/rainbow.png', label: 'M' },
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
    if (!isMulticolor && filterState.has('W') && colors.includes('W')) return true;
    if (!isMulticolor && filterState.has('U') && colors.includes('U')) return true;
    if (!isMulticolor && filterState.has('B') && colors.includes('B')) return true;
    if (!isMulticolor && filterState.has('R') && colors.includes('R')) return true;
    if (!isMulticolor && filterState.has('G') && colors.includes('G')) return true;

    if (filterState.has('C') && isColorless) return true;
    if (filterState.has('M') && isMulticolor) return true;
    if (filterState.has('L') && isLand) return true;

    return false; // No match
  });

  renderCards(filtered);
}
