class SealedApp {
  constructor() {
    this.params = new URLSearchParams(window.location.search);
    this.setCode = this.params.get('set');
    this.seed = SeedUtils.ensureSeed(this.params);
    this.deckParam = this.params.get('deck');

    this.rng = RNG.create(this.seed);
    this.loading = new LoadingOverlay();

    this.container = document.querySelector('.sealed-container');
    this.poolArea = document.getElementById('pool-area');
    this.deckList = document.getElementById('deck-list');

    // State
    this.allCards = [];
    this.deckCards = [];
    this.poolCards = [];
    this.basicLands = [];
    this.currentSort = 'rarity';
    this.isGridView = false;
    this.isDeckFocus = false;

    this.activeFilters = new Set();
    this.keywordCounts = new Map();
  }

  async init() {
    if (!this.setCode) {
      this.loading.showError("No set specified.");
      return;
    }
    await this.fetchCards();
    this.setupEventListeners();
    this.initModals();
  }

  async fetchCards() {
    try {
      this.loading.show("Loading cards...");

      const [poolSuccess] = await Promise.all([
        BoosterLogic.fetchAndBuildPool(this.setCode),
        KeywordExtractor.loadSetRules(this.setCode)
      ]);

      if (poolSuccess) {
        this.basicLands = BoosterLogic.getBasicLands();

        this.generateSealedPool();

        if (this.deckParam) {
          this.handleDeckRestoration(this.deckParam);
        }

        this.calculateKeywords();
        this.render();
        this.initFilterModal();

        const customKws = KeywordExtractor.getCustomKeywordConfigs(this.setCode);
        if (Object.keys(customKws).length > 0) {
          const filterBtn = document.getElementById('filter-btn');
          if (filterBtn) {
            const shortLabel = filterBtn.querySelector('.short-label');
            if (shortLabel) shortLabel.textContent = 'F★';
            const fullLabel = filterBtn.querySelector('.full-label');
            if (fullLabel) fullLabel.textContent = 'Filter ★';
          }
        }

        this.loading.hide();
      } else {
        this.loading.showError("No cards found.");
      }

    } catch (e) {
      console.error(e);
      this.loading.showError("Error loading cards.");
    }
  }

  openPacks(count) {
    const cards = [];
    for (let i = 0; i < count; i++) {
      const pack = BoosterLogic.generatePack(this.rng);
      cards.push(...pack);
    }
    return cards;
  }

  assignUniqueId(cards) {
    cards.forEach((card, index) => {
      card.uniqueId = `card-${index}`;
    });
  }

  generateSealedPool() {
    const packs = this.openPacks(6);
    this.allCards.push(...packs);
    this.assignUniqueId(this.allCards);
    this.poolCards = [...this.allCards];
    this.deckCards = [];
  }

  // UI Rendering Core
  render() {
    const landStation = document.getElementById('land-station');
    if (landStation) {
      landStation.style.display = this.isDeckFocus ? 'flex' : 'none';
    }

    let filteredPool = this.poolCards;
    let filteredDeck = this.deckCards;

    if (this.activeFilters.size > 0) {
      const filterFn = (c) => {
        const kws = KeywordExtractor.getKeywords(c);
        return kws.some(k => this.activeFilters.has(k));
      };

      filteredPool = this.poolCards.filter(filterFn);
      filteredDeck = this.deckCards.filter(filterFn);
    }

    if (this.isDeckFocus) {
      this.container.classList.add('deck-focus');
      this.renderViewUI(filteredDeck, 'deck');
      this.renderPileUI(filteredPool, 'pool', 'Pile');
    } else {
      this.container.classList.remove('deck-focus');
      this.renderViewUI(filteredPool, 'pool');
      this.renderPileUI(filteredDeck, 'deck', 'Deck');
    }
    this.updateMetrics();
  }

  renderViewUI(cards, source) {
    this.poolArea.innerHTML = '';
    if (this.isGridView) {
      this.renderAsGrid(cards, this.poolArea, source);
    } else {
      this.renderAsColumns(cards, this.poolArea, source);
    }
  }

