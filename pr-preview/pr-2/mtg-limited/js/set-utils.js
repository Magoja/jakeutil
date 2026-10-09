const SetUtils = {
  daysFromToday(dateString) {
    const today = new Date();
    const releaseDate = new Date(dateString);
    const timeDiff = releaseDate - today;
    return timeDiff / (1000 * 3600 * 24);
  },

  filterLimitedGameSets(sets) {
    const validTypes = ['core', 'expansion', 'masters', 'draft_innovation'];
    return sets.filter(set => validTypes.includes(set.set_type));
  },

  findDefaultSet(sets) {
    return this.filterLimitedGameSets(sets)[0];
  },

  findPreferredSet(sets) {
    // 1. Check localStorage for last viewed/selected set
    const lastSetCode = localStorage.getItem('mtg_limited_last_set');
    if (lastSetCode) {
      const lastSet = sets.find(s => s.code === lastSetCode);
      if (lastSet) return lastSet;
    }
    // 2. Fallback to default
    return this.findDefaultSet(sets);
  },

  filterSets(sets, { maxAgeDays = Infinity, validTypes = [] } = {}) {
    return sets.filter(set => {
      if (!set.released_at) return false;
      const days = this.daysFromToday(set.released_at);
      if (days > maxAgeDays) return false;
      if (validTypes.length > 0 && !validTypes.includes(set.set_type)) return false;
      return true;
    });
  }
};
