document.addEventListener('DOMContentLoaded', async () => {
  const loadingIndicator = document.getElementById('loading-indicator');
  const selectWrapper = document.querySelector('.custom-select-wrapper');
  const select = document.querySelector('.custom-select');
  const trigger = document.querySelector('.custom-select__trigger span');
  const optionsContainer = document.querySelector('.custom-select__options');
  let sets = [];
  let currentSetCode = null;

  // Helper to calculate date difference
  function daysFromToday(dateString) {
    const today = new Date();
    const releaseDate = new Date(dateString);
    const timeDiff = releaseDate - today;
    return timeDiff / (1000 * 3600 * 24);
  }

  function filterSets(set) {
    // Filter sets
    // 1. set_type must be expansion
    // 2. released_at is not more than 2 weeks in future
    if (set.set_type !== 'expansion') return false;

    if (!set.released_at) return false;

    const days = daysFromToday(set.released_at);
    // If days > 14, it's too far in the future.
    // We want sets released in the past, OR sets releasing within 14 days.
    // days <= 14 means it is either in the past (negative or small positive) 
    // or in the near future.
    return days <= 14;
  }

  function selectSet(set, optionElement) {
    currentSetCode = set.code;

    // Update trigger text/icon
    trigger.innerHTML = `
        <div style="display: flex; align-items: center;">
              <img src="${set.icon_svg_uri}" class="icon" alt="${set.name}" style="height: 20px; width: 20px; margin-right: 10px;">
              ${set.name}
        </div>
    `;

    select.classList.remove('open');

    // Remove selected class from others
    document.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
    optionElement.classList.add('selected');

    console.log("Selected set:", set.code, set.name);
  }

  function createOption(set) {
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
      selectSet(set, this);
    });

    return option;
  }

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
    const latest = sets.slice(0, count);
    latest.forEach(set => {
      shortcutContainer.appendChild(createSetButton(set));
    });
  }

  async function fetchAllSets() {
    let url = 'https://api.scryfall.com/sets/'; // Initial URL
    let allSets = [];
    let hasMore = true;

    try {
      while (hasMore) {
        const response = await fetch(url);
        const data = await response.json();

        if (data.data) {
          allSets = allSets.concat(data.data);
        }

        hasMore = data.has_more;
        if (hasMore) {
          url = data.next_page;
        }
      }
      return allSets;

    } catch (error) {
      console.error("Error fetching sets:", error);
      loadingIndicator.textContent = "Error loading sets.";
      return [];
    }
  }

  async function init() {
    const allSets = await fetchAllSets();

    // Filter sets: Remove expansion check, but keep the "future" logic if we want to avoid very future sets?
    // Request said: "List all sets without filtering, except future sets with drop down combo."
    // Interpreting as: Show all sets in the dropdown.
    // However, usually we still want to filter out sets that are too far in the future to have cards.
    // The previous logic allowed sets released within 14 days.
    // I will remove the 'expansion' check. I will keep the date check to avoid listing sets 2 years out.
    sets = allSets.filter(set => {
      // Keep date logic for now (<= 14 days from now)
      if (!set.released_at) return false;
      const days = daysFromToday(set.released_at);
      return days <= 14;
    });

    // Populate options
    if (sets.length === 0) {
      loadingIndicator.textContent = "No valid sets found.";
      return;
    }

    loadingIndicator.style.display = 'none';

    sets.forEach(set => {
      optionsContainer.appendChild(createOption(set));
    });

    // Toggle dropdown open
    document.querySelector('.custom-select__trigger').addEventListener('click', function () {
      select.classList.toggle('open');
    });

    // Close dropdown if clicked outside
    window.addEventListener('click', function (e) {
      if (!select.contains(e.target)) {
        select.classList.remove('open');
      }
    });

    // Play/Open button handler
    document.getElementById('play-button').addEventListener('click', () => {
      if (currentSetCode) {
        window.location.href = `list.html?set=${currentSetCode}`;
      } else {
        alert("Please select a set first.");
      }
    });

    // Default select the first valid set (latest)
    if (sets.length > 0) {
      selectDefaultSet(sets);
    }

    // Add 4 shortcut buttons for the latest 4 sets
    const shortcutContainer = document.getElementById('shortcut-container');
    if (shortcutContainer && sets.length > 0) {
      createSetShortcuts(shortcutContainer, sets, 16);
    }
  }

  function selectDefaultSet(sets) {
    const validTypes = ['core', 'expansion', 'masters', 'draft_innovation'];
    // It's already sorted by date. Find the first matching set.
    const targetSet = sets.find(set => validTypes.includes(set.set_type));

    if (targetSet) {
      // Find the option element
      // We can iterate optionsContainer.children, or simpler:
      // Since we created options in order of 'sets', we can find it by value.
      const option = Array.from(optionsContainer.children).find(opt => opt.dataset.value === targetSet.code);
      if (option) {
        selectSet(targetSet, option);
      }
    } else if (sets.length > 0 && optionsContainer.firstElementChild) {
      // Fallback: select whatever is first if no "valid" type found
      selectSet(sets[0], optionsContainer.firstElementChild);
    }
  }

  init();
});
