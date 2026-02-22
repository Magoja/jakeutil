// list.js

class OptionsMenu {
  constructor(config = {}) {
    this.ids = {
      button: 'options-btn',
      menu: 'options-menu',
      uniqueSelect: 'unique-mode-select',
      orderSelect: 'sort-order-select',
      ...config.ids
    };

    this.optionsBtn = document.getElementById(this.ids.button);
    this.optionsMenu = document.getElementById(this.ids.menu);
    this.uniqueSelect = document.getElementById(this.ids.uniqueSelect);
    this.orderSelect = document.getElementById(this.ids.orderSelect);

    this.onModeChange = config.onModeChange || (() => { });

    // Set initial values
    if (this.uniqueSelect && config.initialUniqueMode) {
      this.uniqueSelect.value = config.initialUniqueMode;
    }
    if (this.orderSelect && config.initialOrder) {
      this.orderSelect.value = config.initialOrder;
    }

    this.initListeners();
  }

  initListeners() {
    if (this.optionsBtn && this.optionsMenu) {
      this.optionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMenu();
      });

      window.addEventListener('click', (e) => {
        if (!this.optionsMenu.contains(e.target) && e.target !== this.optionsBtn) {
          this.closeMenu();
        }
      });
    }

    if (this.uniqueSelect) {
      this.uniqueSelect.addEventListener('change', (e) => {
        this.onModeChange('unique', e.target.value);
        this.closeMenu();
      });
    }

    if (this.orderSelect) {
      this.orderSelect.addEventListener('change', (e) => {
        this.onModeChange('order', e.target.value);
        this.closeMenu();
      });
    }
  }

  toggleMenu() {
    if (this.optionsMenu) {
      this.optionsMenu.style.display = this.optionsMenu.style.display === 'none' ? 'block' : 'none';
    }
  }

  closeMenu() {
    if (this.optionsMenu) {
      this.optionsMenu.style.display = 'none';
    }
  }
}


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
  const optionsMenu = new OptionsMenu({
    initialUniqueMode: currentUniqueMode,
    initialOrder: currentOrder,
    onModeChange: (type, value) => {
      if (type === 'unique') {
        currentUniqueMode = value;
        updateUrlAndReload(true);
      } else if (type === 'order') {
        currentOrder = value;
        updateUrlAndReload(false);
      }
    }
  });

  async function updateUrlAndReload(reloadApi = true) {
    optionsMenu.closeMenu(); // Close menu

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
      const cards = await Scryfall.fetchCards(`set:${setCode} unique:${currentUniqueMode}`);
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