  renderPileUI(cards, source, titleLabel) {
    this.deckList.innerHTML = '';
    const pileHeader = document.querySelector('#deck-area h5');
    if (pileHeader) {
      pileHeader.innerHTML = `${titleLabel} (<span id="deck-count">${cards.length}</span>)`;
      this.deckCount = document.getElementById('deck-count');

      if (titleLabel === 'Pool') {
        pileHeader.style.color = '#967adc';
      } else {
        pileHeader.style.color = '';
      }
    }
    this.renderAsList(cards, this.deckList, source);
  }

  renderAsColumns(cards, container, source) {
    if (container.classList.contains('cards-grid')) {
      container.classList.remove('cards-grid');
    }
    const sortFn = source === 'deck' ? this.compareCardsForDeck.bind(this) : this.compareByCollectorNumber.bind(this);
    const groups = this.groupCards(cards, this.currentSort, sortFn);
    let keys = this.sortGroupKeys(Object.keys(groups), this.currentSort);

    keys.forEach(groupKey => {
      const column = document.createElement('div');
      column.classList.add('pool-column');
      column.dataset.groupKey = groupKey;

      const stack = document.createElement('div');
      stack.classList.add('card-stack');

      groups[groupKey].forEach(card => {
        const el = this.createDraggableCard(card, source);
        stack.appendChild(el);
      });

      column.appendChild(stack);
      container.appendChild(column);
    });
  }

  renderAsGrid(cards, container, source) {
    if (!container.classList.contains('cards-grid')) {
      container.classList.add('cards-grid');
    }
    const sortFn = source === 'deck' ? this.compareCardsForDeck.bind(this) : this.compareByCollectorNumber.bind(this);
    const groups = this.groupCards(cards, this.currentSort, sortFn);
    const keys = this.sortGroupKeys(Object.keys(groups), this.currentSort);

    const sorted = [];
    keys.forEach(key => {
      sorted.push(...groups[key]);
    });

    sorted.forEach(card => {
      const el = this.createDraggableCard(card, source);
      container.appendChild(el);
    });
  }

