const SeedUtils = {
  /**
   * Updates the URL with the given seed.
   * @param {string} seed - The seed to set.
   * @param {boolean} reload - Whether to reload the page or just replace state.
   */
  updateUrlWithSeed(seed, reload = false) {
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('seed', seed);
    if (reload) {
      window.location.href = newUrl.toString();
    } else {
      window.history.replaceState({}, '', newUrl);
    }
  },

  /**
   * Ensures a seed exists in the URL parameters.
   * If not, generates one, updates the URL, and returns it.
   * @param {URLSearchParams} params - The URL search params.
   * @returns {string} The active seed.
   */
  ensureSeed(params) {
    let seed = params.get('seed');
    if (!seed) {
      seed = RNG.generateSeed();
      this.updateUrlWithSeed(seed, false);
    }
    return seed;
  }
};
