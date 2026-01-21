document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const setCode = params.get('set');
  const seed = SeedUtils.ensureSeed(params);
  const loading = new LoadingOverlay();

  const container = document.getElementById('booster-container');
  const openAnotherBtn = document.getElementById('open-another-btn');

  if (!setCode) {
    loading.showError("No set specified.");
    return;
  }

  loading.show("Fetching set data...");

  // State
  const pool = BoosterLogic.createPool();

  let isDataLoaded = false;

  // Fetch all cards
  async function fetchCards() {
    try {
      // Include unique:prints to get basics and variants
      const cards = await Scryfall.fetchCards(`set:${setCode} unique:prints`);

      if (cards.length > 0) {
        const { basics, others } = BoosterLogic.separateBasicLands(cards);

        BoosterLogic.processCards(others, pool); // Populate pool
        BoosterLogic.addBasics(pool, basics);

        isDataLoaded = true;
        loading.hide();
        generateBooster(seed);
      } else {
        loading.showError("No cards found.");
      }

    } catch (e) {
      console.error(e);
      loading.showError("Error loading cards.");
    }
  }

  function generateBooster(seed) {
    if (!isDataLoaded) return;

    const rng = RNG.create(seed);
    container.innerHTML = '';
    BoosterLogic.generatePackData(pool, rng).forEach(card => {
      container.appendChild(CardUI.createCardElement(card));
    });
  }

  openAnotherBtn.addEventListener('click', () => {
    const newSeed = RNG.generateSeed();
    SeedUtils.updateUrlWithSeed(newSeed, false);
    generateBooster(newSeed);
  });

  UIUtils.initModal({
    triggerId: 'btn-view-rules',
    modalId: 'rules-modal',
    closeId: 'close-rules-btn',
    onOpen: () => {
      const rulesContent = document.getElementById('rules-content');
      if (rulesContent) {
        rulesContent.innerHTML = UIUtils.renderRulesTableHTML(BoosterLogic.rules);
      }
    }
  });

  // Zoom Logic
  UIUtils.initZoomControl();
  fetchCards();
});
