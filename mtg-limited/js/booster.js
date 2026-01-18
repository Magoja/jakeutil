document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const setCode = params.get('set');
  const seed = SeedUtils.ensureSeed(params);

  // Initialize RNG
  const rng = RNG.create(seed);
  const loading = new LoadingOverlay();

  const container = document.getElementById('booster-container');
  const openAnotherBtn = document.getElementById('open-another-btn');

  if (!setCode) {
    loading.showError("No set specified.");
    return;
  }

  loading.show("Fetching set data from Scryfall...");

  // State
  const pool = BoosterLogic.createPool();

  let isDataLoaded = false;

  // Fetch all cards
  async function fetchCards() {
    try {
      // Include unique:cards and -type:basic as before
      const cards = await Scryfall.fetchCards(`set:${setCode} unique:cards -type:basic`);

      if (cards.length > 0) {
        BoosterLogic.processCards(cards, pool); // Populate pool
        isDataLoaded = true;
        loading.hide();
        generateBooster();
      } else {
        loading.showError("No cards found.");
      }

    } catch (e) {
      console.error(e);
      loading.showError("Error loading cards.");
    }
  }

  function generateBooster() {
    if (!isDataLoaded) return;

    container.innerHTML = '';

    BoosterLogic.generatePackData(pool, rng).forEach(card => {
      container.appendChild(CardUI.createCardElement(card));
    });
  }

  openAnotherBtn.addEventListener('click', () => {
    SeedUtils.updateUrlWithSeed(RNG.generateSeed(), true);
  });

  // Initial fetch
  fetchCards();
});
