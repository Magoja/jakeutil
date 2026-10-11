const CostcoShared = {
  async loadConfig(specialInsertMethod = 'push') {
    try {
      const resp = await fetch('config.json');
      const config = await resp.json();

      this.assignColors(config);

      const specialCategory = {
        name: "Special",
        color: "#607d8b", // slate gray instead of black for visibility
        items: []
      };

      if (specialInsertMethod === 'unshift') {
        config.categories.unshift(specialCategory);
      } else {
        config.categories.push(specialCategory);
      }

      return config;
    } catch (e) {
      console.error("Failed to load config", e);
      return { categories: [] };
    }
  },

  assignColors(config) {
    const total = config.categories.length;
    config.categories.forEach((cat, index) => {
      // Calculate a hue from 0 to 300 (red to magenta)
      const hue = Math.floor((index / Math.max(1, total - 1)) * 300);
      cat.color = `hsl(${hue}, 70%, 50%)`;
    });
  }
};