  renderAsList(cards, container, source) {
    const sortFn = source === 'deck' ? this.compareCardsForDeck.bind(this) : this.compareByCollectorNumber.bind(this);
    const sorted = [...cards].sort(sortFn);

    let target = container;
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
      const el = this.createDraggableCard(card, source);
      target.appendChild(el);
    });
  }

  updateMetrics() {
    let creatures = 0, lands = 0, spells = 0;

    this.deckCards.forEach(card => {
      const typeLine = card.type_line || (card.faces ? card.faces[0].type_line : '');
      if (typeLine.includes('Creature')) {
        creatures++;
      } else if (typeLine.includes('Land')) {
        lands++;
      } else {
        spells++;
      }
    });

    const draw7Btn = document.getElementById('draw-7-btn');
    if (draw7Btn) {
      draw7Btn.style.display = this.deckCards.length >= 40 ? 'inline-block' : 'none';
    }

    document.getElementById('metric-total').textContent = this.deckCards.length;
    document.getElementById('metric-creatures').textContent = creatures;
    document.getElementById('metric-spells').textContent = spells;
    document.getElementById('metric-lands').textContent = lands;
  }

  groupCards(cards, mode, sortFn = this.compareByCollectorNumber.bind(this)) {
    const groups = {};
    cards.forEach(card => {
      let key = this.getCardGroupKey(card, mode);
      if (!groups[key]) groups[key] = [];
      groups[key].push(card);
    });

    Object.keys(groups).forEach(key => {
      groups[key].sort(sortFn);
    });

    return groups;
  }

  // Drag & Drop
  createDraggableCard(card, source) {
    const el = CardUI.createCardElementForDeck(card);
    el.draggable = true;
    el.dataset.uniqueId = card.uniqueId;
    el.dataset.source = source;

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

    el.addEventListener('click', () => {
      const currentSource = el.dataset.source;
      this.moveCard(card.uniqueId, currentSource === 'pool' ? 'deck' : 'pool');
    });

    return el;
  }

  moveCard(uniqueId, destination) {
    const cardIndex = this.allCards.findIndex(c => c.uniqueId === uniqueId);
    if (cardIndex === -1) return;
    const card = this.allCards[cardIndex];

    if (destination === 'deck') {
      const idx = this.poolCards.findIndex(c => c.uniqueId === uniqueId);
      if (idx !== -1) {
        this.poolCards.splice(idx, 1);
        this.deckCards.push(card);
      }
    } else {
      if (card.isAddedLand) {
        this.removeBasicLand(uniqueId);
        return;
      }
      const idx = this.deckCards.findIndex(c => c.uniqueId === uniqueId);
      if (idx !== -1) {
        this.deckCards.splice(idx, 1);
        this.poolCards.push(card);
      }
    }

    const cardElement = document.querySelector(`.card-item[data-unique-id="${uniqueId}"]`);
    if (cardElement) {
      const parent = cardElement.parentElement;
      cardElement.remove();

      if (parent && parent.classList.contains('card-stack') && parent.children.length === 0) {
        const column = parent.parentElement;
        parent.remove();
        if (column && column.classList.contains('pool-column')) column.remove();
      }

      cardElement.dataset.source = destination;

      let targetContainer = null;
      let isListMode = false;

      if (this.isDeckFocus) {
        if (destination === 'deck') {
          targetContainer = this.poolArea;
          isListMode = false;
        } else {
          targetContainer = this.deckList;
          isListMode = true;
        }
      } else {
        if (destination === 'pool') {
          targetContainer = this.poolArea;
          isListMode = false;
        } else {
          targetContainer = this.deckList;
          isListMode = true;
        }
      }

      if (isListMode) {
        let listTarget = targetContainer;
        if (!targetContainer.classList.contains('deck-list')) {
          let wrapper = targetContainer.querySelector('.deck-list');
          if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.classList.add('deck-list');
            wrapper.style.paddingBottom = '300px';
            wrapper.style.width = '100%';
            targetContainer.appendChild(wrapper);
          }
          listTarget = wrapper;
        }
        const sortFn = destination === 'deck' ? this.compareCardsForDeck.bind(this) : this.compareByCollectorNumber.bind(this);
        this.insertCardIntoList(listTarget, cardElement, card, sortFn);
      } else {
        const sortFn = (this.isDeckFocus && destination === 'deck') ? this.compareCardsForDeck.bind(this) : this.compareByCollectorNumber.bind(this);
        if (targetContainer.classList.contains('cards-grid')) {
          this.insertCardSorted(targetContainer, cardElement, card, sortFn);
        } else {
          const group = this.getCardGroupKey(card, this.currentSort);
          this.insertCardIntoColumn(targetContainer, cardElement, card, group, sortFn);
        }
      }
    }

    this.updateMetrics();
    this.deckCount = document.getElementById('deck-count');
    if (this.deckCount) {
      if (this.isDeckFocus) {
        this.deckCount.textContent = this.poolCards.length;
      } else {
        this.deckCount.textContent = this.deckCards.length;
      }
    }
  }

  insertCardIntoList(container, el, card, sortFn = this.compareByCollectorNumber.bind(this)) {
    this.insertCardSorted(container, el, card, sortFn);
  }

  insertCardSorted(container, el, card, sortFn = this.compareByCollectorNumber.bind(this)) {
    const children = Array.from(container.children).filter(c => c.classList.contains('card-item'));
    let insertBefore = null;

    for (const child of children) {
      const childId = child.dataset.uniqueId;
      const childCard = this.allCards.find(c => c.uniqueId === childId);
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

  insertCardIntoColumn(container, el, card, groupKey, sortFn) {
    let column = Array.from(container.children).find(col => col.dataset.groupKey === groupKey);

    if (!column) {
      column = document.createElement('div');
      column.classList.add('pool-column');
      column.dataset.groupKey = groupKey;
      const stack = document.createElement('div');
      stack.classList.add('card-stack');
      column.appendChild(stack);
      container.appendChild(column);
    }

    const stack = column.querySelector('.card-stack');
    this.insertCardSorted(stack, el, card, sortFn);
  }

  handleDrop(destination) {
    return (e) => {
      e.preventDefault();
      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.source !== destination) {
          this.moveCard(data.uniqueId, destination);
        }
      } catch (err) {
        console.error("Drop error", err);
      }
    };
  }

  setupEventListeners() {
    this.poolArea.addEventListener('dragover', e => e.preventDefault());
    this.poolArea.addEventListener('drop', this.handleDrop('pool'));

    this.deckList.addEventListener('dragover', e => e.preventDefault());
    this.deckList.addEventListener('drop', this.handleDrop('deck'));

    document.getElementById('sort-color').addEventListener('click', () => { this.currentSort = 'color'; this.isGridView = false; this.resetPoolAreaStyle(); this.render(); });
    document.getElementById('sort-rarity').addEventListener('click', () => { this.currentSort = 'rarity'; this.isGridView = false; this.resetPoolAreaStyle(); this.render(); });
    document.getElementById('sort-type').addEventListener('click', () => { this.currentSort = 'type'; this.isGridView = false; this.resetPoolAreaStyle(); this.render(); });
    document.getElementById('sort-cmc').addEventListener('click', () => { this.currentSort = 'cmc'; this.isGridView = false; this.resetPoolAreaStyle(); this.render(); });

    document.getElementById('btn-layout').addEventListener('click', () => {
      this.isGridView = !this.isGridView;
      this.render();
    });

    document.querySelectorAll('.mana-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const colorKey = e.currentTarget.dataset.color;
        this.addBasicLand(colorKey);
      });
    });

    document.getElementById('toggle-view-btn').addEventListener('click', () => {
      this.isDeckFocus = !this.isDeckFocus;
      this.activeFilters.clear();
      this.resetPoolAreaStyle();
      this.currentSort = this.isDeckFocus ? 'cmc' : 'color';
      this.isGridView = false;
      this.render();
    });

    UIUtils.initZoomControl();
  }

  resetPoolAreaStyle() {
    this.poolArea.style.flexWrap = '';
    this.poolArea.style.overflowX = '';
    this.poolArea.style.overflowY = '';
    this.poolArea.style.alignItems = '';
    this.poolArea.style.justifyContent = '';
  }

  removeBasicLand(uniqueId) {
    const idx = this.deckCards.findIndex(c => c.uniqueId === uniqueId);
    if (idx !== -1) this.deckCards.splice(idx, 1);

    const acIdx = this.allCards.findIndex(c => c.uniqueId === uniqueId);
    if (acIdx !== -1) this.allCards.splice(acIdx, 1);

    const cardElement = document.querySelector(`.card-item[data-unique-id="${uniqueId}"]`);
    if (cardElement) cardElement.remove();

    this.updateMetrics();
    this.deckCount = document.getElementById('deck-count');
    if (this.deckCount) {
      if (!this.isDeckFocus) this.deckCount.textContent = this.deckCards.length;
    }
  }

  addBasicLand(colorKey) {
    const landMap = { 'W': 'Plains', 'U': 'Island', 'B': 'Swamp', 'R': 'Mountain', 'G': 'Forest' };
    const landName = landMap[colorKey];
    const variants = this.basicLands.filter(c => c.name === landName);
    let pick = null;

    if (variants.length > 0) {
      const fullArts = variants.filter(c => c.full_art);
      if (fullArts.length > 0) {
        pick = fullArts[Math.floor(Math.random() * fullArts.length)];
      } else {
        pick = variants[Math.floor(Math.random() * variants.length)];
      }
    } else return;

    const landCard = JSON.parse(JSON.stringify(pick));
    landCard.uniqueId = `land-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    landCard.isAddedLand = true;

    this.deckCards.push(landCard);
    this.allCards.push(landCard);

    const el = this.createDraggableCard(landCard, 'deck');

    if (this.isDeckFocus) {
      const group = this.getCardGroupKey(landCard, this.currentSort);
      this.insertCardIntoColumn(this.poolArea, el, landCard, group, this.compareCardsForDeck.bind(this));
      if (this.deckCount) this.deckCount.textContent = this.deckCards.length;
    } else {
      this.insertCardIntoList(this.deckList, el, landCard, this.compareCardsForDeck.bind(this));
    }

    this.updateMetrics();
  }

  calculateKeywords() {
    this.keywordCounts.clear();
    this.allCards.forEach(card => {
      const kws = KeywordExtractor.getKeywords(card);
      kws.forEach(k => {
        this.keywordCounts.set(k, (this.keywordCounts.get(k) || 0) + 1);
      });
    });
  }

  // Sorting utilities
  sortGroupKeys(keys, mode) {
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
    return keys.sort();
  }

  getCardGroupKey(card, mode) {
    const typeLine = card.type_line || (card.faces ? card.faces[0].type_line : '');
    if (mode === 'color') {
      const colors = card.colors || (card.faces ? card.faces[0].colors : []) || [];
      if (colors.length === 0) return 'Colorless';
      else if (colors.length > 1) return 'Multicolor';
      else return colors[0];
    } else if (mode === 'rarity') {
      return card.rarity;
    } else if (mode === 'type') {
      if (typeLine.includes('Creature')) return 'Creature';
      if (typeLine.includes('Instant')) return 'Instant';
      if (typeLine.includes('Sorcery')) return 'Sorcery';
      if (typeLine.includes('Enchantment')) return 'Enchantment';
      if (typeLine.includes('Artifact')) return 'Artifact';
      if (typeLine.includes('Land')) return 'Land';
      if (typeLine.includes('Planeswalker')) return 'Planeswalker';
      return 'Other';
    } else if (mode === 'cmc') {
      const cmc = Math.floor(card.cmc || 0);
      return cmc >= 7 ? '7+' : cmc.toString();
    }
    return 'Other';
  }

  compareByCollectorNumber(a, b) {
    const numA = parseInt(a.collector_number) || 0;
    const numB = parseInt(b.collector_number) || 0;
    if (numA !== numB) return numA - numB;
    return a.name.localeCompare(b.name);
  }

  compareCardsForDeck(a, b) {
    const getPriority = (card) => {
      const type = card.type_line || (card.faces ? card.faces[0].type_line : '');
      if (type.includes('Creature')) return 1;
      if (type.includes('Sorcery')) return 2;
      if (type.includes('Instant')) return 3;
      if (type.includes('Enchantment')) return 4;
      if (type.includes('Artifact')) return 5;
      if (type.includes('Planeswalker')) return 6;
      if (type.includes('Land')) return 7;
      return 8;
    };

    const priA = getPriority(a);
    const priB = getPriority(b);
    if (priA !== priB) return priA - priB;

    if (priA === 7) {
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

    const cmcA = a.cmc || 0;
    const cmcB = b.cmc || 0;
    if (cmcA !== cmcB) return cmcA - cmcB;

    return a.name.localeCompare(b.name);
  }

  handleDeckRestoration(encodedDeck) {
    const result = DeckSerializer.deserialize(encodedDeck, this.allCards);
    this.deckCards = [];
    if (result.deckCards.length > 0) {
      result.deckCards.forEach(card => {
        const idx = this.poolCards.findIndex(c => c.uniqueId === card.uniqueId);
        if (idx !== -1) {
          this.poolCards.splice(idx, 1);
          this.deckCards.push(card);
        }
      });
    }

    Object.keys(result.landCounts).forEach(type => {
      for (let i = 0; i < result.landCounts[type]; i++) {
        this.addBasicLand(type);
      }
    });

    if (this.deckCards.length > 0) {
      this.isDeckFocus = true;
      this.currentSort = 'cmc';
    }
  }

  // Modals Initialization
  initModals() {
    this.initFilterModal();
    this.initRerollModal();
    this.initHandModal();
    this.initShareModal();
  }

  initFilterModal() {
    const filterBtn = document.getElementById('filter-btn');
    if (!filterBtn) return;
    const filterModal = document.getElementById('filter-modal');
    const closeFilterBtn = document.getElementById('close-filter-btn');
    const clearFilterBtn = document.getElementById('clear-filter-btn');
    const container = document.getElementById('filter-keywords-container');

    const renderFilterCheckboxes = () => {
      container.innerHTML = '';
      const customConfigs = KeywordExtractor.getCustomKeywordConfigs(this.setCode);
      const customKwNames = new Set(Object.keys(customConfigs));
      const { customKws, genericKws } = this.sortAndGroupKeywords(customKwNames);

      if (customKws.length > 0) {
        container.appendChild(this.createSectionHeader('Custom Set Filters', false));
        customKws.forEach(k => container.appendChild(this.createCheckboxLabel(k, true, customConfigs[k])));
      }

      container.appendChild(this.createSectionHeader('Generic Filters', true));
      genericKws.forEach(k => container.appendChild(this.createCheckboxLabel(k, false)));
    };

    filterBtn.addEventListener('click', () => {
      renderFilterCheckboxes();
      filterModal.style.display = 'flex';
    });

    closeFilterBtn.addEventListener('click', () => { filterModal.style.display = 'none'; this.render(); });
    filterModal.addEventListener('click', (e) => { if (e.target === filterModal) filterModal.style.display = 'none'; });
    clearFilterBtn.addEventListener('click', () => { this.activeFilters.clear(); renderFilterCheckboxes(); this.render(); });
  }

  sortAndGroupKeywords(customKwNames) {
    const customKws = [];
    const genericKws = [];
    const sortedKeys = Array.from(this.keywordCounts.keys()).sort((a, b) => {
      const diff = this.keywordCounts.get(b) - this.keywordCounts.get(a);
      if (diff !== 0) return diff;
      return a.localeCompare(b);
    });

    sortedKeys.forEach(k => {
      if (!customKwNames.has(k)) genericKws.push(k);
    });
    customKwNames.forEach(k => customKws.push(k));

    return { customKws, genericKws };
  }

  createSectionHeader(title, hasTopMargin) {
    const header = document.createElement('div');
    header.style.width = '100%';
    header.style.fontWeight = 'bold';
    header.style.marginBottom = '5px';
    if (hasTopMargin) header.style.marginTop = '10px';
    header.textContent = title;
    return header;
  }

  createCheckboxLabel(k, isCustom, rules) {
    const count = this.keywordCounts.get(k) || 0;
    const label = document.createElement('label');

    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.marginRight = '10px';
    label.style.cursor = 'pointer';
    label.style.fontSize = isCustom ? '16px' : '14px';

    if (isCustom) {
      label.style.padding = '5px 10px';
      label.style.backgroundColor = '#e1d5eb';
      label.style.border = '1px solid #967adc';
      label.style.borderRadius = '4px';
      label.style.marginBottom = '5px';
      const ruleText = rules.map(r => `${r.property} ~= /${r.regex}/`).join(" OR ");
      label.title = `Looking for:\n${ruleText}`;
    }

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = k;
    cb.checked = this.activeFilters.has(k);
    cb.style.marginRight = '5px';

    cb.addEventListener('change', () => {
      if (cb.checked) this.activeFilters.add(k);
      else this.activeFilters.delete(k);
      this.render();
    });

    label.appendChild(cb);
    label.appendChild(document.createTextNode(`${k} (${count})`));
    return label;
  }

  initRerollModal() {
    const rerollModal = document.getElementById('reroll-modal');
    document.getElementById('open-another-btn').addEventListener('click', () => rerollModal.style.display = 'flex');
    document.getElementById('reroll-confirm').addEventListener('click', () => SeedUtils.updateUrlWithSeed(RNG.generateSeed(), true));
    document.getElementById('reroll-cancel').addEventListener('click', () => rerollModal.style.display = 'none');
    rerollModal.addEventListener('click', (e) => { if (e.target === rerollModal) rerollModal.style.display = 'none'; });
  }



  initHandModal() {
    const draw7Btn = document.getElementById('draw-7-btn');
    if (!draw7Btn) return;
    const handModal = document.getElementById('hand-modal');
    const handDisplay = document.getElementById('hand-display');
    let currentHand = [];

    const fitHandToScreen = () => {
      if (handModal.style.display === 'none') return;
      const cards = Array.from(handDisplay.children);
      const count = cards.length;
      if (count === 0) return;

      handDisplay.style.transform = 'none';
      handDisplay.style.zoom = '1';
      cards.forEach(c => c.style.width = '');

      const style = window.getComputedStyle(handDisplay);
      const containerWidth = handDisplay.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
      const containerHeight = handDisplay.clientHeight - (parseFloat(style.paddingTop) || 0) - (parseFloat(style.paddingBottom) || 0);

      if (containerWidth <= 0 || containerHeight <= 0) return;
      const gap = 4, aspectRatio = 2.5 / 3.5, buffer = 10;
      let bestWidth = 0;

      for (let cols = 1; cols <= count; cols++) {
        const rows = Math.ceil(count / cols);
        const wByWidth = (containerWidth - (cols - 1) * gap) / cols;
        const wByHeight = (containerHeight - buffer - (rows - 1) * gap) * aspectRatio / rows;
        const maxW = Math.min(wByWidth, wByHeight);
        if (maxW > bestWidth) { bestWidth = maxW; }
      }

      const applyWidth = Math.floor(bestWidth - 1);
      cards.forEach(c => {
        c.style.width = `${applyWidth}px`;
        c.style.height = `${applyWidth / aspectRatio}px`;
        c.style.maxWidth = 'none';
        c.style.maxHeight = 'none';
      });
    };

    const drawHand = (count) => {
      currentHand = [];
      const deckCopy = [...this.deckCards];
      for (let i = deckCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deckCopy[i], deckCopy[j]] = [deckCopy[j], deckCopy[i]];
      }
      currentHand = deckCopy.slice(0, count);
      handDisplay.innerHTML = '';
      currentHand.forEach(card => {
        const el = CardUI.createCardElementForDeck(card);
        el.style.transformOrigin = 'top left';
        el.style.position = 'relative';
        handDisplay.appendChild(el);
      });
      setTimeout(fitHandToScreen, 0);
    };

    document.getElementById('draw-7-btn').addEventListener('click', () => { drawHand(7); handModal.style.display = 'flex'; });
    document.getElementById('close-hand-btn').addEventListener('click', () => handModal.style.display = 'none');
    handModal.addEventListener('click', (e) => { if (e.target === handModal) handModal.style.display = 'none'; });
    document.getElementById('mulligan-btn').addEventListener('click', () => drawHand(7));
    document.getElementById('draw-one-btn').addEventListener('click', () => {
      const inHandIds = new Set(currentHand.map(c => c.uniqueId));
      const available = this.deckCards.filter(c => !inHandIds.has(c.uniqueId));
      if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)];
        currentHand.push(pick);
        const el = CardUI.createCardElementForDeck(pick);
        el.style.transformOrigin = 'top left';
        el.style.position = 'relative';
        handDisplay.appendChild(el);
        setTimeout(fitHandToScreen, 0);
      }
    });

    window.addEventListener('resize', fitHandToScreen);
  }

  initShareModal() {
    const shareModal = document.getElementById('share-modal');
    const urlInput = document.getElementById('share-url-input');
    const copyBtn = document.getElementById('share-copy-btn');

    document.getElementById('share-deck-btn').addEventListener('click', () => {
      const serialized = DeckSerializer.serialize(this.deckCards);
      const url = new URL(window.location.href);
      url.searchParams.set('deck', serialized);
      urlInput.value = url.toString();
      shareModal.style.display = 'flex';
      urlInput.select();
    });

    document.getElementById('share-close-btn').addEventListener('click', () => shareModal.style.display = 'none');

    copyBtn.addEventListener('click', () => {
      urlInput.select();
      document.execCommand('copy');
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy', 2000);
    });

    shareModal.addEventListener('click', (e) => {
      if (e.target === shareModal) shareModal.style.display = 'none';
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new SealedApp();
  app.init();
});