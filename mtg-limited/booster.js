document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const setCode = params.get('set');
  const container = document.getElementById('booster-container');
  const loadingMessage = document.getElementById('loading-message');
  const setNameDisplay = document.getElementById('set-name-display');
  const openAnotherBtn = document.getElementById('open-another-btn');

  if (!setCode) {
    loadingMessage.textContent = "No set specified.";
    return;
  }

  loadingMessage.textContent = "Fetching set data from Scryfall...";

  // State
  const pool = {
    common: [],
    uncommon: [],
    rare: [],
    mythic: [],
    land: []
  };

  let isDataLoaded = false;

  // Fetch all cards
  async function fetchCards() {
    try {
      // Include unique:cards and -type:basic as before
      const cards = await Scryfall.fetchCards(`set:${setCode} unique:cards -type:basic`);

      if (cards.length > 0) {
        // Set name from first card
        const first = cards[0];
        if (first.set_name) setNameDisplay.textContent = `(${first.set_name})`;

        processCards(cards); // Populate pool
        isDataLoaded = true;
        loadingMessage.style.display = 'none';
        generateBooster();
      } else {
        loadingMessage.textContent = "No cards found.";
      }

    } catch (e) {
      console.error(e);
      loadingMessage.textContent = "Error loading cards.";
    }
  }

  function processCards(cards) {
    cards.forEach(card => {
      if (['common'].includes(card.rarity)) pool.common.push(card);
      else if (['uncommon'].includes(card.rarity)) pool.uncommon.push(card);
      else if (['rare'].includes(card.rarity)) pool.rare.push(card);
      else if (['mythic'].includes(card.rarity)) pool.mythic.push(card);
    });
  }

  function getRandomItem(array) {
    if (array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
  }

  // Helper to pick n unique from source array
  function pickN(amount, source) {
    const result = [];
    // If source is smaller than amount, allow dupes or return all
    if (source.length < amount) {
      for (let i = 0; i < amount; i++) result.push(getRandomItem(source));
      return result;
    }

    const indices = new Set();
    while (indices.size < amount) {
      indices.add(Math.floor(Math.random() * source.length));
    }
    indices.forEach(i => result.push(source[i]));
    return result;
  }

  function generateBooster() {
    if (!isDataLoaded) return;

    container.innerHTML = '';
    const pack = [];

    // Logic: 1 Rare/Mythic, 3 Uncommon, 10 Common

    // Slot 1: Rare/Mythic (Approx 1/8 chance of Mythic)
    const hasMythics = pool.mythic.length > 0;
    const isMythic = hasMythics && (Math.random() < 0.125); // 1/8

    if (isMythic) {
      pack.push(getRandomItem(pool.mythic));
    } else {
      if (pool.rare.length > 0) pack.push(getRandomItem(pool.rare));
      else if (pool.mythic.length > 0) pack.push(getRandomItem(pool.mythic)); // Fallback
    }

    // Slot 2-4: Uncommons (3)
    pack.push(...pickN(3, pool.uncommon));

    // Slot 5-14: Commons (10)
    pack.push(...pickN(10, pool.common));

    // Render
    pack.filter(c => c).forEach(card => {
      const img = document.createElement('img');
      img.src = Scryfall.getPrimaryImage(card);
      img.classList.add('card-img');
      img.alt = card.name;
      // Add hover or click effect if needed, currently just display
      container.appendChild(img);
    });
  }

  openAnotherBtn.addEventListener('click', generateBooster);

  // Initial fetch
  fetchCards();
});
