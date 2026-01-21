const UIUtils = {
  saveSetting(key, value) {
    if (typeof Storage !== "undefined") {
      localStorage.setItem(key, value);
    }
  },

  loadSetting(key, defaultValue = null) {
    if (typeof Storage !== "undefined") {
      return localStorage.getItem(key) || defaultValue;
    }
    return defaultValue;
  },

  initZoomControl(storageKey = 'sealed-card-zoom') {
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');

    let currentZoom = parseFloat(this.loadSetting(storageKey) || 1);

    // Set initial bounds
    let minZoom = 0.5;
    let maxZoom = 2.0;

    // Mobile Adjustment
    if (window.innerWidth <= 600) {
      minZoom = 0.2;
      maxZoom = 1.0;
    }

    // Ensure initial is within bounds
    if (currentZoom < minZoom) currentZoom = minZoom;
    if (currentZoom > maxZoom) currentZoom = maxZoom;

    const updateZoom = (newZoom) => {
      // Round to avoid float precision issues
      newZoom = Math.round(newZoom * 10) / 10;

      if (newZoom < minZoom) newZoom = minZoom;
      if (newZoom > maxZoom) newZoom = maxZoom;

      currentZoom = newZoom;
      document.documentElement.style.setProperty('--card-scale', currentZoom);
      this.saveSetting(storageKey, currentZoom);
    };

    // Initial Apply
    updateZoom(currentZoom);

    if (zoomInBtn && zoomOutBtn) {
      zoomInBtn.addEventListener('click', () => {
        updateZoom(currentZoom + 0.1);
      });

      zoomOutBtn.addEventListener('click', () => {
        updateZoom(currentZoom - 0.1);
      });
    }
  }
};
