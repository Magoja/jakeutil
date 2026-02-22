class AppController {
  constructor() {
    this.loading = new LoadingOverlay();
    // State
    this.visualSpoilerSetCode = null;
    this.boosterSetCode = null;
    this.allSets = [];
  }

  async init() {
    this.loading.show('Loading sets...');
    this.allSets = await Scryfall.fetchAllSets();

    if (this.allSets.length === 0) {
      this.loading.showError('Failed to load sets.');
      return;
    }

    this.loading.hide();
    this.initVisualSpoilerSection();
    this.initOpenBoostersSection();

    // Global click to close dropdowns
    window.addEventListener('click', (e) => {
      document.querySelectorAll('.custom-select').forEach(select => {
        if (!select.contains(e.target)) {
          select.classList.remove('open');
        }
      });
    });
  }

  initVisualSpoilerSection() {
    // Rules: No 'expansion' check required, just date logic to avoid far future sets.
    const visualSets = SetUtils.filterSets(this.allSets, { maxAgeDays: 180 });
    const initVisualSet = SetUtils.findPreferredSet(visualSets);

    this.setupDropdown('.custom-select-wrapper:not(#booster-select-wrapper)', visualSets, (set) => {
      this.visualSpoilerSetCode = set.code;
      console.log("Visual Set:", set.code);
      localStorage.setItem('mtg_limited_last_set', set.code);
    }, initVisualSet);

    // Play/Open button for Visual Spoiler
    const playBtn = document.getElementById('play-button');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (this.visualSpoilerSetCode) {
          window.location.href = `list.html?set=${this.visualSpoilerSetCode}`;
        } else {
          alert("Please select a set first.");
        }
      });
    }

    // Shortcuts
    const shortcutContainer = document.getElementById('shortcut-container');
    if (shortcutContainer && visualSets.length > 0) {
      this.createSetShortcuts(shortcutContainer, visualSets, 16);
    }
    this.updateQuickStartButton(SetUtils.findDefaultSet(visualSets));
  }

  initOpenBoostersSection() {
    // Rules: Limited relevant sets only (core, expansion, masters, draft_innovation)
    const limitedTypes = ['core', 'expansion', 'masters', 'draft_innovation'];
    const boosterSets = SetUtils.filterSets(this.allSets, { maxAgeDays: 14, validTypes: limitedTypes });

    // Default to latest
    const initBoosterSet = boosterSets[0];

    this.setupDropdown('#booster-select-wrapper', boosterSets, (set) => {
      this.boosterSetCode = set.code;
      console.log("Booster Set:", set.code);
    }, initBoosterSet);

    const boosterOpenBtn = document.getElementById('booster-open-button');
    if (boosterOpenBtn) {
      boosterOpenBtn.addEventListener('click', () => {
        if (this.boosterSetCode) {
          const seed = RNG.generateSeed();
          window.location.href = `booster.html?set=${this.boosterSetCode}&seed=${seed}`;
        } else {
          alert("Please select a set first.");
        }
      });
    }

    const sealedOpenBtn = document.getElementById('sealed-open-button');
    if (sealedOpenBtn) {
      sealedOpenBtn.addEventListener('click', () => {
        if (this.boosterSetCode) {
          const seed = RNG.generateSeed();
          window.location.href = `sealed.html?set=${this.boosterSetCode}&seed=${seed}`;
        } else {
          alert("Please select a set first.");
        }
      });
    }
  }

  // Generic Dropdown Setup
  setupDropdown(wrapperSelector, sets, onSelect, defaultSet = null) {
    const wrapper = document.querySelector(wrapperSelector);
    if (!wrapper) return;

    const select = wrapper.querySelector('.custom-select');
    const trigger = wrapper.querySelector('.custom-select__trigger span');
    const optionsContainer = wrapper.querySelector('.custom-select__options');

    // Clear existing options
    optionsContainer.innerHTML = '';

    // Create Search Wrapper and Input
    const searchWrapper = document.createElement('div');
    searchWrapper.classList.add('custom-select__search-wrapper');
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.classList.add('custom-select__search');
    searchInput.placeholder = 'Search sets...';
    searchWrapper.appendChild(searchInput);

    // Prevent click on search input from closing the dropdown, but do not stop propagation to window
    // so we handle it more carefully. Actually stopPropagation on wrapper is fine if we also handle window close correctly.
    searchWrapper.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    optionsContainer.appendChild(searchWrapper);

    const matchElements = [];

    function updateTrigger(set) {
      trigger.innerHTML = `
            <div style="display: flex; align-items: center;">
                  <img src="${set.icon_svg_uri}" class="icon" alt="${set.name}" style="height: 20px; width: 20px; margin-right: 10px;">
                  ${set.name}
            </div>
        `;
    }

    sets.forEach(set => {
      const option = document.createElement('div');
      option.classList.add('custom-option');
      option.dataset.value = set.code;

      const isFuture = SetUtils.daysFromToday(set.released_at) > 0;
      const releasedText = isFuture ? ` (Releases: ${set.released_at})` : '';

      option.innerHTML = `
                <img src="${set.icon_svg_uri}" class="icon" alt="${set.name}">
                <span>${set.name}${releasedText}</span>
            `;

      // Store references for search filtering
      matchElements.push({ element: option, name: set.name.toLowerCase() });

      option.addEventListener('click', function (e) {
        e.stopPropagation(); // Prevent bubble to select/window
        select.classList.remove('open');

        // Update UI
        updateTrigger(set);

        // Update selected class
        wrapper.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
        this.classList.add('selected');

        // Callback
        onSelect(set);
      });
      optionsContainer.appendChild(option);
    });

    // Search Filtering Logic
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      matchElements.forEach(item => {
        if (item.name.includes(term)) {
          item.element.style.display = 'flex';
        } else {
          item.element.style.display = 'none';
        }
      });
    });

    // Trigger Click
    const triggerBtn = wrapper.querySelector('.custom-select__trigger');
    triggerBtn.addEventListener('click', function (e) {
      e.stopPropagation(); // Prevent bubble to window
      // Close other dropdowns
      document.querySelectorAll('.custom-select.open').forEach(openSelect => {
        if (openSelect !== select) {
          openSelect.classList.remove('open');
        }
      });

      const isOpen = select.classList.contains('open');
      if (isOpen) {
        select.classList.remove('open');
      } else {
        select.classList.add('open');
        // Reset Search
        searchInput.value = '';
        matchElements.forEach(item => {
          item.element.style.display = 'flex';
        });
        // Focus the input
        searchInput.focus();
      }
    });

    // Default Selection
    if (defaultSet) {
      const option = Array.from(optionsContainer.children).find(opt => opt.dataset.value === defaultSet.code);
      if (option) {
        updateTrigger(defaultSet);
        option.classList.add('selected');
        onSelect(defaultSet);
      }
    }
  }

  createSetButton(set) {
    const btn = document.createElement('button');
    btn.classList.add('shortcut');

    btn.innerHTML = `
        <img src="${set.icon_svg_uri}" alt="">
        <span>${set.name}</span>
    `;

    btn.addEventListener('click', () => {
      window.location.href = `list.html?set=${set.code}`;
    });
    return btn;
  }

  createSetShortcuts(shortcutContainer, sets, count) {
    const latest = SetUtils.filterLimitedGameSets(sets).slice(0, count);
    latest.forEach(set => {
      shortcutContainer.appendChild(this.createSetButton(set));
    });
  }

  updateQuickStartButton(set) {
    const quickStartBtn = document.getElementById('default-set-btn');

    if (quickStartBtn && set) {
      quickStartBtn.innerHTML = `
            <img src="${set.icon_svg_uri}" alt="">
            <span>Go to ${set.name}</span>
        `;
      quickStartBtn.onclick = () => {
        window.location.href = `list.html?set=${set.code}`;
      };
      quickStartBtn.style.display = 'flex';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new AppController();
  app.init();
});
