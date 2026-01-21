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
  },

  renderRulesTableHTML(rules) {
    let html = '<table style="width: 100%; border-collapse: collapse; text-align: left;">';
    html += '<thead><tr><th style="border-bottom: 2px solid #ddd; padding: 8px;">Slot Name</th><th style="border-bottom: 2px solid #ddd; padding: 8px;">Count</th><th style="border-bottom: 2px solid #ddd; padding: 8px;">Pool Logic</th></tr></thead>';
    html += '<tbody>';

    rules.forEach(rule => {
      html += '<tr>';
      html += `<td style="border-bottom: 1px solid #ddd; padding: 8px;">${rule.name}</td>`;
      html += `<td style="border-bottom: 1px solid #ddd; padding: 8px;">${rule.count}</td>`;

      let poolDesc = '';
      if (rule.pool) {
        const parts = [];
        for (const [key, weight] of Object.entries(rule.pool)) {
          parts.push(`<b>${key}</b>: ${weight}`);
        }
        poolDesc = parts.join(', ');
      }

      html += `<td style="border-bottom: 1px solid #ddd; padding: 8px;">${poolDesc}</td>`;
      html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
  },

  initModal({ triggerId, modalId, closeId, onOpen }) {
    const trigger = document.getElementById(triggerId);
    const modal = document.getElementById(modalId);
    const closeBtn = document.getElementById(closeId);

    if (!trigger || !modal) return;

    trigger.addEventListener('click', () => {
      if (onOpen) onOpen();
      modal.style.display = 'flex';
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }
};
