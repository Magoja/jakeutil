document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const setCode = params.get('set');
  const seed = SeedUtils.ensureSeed(params);

  // Initialize RNG
  const rng = RNG.create(seed);

  const container = document.querySelector('.sealed-container');
  const loadingMessage = document.getElementById('loading-message');
  const poolArea = document.getElementById('pool-area');
  const deckList = document.getElementById('deck-list');
  let deckCount = document.getElementById('deck-count');

  if (!setCode) {
    loadingMessage.textContent = "No set specified.";
    return;
  }

  // State
  const pool = BoosterLogic.createPool(); // Helper pool structure
  let allCards = []; // All opened physical cards
  let deckCards = []; // Cards in deck
  let poolCards = []; // Cards in pool
  let basicLands = []; // Basic lands
  let isDataLoaded = false;
  let currentSort = 'color'; // Default sort
  let isDeckFocus = false;

  // Fetch all cards
  async function fetchCards() {
    try {
      loadingMessage.textContent = "Loading cards...";

      const [cards, lands] = await Promise.all([
        Scryfall.fetchCards(`set:${setCode} unique:cards -type:basic`),
        Scryfall.fetchCards(`set:${setCode} unique:prints type:basic`)
      ]);

      if (cards.length > 0) {
        basicLands = lands; // Store basics for land station
        BoosterLogic.processCards(cards, pool); // Populate source pool logic
        generateSealedPool();
        isDataLoaded = true;
        render();
        loadingMessage.style.display = 'none';
      } else {
        loadingMessage.textContent = "No cards found.";
      }

    } catch (e) {
      console.error(e);
      loadingMessage.textContent = "Error loading cards.";
    }
  }

  function openPacks(count) {
    const cards = [];
    for (let i = 0; i < count; i++) {
      const pack = BoosterLogic.generatePackData(pool, rng);
      cards.push(...pack);
    }
    return cards;
  }

  function assignUniqueId(cards) {
    cards.forEach((card, index) => {
      card.uniqueId = `card-${index}`;
    });
  }

  function generateSealedPool() {
    // Generate 6 packs
    const packs = openPacks(6);
    allCards.push(...packs);

    assignUniqueId(allCards);

    poolCards = [...allCards]; // Initially all in pool
    deckCards = [];
  }

  // --- Rendering & Sorting ---

  function render() {
    const landStation = document.getElementById('land-station');
    if (landStation) {
      landStation.style.display = isDeckFocus ? 'flex' : 'none';
    }

    if (isDeckFocus) {
      // Focus: Main=Deck, Side=Pool
      container.classList.add('deck-focus');
      renderViewUI(deckCards, 'deck');
      renderPileUI(poolCards, 'pool', 'Pile');
    } else {
      // Normal: Main=Pool, Side=Deck
      container.classList.remove('deck-focus');
      renderViewUI(poolCards, 'pool');
      renderPileUI(deckCards, 'deck', 'Deck');
    }
    updateMetrics();
  }

  function renderViewUI(cards, source) {
    poolArea.innerHTML = '';
    // Always Columns
    renderAsColumns(cards, poolArea, source);
  }

  function renderPileUI(cards, source, titleLabel) {
    deckList.innerHTML = '';

    // Update Title logic
    const pileHeader = document.querySelector('#deck-area h5');
    if (pileHeader) {
      // Rebuild header keeping ID for deck-count
      pileHeader.innerHTML = `${titleLabel} (<span id="deck-count">${cards.length}</span>)`;
      // Update the global deckCount reference
      deckCount = document.getElementById('deck-count');

      if (titleLabel === 'Pool') {
        pileHeader.style.color = '#967adc'; // Highlight color
      } else {
        pileHeader.style.color = '';
      }
    }

    // Always List
    renderAsList(cards, deckList, source);
  }

  function renderAsColumns(cards, container, source) {
    // Determine sort function based on source
    // Pool: Sort by Collector Number (Default)
    // Deck: Sort by Priority (Type) -> CMC -> Name
    const sortFn = source === 'deck' ? compareCardsForDeck : compareByCollectorNumber;

    const groups = groupCards(cards, currentSort, sortFn);

    let keys = sortGroupKeys(Object.keys(groups), currentSort);

    keys.forEach(groupKey => {
      const column = document.createElement('div');
      column.classList.add('pool-column');
      column.dataset.groupKey = groupKey;

      const stack = document.createElement('div');
      stack.classList.add('card-stack');

      groups[groupKey].forEach(card => {
        const el = createDraggableCard(card, source);
        stack.appendChild(el);
      });

      column.appendChild(stack);
      container.appendChild(column);
    });
  }

  function renderAsList(cards, container, source) {
    const sortFn = source === 'deck' ? compareCardsForDeck : compareByCollectorNumber;
    const sorted = [...cards].sort(sortFn);

    let target = container;
    // Only create wrapper if container is not already a deck-list key container
    if (!container.classList.contains('deck-list')) {
      let wrapper = container.querySelector('.deck-list');
      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.classList.add('deck-list');
        wrapper.style.paddingBottom = '300px';
        wrapper.style.width = '100%';
        container.appendChild(wrapper);
      }
      target = wrapper;
    }

    sorted.forEach(card => {
      const el = createDraggableCard(card, source);
      target.appendChild(el);
    });
  }

  function updateMetrics() {
    let creatures = 0;
    let lands = 0;
    let spells = 0;

    deckCards.forEach(card => {
      const typeLine = card.type_line || (card.faces ? card.faces[0].type_line : '');

      if (typeLine.includes('Creature')) {
        creatures++;
      } else if (typeLine.includes('Land')) {
        lands++;
      } else {
        spells++;
      }
    });

    // Toggle Draw 7 Button
    const draw7Btn = document.getElementById('draw-7-btn');
    if (draw7Btn) {
      if (deckCards.length >= 40) {
        draw7Btn.style.display = 'inline-block';
      } else {
        draw7Btn.style.display = 'none';
      }
    }

    document.getElementById('metric-total').textContent = deckCards.length;
    document.getElementById('metric-creatures').textContent = creatures;
    document.getElementById('metric-spells').textContent = spells;
    document.getElementById('metric-lands').textContent = lands;
  }

  function groupCards(cards, mode, sortFn = compareByCollectorNumber) {
    const groups = {};

    cards.forEach(card => {
      let key = getCardGroupKey(card, mode);
      if (!groups[key]) groups[key] = [];
      groups[key].push(card);
    });

    // Sort each group
    Object.keys(groups).forEach(key => {
      groups[key].sort(sortFn);
    });

    return groups;
  }

  // --- Drag and Drop ---

  function createDraggableCard(card, source) {
    const el = CardUI.createCardElementForDeck(card);
    el.draggable = true;
    el.dataset.uniqueId = card.uniqueId;
    el.dataset.source = source; // 'pool' or 'deck'

    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({
        uniqueId: card.uniqueId,
        source: source
      }));
      el.classList.add('dragging');
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
    });

    // Click to move functionality as alternative
    el.addEventListener('click', (e) => {
      const currentSource = el.dataset.source;
      moveCard(card.uniqueId, currentSource === 'pool' ? 'deck' : 'pool');
    });

    return el;
  }

  function moveCard(uniqueId, destination) {
    const cardIndex = allCards.findIndex(c => c.uniqueId === uniqueId);
    if (cardIndex === -1) return;
    const card = allCards[cardIndex];

    // Data Update
    if (destination === 'deck') {
      const idx = poolCards.findIndex(c => c.uniqueId === uniqueId);
      if (idx !== -1) {
        poolCards.splice(idx, 1);
        deckCards.push(card);
      }
    } else {
      // Move from deck to pool
      // Special Case: Basic Lands (user added) -> Delete
      const type = card.type_line || (card.faces ? card.faces[0].type_line : '');
      if (type.includes('Basic Land')) {
        removeBasicLand(uniqueId);
        return;
      }

      const idx = deckCards.findIndex(c => c.uniqueId === uniqueId);
      if (idx !== -1) {
        deckCards.splice(idx, 1);
        poolCards.push(card);
      }
    }

    // DOM Update
    const cardElement = document.querySelector(`.card-item[data-unique-id="${uniqueId}"]`);
    if (cardElement) {
      // Remove from current parent
      cardElement.remove();
      // Update source dataset
      cardElement.dataset.source = destination;
      // Re-bind click event? Logic is generic "toggle", so it holds.
      // But verify if event listeners persist on moved element. Yes they do.

      // Determine Target Container & Mode
      let container = null;
      let isListMode = false;

      if (isDeckFocus) {
        // Focus Mode: Deck is in View (Main), Pool is in Pile (Sidebar)
        if (destination === 'deck') {
          container = poolArea; // Deck is in View
          isListMode = false;
        } else {
          container = deckList; // Pool is in Pile
          isListMode = true;
        }
      } else {
        // Normal Mode: Pool is in View (Main), Deck is in Pile (Sidebar)
        if (destination === 'pool') {
          container = poolArea; // Pool is in View
          isListMode = false;
        } else {
          container = deckList; // Deck is in Pile
          isListMode = true;
        }
      }

      if (isListMode) {
        let listTarget = container;
        if (!container.classList.contains('deck-list')) {
          let wrapper = container.querySelector('.deck-list');
          if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.classList.add('deck-list');
            wrapper.style.paddingBottom = '300px';
            wrapper.style.width = '100%';
            container.appendChild(wrapper);
          }
          listTarget = wrapper;
        }
        const sortFn = destination === 'deck' ? compareCardsForDeck : compareByCollectorNumber;
        insertCardIntoList(listTarget, cardElement, card, sortFn);
      } else {
        // Use correct sort function
        const sortFn = isDeckFocus && destination === 'deck' ? compareCardsForDeck : compareByCollectorNumber;
        const group = getCardGroupKey(card, currentSort);
        insertCardIntoColumn(container, cardElement, card, group, sortFn);
      }
    }

    updateMetrics();
    // Update pile count
    deckCount = document.getElementById('deck-count');
    if (deckCount) {
      if (isDeckFocus) {
        deckCount.textContent = poolCards.length;
      } else {
        deckCount.textContent = deckCards.length;
      }
    }
  }

  function sortGroupKeys(keys, mode) {
    if (mode === 'color') {
      const order = ['W', 'U', 'B', 'R', 'G', 'Multicolor', 'Colorless', 'Land'];
      return keys.sort((a, b) => {
        let idxA = order.indexOf(a);
        let idxB = order.indexOf(b);
        if (idxA === -1) idxA = 99;
        if (idxB === -1) idxB = 99;
        return idxA - idxB;
      });
    } else if (mode === 'type') {
      const order = ['Creature', 'Sorcery', 'Instant', 'Enchantment', 'Artifact', 'Planeswalker', 'Land', 'Other'];
      return keys.sort((a, b) => {
        let idxA = order.indexOf(a);
        let idxB = order.indexOf(b);
        if (idxA === -1) idxA = 99;
        if (idxB === -1) idxB = 99;
        return idxA - idxB;
      });
    } else if (mode === 'rarity') {
      const order = ['mythic', 'rare', 'uncommon', 'common'];
      return keys.sort((a, b) => {
        let idxA = order.indexOf(a);
        let idxB = order.indexOf(b);
        if (idxA === -1) idxA = 99;
        if (idxB === -1) idxB = 99;
        return idxA - idxB;
      });
    }
    return keys.sort(); // Default alphabetical
  }

  function getCardGroupKey(card, mode) {
    if (mode === 'color') {
      const typeLine = card.type_line || (card.faces ? card.faces[0].type_line : '');

      const colors = card.colors || (card.faces ? card.faces[0].colors : []) || [];
      if (colors.length === 0) return 'Colorless';
      else if (colors.length > 1) return 'Multicolor';
      else return colors[0];
      if (colors.length === 0) return 'Colorless';
      else if (colors.length > 1) return 'Multicolor';
      else return colors[0];
    } else if (mode === 'rarity') {
      return card.rarity;
    } else if (mode === 'type') {
      const typeLine = card.type_line || (card.faces ? card.faces[0].type_line : '');
      if (typeLine.includes('Creature')) return 'Creature';
      else if (typeLine.includes('Instant')) return 'Instant';
      else if (typeLine.includes('Sorcery')) return 'Sorcery';
      else if (typeLine.includes('Enchantment')) return 'Enchantment';
      else if (typeLine.includes('Artifact')) return 'Artifact';
      else if (typeLine.includes('Land')) return 'Land';
      else if (typeLine.includes('Planeswalker')) return 'Planeswalker';
      return 'Other';
    } else if (mode === 'cmc') {
      const cmc = Math.floor(card.cmc || 0);
      return cmc >= 7 ? '7+' : cmc.toString();
    }
    return 'Other';
  }

  function insertCardIntoList(container, el, card, sortFn = compareByCollectorNumber) {
    const children = Array.from(container.children).filter(c => c.classList.contains('card-item'));
    let insertBefore = null;

    for (const child of children) {
      const childId = child.dataset.uniqueId;
      const childCard = allCards.find(c => c.uniqueId === childId);
      if (childCard && sortFn(card, childCard) < 0) {
        insertBefore = child;
        break;
      }
    }

    if (insertBefore) {
      container.insertBefore(el, insertBefore);
    } else {
      container.appendChild(el);
    }
  }

  function insertCardIntoColumn(container, el, card, groupKey, sortFn) {
    let column = Array.from(container.children).find(col => {
      return col.dataset.groupKey === groupKey;
    });

    if (!column) {
      // Create new column
      column = document.createElement('div');
      column.classList.add('pool-column');
      column.dataset.groupKey = groupKey;

      const stack = document.createElement('div');
      stack.classList.add('card-stack');
      column.appendChild(stack);

      // Where to insert column? We don't have stric sorting of groups yet. Appending is fine.
      container.appendChild(column);
    }

    const stack = column.querySelector('.card-stack');
    insertCardIntoList(stack, el, card, sortFn);
  }

  // Drop Zones
  poolArea.addEventListener('dragover', e => e.preventDefault());
  poolArea.addEventListener('drop', handleDrop('pool'));

  deckList.addEventListener('dragover', e => e.preventDefault());
  deckList.addEventListener('drop', handleDrop('deck'));

  function handleDrop(destination) {
    return (e) => {
      e.preventDefault();
      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.source !== destination) {
          moveCard(data.uniqueId, destination);
        }
      } catch (err) {
        console.error("Drop error", err);
      }
    };
  }

  // --- Controls ---

  document.getElementById('sort-color').addEventListener('click', () => { currentSort = 'color'; render(); });
  document.getElementById('sort-rarity').addEventListener('click', () => { currentSort = 'rarity'; render(); });
  document.getElementById('sort-type').addEventListener('click', () => { currentSort = 'type'; render(); });
  document.getElementById('sort-cmc').addEventListener('click', () => { currentSort = 'cmc'; render(); });

  // Land Station
  document.querySelectorAll('.mana-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const colorKey = e.currentTarget.dataset.color;
      addBasicLand(colorKey);
    });
  });

  function removeBasicLand(uniqueId) {
    const idx = deckCards.findIndex(c => c.uniqueId === uniqueId);
    if (idx !== -1) deckCards.splice(idx, 1);

    // Cleanup allCards
    const acIdx = allCards.findIndex(c => c.uniqueId === uniqueId);
    if (acIdx !== -1) allCards.splice(acIdx, 1);

    // DOM Cleanup
    const cardElement = document.querySelector(`.card-item[data-unique-id="${uniqueId}"]`);
    if (cardElement) cardElement.remove();

    updateMetrics();
    // Update count
    deckCount = document.getElementById('deck-count');
    if (deckCount) {
      if (!isDeckFocus) deckCount.textContent = deckCards.length;
    }
  }

  function addBasicLand(colorKey) {
    const landMap = { 'W': 'Plains', 'U': 'Island', 'B': 'Swamp', 'R': 'Mountain', 'G': 'Forest' };
    const landName = landMap[colorKey];

    const variants = basicLands.filter(c => c.name === landName);
    let pick = null;

    if (variants.length > 0) {
      const fullArts = variants.filter(c => c.full_art);
      if (fullArts.length > 0) {
        pick = fullArts[Math.floor(Math.random() * fullArts.length)];
      } else {
        pick = variants[Math.floor(Math.random() * variants.length)];
      }
    } else {
      // No basics in set?
      return;
    }

    const landCard = JSON.parse(JSON.stringify(pick)); // Clone
    landCard.uniqueId = `land-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    deckCards.push(landCard);
    allCards.push(landCard); // Track source

    // Incremental DOM Update (instead of full render)
    const el = createDraggableCard(landCard, 'deck');

    if (isDeckFocus) {
      // Deck is in Pool View (Columns)
      const group = getCardGroupKey(landCard, currentSort);
      insertCardIntoColumn(poolArea, el, landCard, group, compareCardsForDeck);
      deckCount.textContent = deckCards.length;
    } else {
      // Deck is in List View (Pile)
      // Note: This case is unlikely if Land Station is only visible in Deck Focus, but handling it is safe
      insertCardIntoList(deckList, el, landCard, compareCardsForDeck);
    }

    updateMetrics();
  }

  document.getElementById('toggle-view-btn').addEventListener('click', () => {
    isDeckFocus = !isDeckFocus;
    render();
  });

  // Zoom Logic
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');

  let currentZoom = parseFloat(loadSetting('sealed-card-zoom') || 1);

  // Set initial bounds
  let minZoom = 0.5;
  let maxZoom = 2.0;

  // Mobile Adjustment
  if (window.innerWidth <= 600) {
    minZoom = 0.2;
    maxZoom = 1.0;
  }

  // Ensure initial is within bounds
  if (currentZoom < minZoom) currentZoom = minZoom;
  if (currentZoom > maxZoom) currentZoom = maxZoom;

  function updateZoom(newZoom) {
    // Round to avoid float precision issues
    newZoom = Math.round(newZoom * 10) / 10;

    if (newZoom < minZoom) newZoom = minZoom;
    if (newZoom > maxZoom) newZoom = maxZoom;

    currentZoom = newZoom;
    document.documentElement.style.setProperty('--card-scale', currentZoom);
    saveSetting('sealed-card-zoom', currentZoom);
  }

  // Initial Apply
  updateZoom(currentZoom);

  if (zoomInBtn && zoomOutBtn) {
    zoomInBtn.addEventListener('click', () => {
      updateZoom(currentZoom + 0.1);
    });

    zoomOutBtn.addEventListener('click', () => {
      updateZoom(currentZoom - 0.1);
    });
  }

  function compareByCollectorNumber(a, b) {
    const numA = parseInt(a.collector_number) || 0;
    const numB = parseInt(b.collector_number) || 0;
    // Handle variants if needed (e.g. 100a vs 100b), but simple numeric is usually fine for general sort
    if (numA !== numB) return numA - numB;
    return a.name.localeCompare(b.name);
  }

  function compareCardsForDeck(a, b) {
    const getPriority = (card) => {
      const type = card.type_line || (card.faces ? card.faces[0].type_line : '');
      if (type.includes('Creature')) return 1;
      if (type.includes('Sorcery')) return 2;
      if (type.includes('Instant')) return 3;
      if (type.includes('Enchantment')) return 4;
      if (type.includes('Artifact')) return 5;
      if (type.includes('Planeswalker')) return 6;
      if (type.includes('Land')) return 7;
      return 8; // Other
    };

    const priA = getPriority(a);
    const priB = getPriority(b);
    if (priA !== priB) return priA - priB;

    // Special Sort for Lands: WUBRG
    if (priA === 7) { // Both are lands
      const getLandSortIndex = (card) => {
        const type = card.type_line || (card.faces ? card.faces[0].type_line : '');
        if (type.includes('Plains')) return 0;
        if (type.includes('Island')) return 1;
        if (type.includes('Swamp')) return 2;
        if (type.includes('Mountain')) return 3;
        if (type.includes('Forest')) return 4;
        return 5;
      };

      const sortA = getLandSortIndex(a);
      const sortB = getLandSortIndex(b);

      if (sortA !== sortB) return sortA - sortB;
    }

    // CMC
    const cmcA = a.cmc || 0;
    const cmcB = b.cmc || 0;
    if (cmcA !== cmcB) return cmcA - cmcB;

    // Name
    return a.name.localeCompare(b.name);
  }

  function saveSetting(key, value) {
    if (typeof Storage !== "undefined") {
      localStorage.setItem(key, value);
    }
  }

  function loadSetting(key, defaultValue = null) {
    if (typeof Storage !== "undefined") {
      return localStorage.getItem(key) || defaultValue;
    }
    return defaultValue;
  }

  function initRerollModal() {
    const rerollModal = document.getElementById('reroll-modal');
    const openAnotherBtn = document.getElementById('open-another-btn');
    const rerollConfirmBtn = document.getElementById('reroll-confirm');
    const rerollCancelBtn = document.getElementById('reroll-cancel');

    openAnotherBtn.addEventListener('click', () => {
      rerollModal.style.display = 'flex';
    });

    rerollConfirmBtn.addEventListener('click', () => {
      SeedUtils.updateUrlWithSeed(RNG.generateSeed(), true);
    });

    rerollCancelBtn.addEventListener('click', () => {
      rerollModal.style.display = 'none';
    });

    // Close modal on outside click
    rerollModal.addEventListener('click', (e) => {
      if (e.target === rerollModal) {
        rerollModal.style.display = 'none';
      }
    });
  }

  initRerollModal();
  initHandModal();

  function initHandModal() {
    const draw7Btn = document.getElementById('draw-7-btn');
    const handModal = document.getElementById('hand-modal');
    const closeHandBtn = document.getElementById('close-hand-btn');
    const mulliganBtn = document.getElementById('mulligan-btn');
    const drawOneBtn = document.getElementById('draw-one-btn');
    const handDisplay = document.getElementById('hand-display');

    let currentHand = [];

    // Open Modal
    draw7Btn.addEventListener('click', () => {
      drawHand(7);
      handModal.style.display = 'flex';
    });

    // Close Modal
    closeHandBtn.addEventListener('click', () => {
      handModal.style.display = 'none';
    });

    handModal.addEventListener('click', (e) => {
      if (e.target === handModal) {
        handModal.style.display = 'none';
      }
    });

    // Actions
    mulliganBtn.addEventListener('click', () => {
      drawHand(7);
    });

    drawOneBtn.addEventListener('click', () => {
      drawNextCard();
    });

    function drawHand(count) {
      currentHand = [];
      const deckCopy = [...deckCards];
      // Shuffle check? We can just pick random indices or shuffle copy.
      // Standard shuffle
      for (let i = deckCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deckCopy[i], deckCopy[j]] = [deckCopy[j], deckCopy[i]];
      }

      currentHand = deckCopy.slice(0, count);
      renderHand();
    }

    function drawNextCard() {
      // We need to know what remains.
      // Easiest is to keep a "shuffled deck" state or just pick a random card that isn't in hand?
      // Since it's just "draw one more", picking random from currently "in deck" implies we need to know the deck order.
      // Let's re-shuffle the WHOLE deck, ensure current hand is at top (already drawn), then pick next?
      // Or simpler: Hand is just a subset. 
      // To simulate "Draw one", we need to pick a card from the deck that is NOT in the current hand (by unique ref if possible, but basic lands might duplicate).
      // Actually, basic lands have unique IDs now.

      const inHandIds = new Set(currentHand.map(c => c.uniqueId));
      const available = deckCards.filter(c => !inHandIds.has(c.uniqueId));

      if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)];
        currentHand.push(pick);
        renderHand();
      }
    }

    function renderHand() {
      handDisplay.innerHTML = '';
      currentHand.forEach(card => {
        const el = CardUI.createCardElementForDeck(card);
        el.style.transformOrigin = 'top left';
        el.style.position = 'relative'; // Reset from any absolute
        el.style.margin = '0';
        handDisplay.appendChild(el);
      });
    }
  }

  // Init
  fetchCards();
});
