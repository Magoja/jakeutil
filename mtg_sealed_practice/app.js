document.addEventListener('DOMContentLoaded', async () => {
  const loadingIndicator = document.getElementById('loading-indicator');
  const selectWrapper = document.querySelector('.custom-select-wrapper');
  const select = document.querySelector('.custom-select');
  const trigger = document.querySelector('.custom-select__trigger span');
  const optionsContainer = document.querySelector('.custom-select__options');
  let sets = [];

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
    sets = allSets.filter(filterSets);

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

    // Default select the first one (latest)
    if (optionsContainer.firstElementChild) {
      optionsContainer.firstElementChild.click();
    }
  }

  init();
});
