// list.js

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const setCode = params.get('set');
  const uniqueParam = params.get('unique');
  const orderParam = params.get('order');
  const statusMessage = document.getElementById('status-message');
  const cardsContainer = document.getElementById('cards-container');
  const loading = new LoadingOverlay();

  let currentUniqueMode = uniqueParam || 'cards'; // Default mode
  let currentOrder = orderParam || 'set'; // Default order
  let allCardsGlobal = []; // Store all cards globally to re-filter
  let filterState = new Set(); // Stores keys of filters that are ACTIVE (Filtering OUT)

  if (!setCode) {
    loading.showError("Error: No set selected.");
    if (statusMessage) {
      statusMessage.textContent = "Error: No set selected.";
      statusMessage.classList.add('error');
    }
    return;
  }

  // Options Menu Logic
  const optionsBtn = document.getElementById('options-btn');
  const optionsMenu = document.getElementById('options-menu');
  const uniqueSelect = document.getElementById('unique-mode-select');
  const orderSelect = document.getElementById('sort-order-select');

  if (optionsBtn && optionsMenu) {
    optionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      optionsMenu.style.display = optionsMenu.style.display === 'none' ? 'block' : 'none';
    });

    // Close menu when clicking outside
    window.addEventListener('click', (e) => {
      if (!optionsMenu.contains(e.target) && e.target !== optionsBtn) {
        optionsMenu.style.display = 'none';
      }
    });
  }

  if (uniqueSelect) {
    // Set initial value
    uniqueSelect.value = currentUniqueMode;

    uniqueSelect.addEventListener('change', async (e) => {
      currentUniqueMode = e.target.value;
      updateUrlAndReload();
    });
  }

  if (orderSelect) {
    orderSelect.value = currentOrder;
    orderSelect.addEventListener('change', async (e) => {
      currentOrder = e.target.value;
      updateUrlAndReload(false);
    });
  }

  async function updateUrlAndReload(reloadApi = true) {
    optionsMenu.style.display = 'none'; // Close menu

    // Update URL
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('unique', currentUniqueMode);
    newUrl.searchParams.set('order', currentOrder);
    window.history.pushState({}, '', newUrl);

    if (reloadApi) {
      await loadCards(); // Reload cards
    } else {
      applyFilters(); // Re-sort and re-render without fetch
    }
  }

  async function loadCards() {
    // Overlay is visible by default
    loading.show(`Loading ${currentUniqueMode} for set: ${setCode.toUpperCase()}...`);

    // Clear current View
    cardsContainer.innerHTML = '';
    allCardsGlobal = [];

    try {
      const cards = await Scryfall.fetchCards(`set:${setCode}`, currentUniqueMode);
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
      applyFilters(); // Initial render with sort

    } catch (error) {
      console.error("Error loading cards:", error);
      loading.showError("Error loading cards. Please try again later.");
    }
  }

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

  function applyFilters() {
    const filtered = allCardsGlobal.filter(card => {
      return filterState.size === 0 || checkCardPassesFilter(filterState, card);
    });
    sortCards(filtered, currentOrder);
    renderCards(filtered);
  }

  loadCards();
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

function sortCards(cards, order) {
  if (order === 'rarity') {
    const rarityRank = { 'mythic': 0, 'rare': 1, 'uncommon': 2, 'common': 3, 'bonus': 4, 'special': 4 };
    cards.sort((a, b) => {
      const rankA = rarityRank[a.rarity] !== undefined ? rarityRank[a.rarity] : 5;
      const rankB = rarityRank[b.rarity] !== undefined ? rarityRank[b.rarity] : 5;
      if (rankA !== rankB) return rankA - rankB;
      // Secondary sort by collector number
      return compareCollectorNumber(a, b);
    });
  } else if (order === 'name') {
    cards.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  } else {
    // Default: set (collector number)
    cards.sort(compareCollectorNumber);
  }
}
