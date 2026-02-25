class PlayApp {
  constructor() {
    this.params = new URLSearchParams(window.location.search);
    this.setCode = this.params.get('set');
    this.seed = this.params.get('seed');
    this.deckParam = this.params.get('deck');

    this.loading = new LoadingOverlay();

    this.allCards = [];

    // Zones
    this.library = [];
    this.hand = [];
    this.battlefield = [];
    this.graveyard = [];
    this.exile = [];

    this.mulliganCount = 0;
    this.cardsToBottom = [];

    this.life = 20;

    // UI elements
    this.zones = {
      battlefield: document.getElementById('battlefield'),
      hand: document.getElementById('hand-zone'),
      libraryStack: document.getElementById('library-stack'),
      graveyardStack: document.getElementById('graveyard-stack'),
      exileStack: document.getElementById('exile-stack')
    };

    // Card Dragging State
    this.draggedCardData = null;
    this.draggedCardEl = null;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  async init() {
    if (!this.setCode || !this.deckParam) {
      this.loading.showError("Missing setting or deck parameter.");
      return;
    }

    try {
      this.loading.show("Loading Deck...");
      const [poolSuccess] = await Promise.all([
        BoosterLogic.fetchAndBuildPool(this.setCode)
      ]);

      if (poolSuccess) {
        this.allCards = [];
        // Extract basic lands from BoosterLogic
        const pool = [];
        const rng = RNG.create(this.seed);
        for (let i = 0; i < 6; i++) {
          pool.push(...BoosterLogic.generatePack(rng));
        }
        pool.forEach((c, i) => c.uniqueId = `card-${i}`);
        this.allCards.push(...pool);

        const basicLands = BoosterLogic.getBasicLands();

        // Re-construct deck
        const result = DeckSerializer.deserialize(this.deckParam, this.allCards);

        // Add basic lands
        Object.keys(result.landCounts).forEach(type => {
          const count = result.landCounts[type];
          if (count > 0) {
            const landMap = { 'W': 'Plains', 'U': 'Island', 'B': 'Swamp', 'R': 'Mountain', 'G': 'Forest' };
            const variants = basicLands.filter(c => c.name === landMap[type]);
            const pick = variants.length > 0 ? (variants.find(c => c.full_art) || variants[0]) : null;
            if (pick) {
              for (let i = 0; i < count; i++) {
                const land = JSON.parse(JSON.stringify(pick));
                land.uniqueId = `land-${type}-${Date.now()}-${Math.random()}`;
                result.deckCards.push(land);
              }
            }
          }
        });

        this.library = [...result.deckCards];
        this.shuffleLibrary();

        this.setupEventListeners();
        this.updateLifeUI();
        this.renderAllZones();

        // Initialize zoom (with playtest-specific storage key and default 0.7)
        UIUtils.initZoomControl('playtest-zoom', 0.7);

        this.loading.hide();
        this.showMulliganModal();
      } else {
        this.loading.showError("Failed to load cards.");
      }
    } catch (e) {
      console.error(e);
      this.loading.showError("Error initializing play environment.");
    }
  }

  shuffleLibrary() {
    for (let i = this.library.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.library[i], this.library[j]] = [this.library[j], this.library[i]];
    }
  }

  setupEventListeners() {
    document.getElementById('back-btn').addEventListener('click', (e) => {
      e.preventDefault();
      const url = new URL('sealed.html', window.location.href);
      url.searchParams.set('set', this.setCode);
      url.searchParams.set('seed', this.seed);
      url.searchParams.set('deck', this.deckParam);
      window.location.href = url.toString();
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
      if (confirm('Restart game?')) window.location.reload();
    });

    document.getElementById('untap-btn')?.addEventListener('click', () => {
      this.battlefield.forEach(item => item.tapped = false);
      this.renderBattlefield();
    });

    document.getElementById('close-message-modal-btn')?.addEventListener('click', () => {
      document.getElementById('message-modal').style.display = 'none';
    });

    const optionsMenu = document.getElementById('options-menu');
    document.getElementById('options-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      optionsMenu.style.display = optionsMenu.style.display === 'none' ? 'flex' : 'none';
    });
    document.addEventListener('click', () => {
      optionsMenu.style.display = 'none';
    });
    optionsMenu.addEventListener('click', (e) => {
      e.stopPropagation(); // keep menu open when interacting with zoom buttons
    });

    // Life counter
    document.getElementById('life-plus').addEventListener('click', () => { this.life++; this.updateLifeUI(); });
    document.getElementById('life-minus').addEventListener('click', () => { this.life--; this.updateLifeUI(); });

    // Library Controls
    document.getElementById('lib-draw').addEventListener('click', () => {
      this.libraryTopRevealed = false; // Reset reveal when drawing
      this.drawCard();
    });
    document.getElementById('lib-reveal').addEventListener('click', () => {
      if (this.library.length > 0) {
        this.libraryTopRevealed = !this.libraryTopRevealed;
        this.renderAllZones();
      }
    });
    document.getElementById('lib-peek')?.addEventListener('click', () => {
      if (this.library.length > 0) {
        this.showMessage("Top card: " + this.library[this.library.length - 1].name);
      }
    });
    document.getElementById('lib-search').addEventListener('click', () => this.showListModal('Library', this.library));

    // Graveyard / Exile Controls (Clicking the whole zone)
    document.getElementById('graveyard-zone').addEventListener('click', () => this.showListModal('Graveyard', this.graveyard));
    document.getElementById('exile-zone').addEventListener('click', () => this.showListModal('Exile', this.exile));

    // Mulligan Modal
    document.getElementById('mulligan-action-btn').addEventListener('click', () => {
      this.mulliganCount++;
      // Shuffle hand + bottom cards back into library
      this.library.push(...this.hand, ...this.cardsToBottom);
      this.hand = [];
      this.cardsToBottom = [];
      this.shuffleLibrary();
      this.showMulliganModal();
    });

    document.getElementById('accept-hand-btn').addEventListener('click', () => {
      const modal = document.getElementById('mulligan-modal');
      modal.style.display = 'none';
      if (this.cardsToBottom.length > 0) {
        this.library.unshift(...this.cardsToBottom); // Put on bottom (index 0)
        this.cardsToBottom = [];
      }
      this.renderAllZones();
    });

    // Drag & Drop zones (Battlefield, Hand, etc.)
    this.setupDropZone(this.zones.battlefield, 'battlefield');
    this.setupDropZone(this.zones.hand, 'hand');
    this.setupDropZone(document.getElementById('graveyard-zone'), 'graveyard');
    this.setupDropZone(document.getElementById('exile-zone'), 'exile');

    // Battlefield Custom Drag Logic
    this.zones.battlefield.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    this.zones.battlefield.addEventListener('drop', (e) => {
      e.preventDefault();
      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data && data.uniqueId) {
          const rect = this.zones.battlefield.getBoundingClientRect();
          const x = e.clientX - rect.left - (data.offsetX || 100);
          const y = e.clientY - rect.top - (data.offsetY || 140);
          this.moveCardTo(data.uniqueId, 'battlefield', { x, y });
        }
      } catch (err) { }
    });
  }

  updateLifeUI() {
    document.getElementById('life-total').textContent = this.life;
  }

  drawCard() {
    if (this.library.length > 0) {
      const card = this.library.pop();
      this.hand.push(card);
      this.renderAllZones();
    }
  }

  // --- Mulligan Logic ---

  showMulliganModal() {
    this.cardsToBottom = [];
    const drawCount = 7;
    for (let i = 0; i < drawCount; i++) {
      if (this.library.length > 0) {
        this.hand.push(this.library.pop());
      }
    }
    this.renderMulliganHand();
    const modal = document.getElementById('mulligan-modal');
    modal.style.display = 'flex';
  }

  renderMulliganHand() {
    const display = document.getElementById('mulligan-hand-display');
    display.innerHTML = '';

    const maxBottom = this.mulliganCount;
    document.getElementById('mulligan-instructions').textContent = maxBottom > 0
      ? `Mulligan ${this.mulliganCount}. Click up to ${maxBottom} cards to put on bottom of library.`
      : `Opening Hand. You may mulligan.`;

    this.hand.forEach(card => {
      const el = CardUI.createCardElementForDeck(card);
      el.style.cursor = 'pointer';

      const isBottomed = this.cardsToBottom.find(c => c.uniqueId === card.uniqueId);
      if (isBottomed) {
        el.style.opacity = '0.4';
        el.style.transform = 'scale(0.9)';
      }

      el.addEventListener('click', () => {
        if (isBottomed) {
          this.cardsToBottom = this.cardsToBottom.filter(c => c.uniqueId !== card.uniqueId);
          this.hand.push(card);
          this.renderMulliganHand();
        } else {
          if (this.cardsToBottom.length < maxBottom) {
            this.hand = this.hand.filter(c => c.uniqueId !== card.uniqueId);
            this.cardsToBottom.push(card);
            this.renderMulliganHand();
          }
        }
      });
      display.appendChild(el);
    });

    // Also show cards to bottom
    this.cardsToBottom.forEach(card => {
      const el = CardUI.createCardElementForDeck(card);
      el.style.cursor = 'pointer';
      el.style.opacity = '0.4';
      el.style.transform = 'scale(0.9)';
      el.addEventListener('click', () => {
        this.cardsToBottom = this.cardsToBottom.filter(c => c.uniqueId !== card.uniqueId);
        this.hand.push(card);
        this.renderMulliganHand();
      });
      display.appendChild(el);
    });
  }

  showMessage(msg) {
    document.getElementById('message-modal-text').textContent = msg;
    document.getElementById('message-modal').style.display = 'flex';
  }

  // --- Rendering Zones ---

  renderAllZones() {
    this.renderHand();
    this.renderBattlefield();
    this.updateStackCount(document.getElementById('library-zone'), this.library, 'Library');
    this.updateStackCount(document.getElementById('graveyard-zone'), this.graveyard, 'Graveyard');
    this.updateStackCount(document.getElementById('exile-zone'), this.exile, 'Exile');
  }

  updateStackCount(zoneEl, arr, name) {
    const title = zoneEl.querySelector('.zone-title');
    if (title) title.textContent = `${name} (${arr.length})`;

    const stack = zoneEl.querySelector('div[id$="-stack"]');
    if (stack) {
      stack.innerHTML = '';
      if (arr.length > 0) {
        if (name === 'Library') {
          // Just top card for library
          const card = arr[arr.length - 1];
          const el = CardUI.createCardElementForDeck(card);

          if (!this.libraryTopRevealed) {
            el.innerHTML = `<img src="https://backs.scryfall.io/large/0/a/0aeebaf5-8c7d-4636-9e82-8c27447861f7.jpg" style="width: 100%; height: 100%; object-fit: fill; border-radius: 9px; box-shadow: inset 0 0 10px #000;">`;
          }

          el.classList.add('stacked-card');
          el.style.marginLeft = '0';
          this.makeDraggable(el, card, name.toLowerCase());
          stack.appendChild(el);
        } else {
          // Stack up to 5 cards downward so names are visible
          const maxDisplay = 5;
          const startIdx = Math.max(0, arr.length - maxDisplay);
          const cardsToShow = arr.slice(startIdx);
          const count = cardsToShow.length;

          cardsToShow.forEach((card, index) => {
            const el = CardUI.createCardElementForDeck(card);
            el.style.position = 'absolute';
            el.style.marginLeft = '0'; // remove standard hand overlap

            // Oldest card at top: 0. Newest at bottom: (count-1)*25
            el.style.top = (index * 25) + 'px';

            el.style.zIndex = index; // Newest card on top
            this.makeDraggable(el, card, name.toLowerCase());

            if (name === 'Graveyard' || name === 'Exile') {
              el.addEventListener('click', (e) => {
                e.stopPropagation();
                // Move card to center of battlefield roughly
                const playmatRect = document.querySelector('.playmat').getBoundingClientRect();
                const centerXPct = (playmatRect.width / 2) - 100;
                const centerYPct = (playmatRect.height / 2) - 140;
                this.moveCardTo(card.uniqueId, 'battlefield', { x: Math.max(0, centerXPct), y: Math.max(0, centerYPct) });
              });
            }

            stack.appendChild(el);
          });
        }
      }
    }
  }

  renderHand() {
    this.zones.hand.innerHTML = '<div class="zone-title">Hand (' + this.hand.length + ')</div>';
    this.hand.forEach(card => {
      const el = CardUI.createCardElementForDeck(card);
      this.makeDraggable(el, card, 'hand');
      this.zones.hand.appendChild(el);
    });
  }

  renderBattlefield() {
    this.zones.battlefield.innerHTML = '';
    this.battlefield.forEach(item => {
      const el = CardUI.createCardElementForDeck(item.card);
      el.style.left = item.x + 'px';
      el.style.top = item.y + 'px';
      if (item.tapped) el.classList.add('tapped');

      this.makeDraggable(el, item.card, 'battlefield');

      // Tap/Untap on click
      let isDragging = false;
      el.addEventListener('mousedown', () => isDragging = false);
      el.addEventListener('mousemove', () => isDragging = true);
      el.addEventListener('click', (e) => {
        if (!isDragging) {
          item.tapped = !item.tapped;
          if (item.tapped) el.classList.add('tapped');
          else el.classList.remove('tapped');
        }
      });

      this.zones.battlefield.appendChild(el);
    });
  }

  // --- Drag and Drop logic ---

  makeDraggable(el, card, sourceZone) {
    el.draggable = true;
    el.addEventListener('dragstart', (e) => {
      el.classList.add('dragging');
      const rect = el.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      e.dataTransfer.setData('text/plain', JSON.stringify({
        uniqueId: card.uniqueId,
        source: sourceZone,
        offsetX: offsetX,
        offsetY: offsetY
      }));
      e.dataTransfer.effectAllowed = 'move';
    });

    el.addEventListener('dragend', (e) => {
      el.classList.remove('dragging');
    });
  }

  setupDropZone(zoneEl, zoneName) {
    if (zoneName !== 'battlefield') {
      zoneEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      zoneEl.addEventListener('drop', (e) => {
        e.preventDefault();
        try {
          const data = JSON.parse(e.dataTransfer.getData('text/plain'));
          if (data && data.uniqueId) {
            let insertIndex = null;
            if (zoneName === 'hand') {
              const children = Array.from(zoneEl.children).filter(c => c.classList.contains('card-item'));
              for (let i = 0; i < children.length; i++) {
                const cRect = children[i].getBoundingClientRect();
                if (e.clientX < cRect.left + (cRect.width / 2)) {
                  insertIndex = i;
                  break;
                }
              }
            }
            this.moveCardTo(data.uniqueId, zoneName, null, insertIndex);
          }
        } catch (err) { }
      });
    }
  }

  moveCardTo(uniqueId, destZone, posInfo = null, insertIndex = null) {
    // Find card in current zone
    let card = null;
    let bfItem = null;

    if (this.hand.some(c => c.uniqueId === uniqueId)) {
      card = this.hand.find(c => c.uniqueId === uniqueId);
      this.hand = this.hand.filter(c => c.uniqueId !== uniqueId);
    } else if (this.library.some(c => c.uniqueId === uniqueId)) {
      card = this.library.find(c => c.uniqueId === uniqueId);
      this.library = this.library.filter(c => c.uniqueId !== uniqueId);
      if (this.library.length === 0) this.libraryTopRevealed = false;
    } else if (this.graveyard.some(c => c.uniqueId === uniqueId)) {
      card = this.graveyard.find(c => c.uniqueId === uniqueId);
      this.graveyard = this.graveyard.filter(c => c.uniqueId !== uniqueId);
    } else if (this.exile.some(c => c.uniqueId === uniqueId)) {
      card = this.exile.find(c => c.uniqueId === uniqueId);
      this.exile = this.exile.filter(c => c.uniqueId !== uniqueId);
    } else if (this.battlefield.some(item => item.card.uniqueId === uniqueId)) {
      bfItem = this.battlefield.find(item => item.card.uniqueId === uniqueId);
      card = bfItem.card;
      this.battlefield = this.battlefield.filter(item => item.card.uniqueId !== uniqueId);
    }

    if (!card) return; // shouldn't happen

    if (destZone === 'hand') {
      if (insertIndex !== null) {
        this.hand.splice(insertIndex, 0, card);
      } else {
        this.hand.push(card);
      }
    } else if (destZone === 'library') {
      this.library.push(card); // top of library
    } else if (destZone === 'graveyard') {
      this.graveyard.push(card);
    } else if (destZone === 'exile') {
      this.exile.push(card);
    } else if (destZone === 'battlefield') {
      this.battlefield.push({
        card: card,
        x: posInfo ? posInfo.x : 100,
        y: posInfo ? posInfo.y : 100,
        tapped: bfItem ? bfItem.tapped : false
      });
    }

    this.renderAllZones();
  }

  // --- List Modal (for searching, viewing graveyard) ---

  showListModal(title, arr, isSearchFromLibrary = false) {
    const modal = document.getElementById('list-modal');
    document.getElementById('list-modal-title').textContent = title;
    const display = document.getElementById('list-modal-display');
    display.innerHTML = '';

    // Reverse for visual logic (top of library is last in array)
    const renderArr = [...arr].reverse();

    renderArr.forEach(card => {
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.gap = '5px';

      const el = CardUI.createCardElementForDeck(card);

      const controls = document.createElement('div');
      controls.style.textAlign = 'center';
      controls.style.display = 'flex';
      controls.style.flexWrap = 'wrap';
      controls.style.justifyContent = 'center';
      controls.style.gap = '2px';
      controls.style.width = '216px'; // Match card width

      ['Hand', 'Battlefield', 'Graveyard', 'Exile'].forEach(dest => {
        const btn = document.createElement('button');
        btn.textContent = `To ${dest}`;
        btn.className = 'action-button small';
        btn.style.height = '18px';
        btn.style.padding = '0 4px';
        btn.style.fontSize = '10px';
        btn.addEventListener('click', () => {
          modal.style.display = 'none';
          this.moveCardTo(card.uniqueId, dest.toLowerCase());
        });
        controls.appendChild(btn);
      });

      container.appendChild(el);
      container.appendChild(controls);
      display.appendChild(container);
    });

    const closeBtn = document.getElementById('close-list-modal-btn');
    closeBtn.onclick = () => {
      if (isSearchFromLibrary) {
        this.shuffleLibrary();
        this.showMessage("Library shuffled.");
      }
      modal.style.display = 'none';
      this.renderAllZones();
    };

    modal.style.display = 'flex';
  }

}

document.addEventListener('DOMContentLoaded', () => {
  const app = new PlayApp();
  app.init();
});
