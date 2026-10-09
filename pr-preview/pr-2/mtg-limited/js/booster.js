class BoosterApp {
  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.setCode = params.get('set');
    this.seed = SeedUtils.ensureSeed(params);
    this.loading = new LoadingOverlay();

    this.container = document.getElementById('booster-container');
    this.openAnotherBtn = document.getElementById('open-another-btn');

    this.isDataLoaded = false;
  }

  async init() {
    if (!this.setCode) {
      this.loading.showError("No set specified.");
      return;
    }

    this.loading.show("Fetching set data...");

    this.setupEventListeners();
    this.setupUI();

    await this.fetchCards();
  }

  setupEventListeners() {
    this.openAnotherBtn.addEventListener('click', () => {
      this.seed = RNG.generateSeed();
      SeedUtils.updateUrlWithSeed(this.seed, false);
      this.generateBooster();
    });
  }

  setupUI() {
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
  }

  async fetchCards() {
    try {
      const success = await BoosterLogic.fetchAndBuildPool(this.setCode);

      if (success) {
        this.isDataLoaded = true;
        this.loading.hide();
        this.generateBooster();
      } else {
        this.loading.showError("No cards found.");
      }

    } catch (e) {
      console.error(e);
      this.loading.showError("Error loading cards.");
    }
  }

  generateBooster() {
    if (!this.isDataLoaded) return;

    const rng = RNG.create(this.seed);
    this.container.innerHTML = '';
    BoosterLogic.generatePack(rng).forEach(card => {
      this.container.appendChild(CardUI.createCardElement(card));
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new BoosterApp();
  app.init();
});
