document.addEventListener('DOMContentLoaded', async () => {
  const loading = new LoadingOverlay();
  loading.show('Loading sets...');
  // Visual Spoiler State
  let visualSpoilerSetCode = null;
  // Open Booster State
  let boosterSetCode = null;

  // Helper to calculate date difference
  function daysFromToday(dateString) {
    const today = new Date();
    const releaseDate = new Date(dateString);
    const timeDiff = releaseDate - today;
    return timeDiff / (1000 * 3600 * 24);
  }

  // Generic Dropdown Setup
  function setupDropdown(wrapperSelector, sets, onSelect, defaultSet = null) {
    const wrapper = document.querySelector(wrapperSelector);
    if (!wrapper) return;

    const select = wrapper.querySelector('.custom-select');
    const trigger = wrapper.querySelector('.custom-select__trigger span');
    const optionsContainer = wrapper.querySelector('.custom-select__options');

    // Clear existing options
    optionsContainer.innerHTML = '';

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

      const isFuture = daysFromToday(set.released_at) > 0;
      const releasedText = isFuture ? ` (Releases: ${set.released_at})` : '';

      option.innerHTML = `
                <img src="${set.icon_svg_uri}" class="icon" alt="${set.name}">
                <span>${set.name}${releasedText}</span>
            `;

      option.addEventListener('click', function () {
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

    // Trigger Click
    const triggerBtn = wrapper.querySelector('.custom-select__trigger');
    triggerBtn.addEventListener('click', function (e) {
      e.stopPropagation(); // Prevent bubble to window
      // Close other dropdowns? For now just toggle this one.
      select.classList.toggle('open');
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

  // Global click to close dropdowns
  window.addEventListener('click', function (e) {
    document.querySelectorAll('.custom-select').forEach(select => {
      if (!select.contains(e.target)) {
        select.classList.remove('open');
      }
    });
  });

  function createSetButton(set) {
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

  function createSetShortcuts(shortcutContainer, sets, count) {
    const latest = filterLimitedGameSets(sets).slice(0, count);
    latest.forEach(set => {
      shortcutContainer.appendChild(createSetButton(set));
    });
  }

  function filterLimitedGameSets(sets) {
    const validTypes = ['core', 'expansion', 'masters', 'draft_innovation'];
    return sets.filter(set => validTypes.includes(set.set_type));
  }

  function findDefaultSet(sets) {
    return filterLimitedGameSets(sets)[0];
  }

  function findPreferredSet(sets) {
    // 1. Check localStorage for last viewed/selected set
    const lastSetCode = localStorage.getItem('mtg_limited_last_set');
    if (lastSetCode) {
      const lastSet = sets.find(s => s.code === lastSetCode);
      if (lastSet) return lastSet;
    }
    // 2. Fallback to default
    return findDefaultSet(sets);
  }

  function updateQuickStartButton(set) {
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

  function filterSets(sets, { maxAgeDays = Infinity, validTypes = [] } = {}) {
    return sets.filter(set => {
      if (!set.released_at) return false;
      const days = daysFromToday(set.released_at);
      if (days > maxAgeDays) return false;
      if (validTypes.length > 0 && !validTypes.includes(set.set_type)) return false;
      return true;
    });
  }

  async function init() {
    const allSets = await Scryfall.fetchAllSets();

    if (allSets.length === 0) {
      return;
    }

    loading.hide();

    // --- Visual Spoiler Section ---
    // Rules: No 'expansion' check required, just date logic to avoid far future sets.
    const visualSets = filterSets(allSets, { maxAgeDays: 180 });

    const initVisualSet = findPreferredSet(visualSets);

    // Note: Used '.custom-select-wrapper' in index.html for the first one manually, 
    // but now adding ID to second one. Let's assume the first one is just .custom-select-wrapper 
    // or we can add ID to it if we want, but simpler to just use class for first one if unique context.
    // Actually, simpler: I'll target the first one specifically or add ID in index.html?
    // I didn't add ID to first one in index.html. I only added ID for the booster one.
    // So distinct them by: .custom-select-wrapper:not(#booster-select-wrapper) ?

    setupDropdown('.custom-select-wrapper:not(#booster-select-wrapper)', visualSets, (set) => {
      visualSpoilerSetCode = set.code;
      console.log("Visual Set:", set.code);
      localStorage.setItem('mtg_limited_last_set', set.code);
    }, initVisualSet);

    // Play/Open button for Visual Spoiler
    document.getElementById('play-button').addEventListener('click', () => {
      if (visualSpoilerSetCode) {
        window.location.href = `list.html?set=${visualSpoilerSetCode}`;
      } else {
        alert("Please select a set first.");
      }
    });

    // Shortcuts
    const shortcutContainer = document.getElementById('shortcut-container');
    if (shortcutContainer && visualSets.length > 0) {
      createSetShortcuts(shortcutContainer, visualSets, 16);
    }
    updateQuickStartButton(findDefaultSet(visualSets));

    // --- Open Boosters Section ---
    // Rules: Limited relevant sets only (core, expansion, masters, draft_innovation)
    const limitedTypes = ['core', 'expansion', 'masters', 'draft_innovation'];
    const boosterSets = filterSets(allSets, { maxAgeDays: 14, validTypes: limitedTypes });

    // Default to latest
    const initBoosterSet = boosterSets[0]; // Since validTypes are usually what we want, and it's sorted by release usually? 
    // Scryfall returns usually sorted by date desc? Actually we should double check if we need sorting.
    // Assuming Scryfall API returns roughly chronological or reverse chronological. 
    // We'll just grab the first one as "Latest".

    setupDropdown('#booster-select-wrapper', boosterSets, (set) => {
      boosterSetCode = set.code;
      console.log("Booster Set:", set.code);
    }, initBoosterSet);

    document.getElementById('booster-open-button').addEventListener('click', () => {
      if (boosterSetCode) {
        const seed = RNG.generateSeed();
        window.location.href = `booster.html?set=${boosterSetCode}&seed=${seed}`;
      } else {
        alert("Please select a set first.");
      }
    });

    document.getElementById('sealed-open-button').addEventListener('click', () => {
      if (boosterSetCode) {
        const seed = RNG.generateSeed();
        window.location.href = `sealed.html?set=${boosterSetCode}&seed=${seed}`;
      } else {
        alert("Please select a set first.");
      }
    });
  }

  init();
});
