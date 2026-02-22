const app = {
  config: null,
  state: {
    selections: {}, // e.g. { "Meat": [ {name: "Bacon", count: 2} ] }
    currentCategory: null,
    ignoreClicks: false
  },

  async init() {
    this.config = await CostcoShared.loadConfig('push');
    this.loadState();
    this.renderCategories();
  },

  loadState() {
    try {
      const saved = localStorage.getItem('costco_builder_state');
      if (saved) {
        this.state.selections = JSON.parse(saved);
      }
    } catch (e) { }
  },

  saveState() {
    localStorage.setItem('costco_builder_state', JSON.stringify(this.state.selections));
    this.updateTotalSummary();
  },

  renderCategories() {
    const list = document.getElementById('category-list');
    list.innerHTML = '';

    this.config.categories.forEach(cat => {
      if (cat.name === 'Special') return; // Handled in html

      let count = 0;
      if (this.state.selections[cat.name]) {
        count = Object.values(this.state.selections[cat.name]).reduce((a, b) => a + b, 0);
      }

      const li = document.createElement('li');
      li.className = 'list-item';
      li.onclick = (e) => {
        // Prevent click from propagating down
        e.preventDefault();
        e.stopPropagation();
        this.showItems(cat.name);
      };

      li.style.background = count > 0 ? cat.color : '#666'; // Gray out empty categories
      // Dark text for light colors, white for dark wouldn't hurt. Since we have text-shadow, white text is safest.
      li.style.color = "white";

      li.innerHTML = `
        <div class="cat-name">${cat.name}</div>
        <div class="item-count ${count === 0 ? 'zero' : ''}" id="count-${cat.name}">${count}</div>
      `;
      list.appendChild(li);
    });

    // Update Special count
    let specialCount = 0;
    if (this.state.selections['Special']) {
      specialCount = Object.values(this.state.selections['Special']).reduce((a, b) => a + b, 0);
    }
    const specCountEl = document.getElementById('count-Special');
    const specCategoryItem = document.getElementById('category-special');
    if (specCountEl) {
      specCountEl.textContent = specialCount;
      specCountEl.className = `item-count ${specialCount === 0 ? 'zero' : ''}`;
    }
    if (specCategoryItem) {
      specCategoryItem.style.background = specialCount > 0 ? '#000' : '#666';
      specCategoryItem.style.color = 'white';
    }

    this.updateTotalSummary();
  },

  showCategories() {
    this.state.ignoreClicks = true;
    setTimeout(() => { this.state.ignoreClicks = false; }, 400);

    document.getElementById('category-view').classList.remove('slide-left');
    document.getElementById('item-view').classList.remove('active');
    document.getElementById('header-title').textContent = "Categories";
    document.getElementById('back-btn').style.display = 'none';
    this.state.currentCategory = null;
    this.renderCategories();
  },

  showItems(catName) {
    this.state.ignoreClicks = true;
    setTimeout(() => { this.state.ignoreClicks = false; }, 400);

    this.state.currentCategory = catName;
    const cat = this.config.categories.find(c => c.name === catName);

    document.getElementById('category-view').classList.add('slide-left');
    document.getElementById('item-view').classList.add('active');
    document.getElementById('header-title').textContent = catName;
    document.getElementById('back-btn').style.display = 'block';

    const addCustom = document.getElementById('add-custom-container');
    if (catName === 'Special') {
      addCustom.style.display = 'flex';
    } else {
      addCustom.style.display = 'flex'; // Allow custom everywhere
    }

    this.renderItemList(cat);
  },

  renderItemList(cat) {
    const list = document.getElementById('item-list');
    list.innerHTML = '';

    // Merge default items and custom selected items for this category
    const items = [...(cat.items || [])];
    const selected = this.state.selections[cat.name] || {};

    // Add custom ones that aren't in default list
    Object.keys(selected).forEach(selectedName => {
      if (!items.find(i => i === selectedName)) {
        items.push(selectedName);
      }
    });

    items.forEach(itemName => {
      const count = selected[itemName] || 0;

      const li = document.createElement('li');
      li.className = 'swipe-container';

      li.innerHTML = `
        <div class="swipe-background">
          <div class="swipe-bg-left">Add</div>
          <div class="swipe-bg-right">Remove</div>
        </div>
        <div class="swipe-content" data-item="${itemName}">
          <span>${itemName}</span>
          <span class="item-count ${count === 0 ? 'zero' : ''}">${count}</span>
        </div>
      `;
      list.appendChild(li);

      this.attachSwipe(li, itemName, cat.name);
    });
  },

  attachSwipe(container, itemName, catName) {
    const content = container.querySelector('.swipe-content');

    let startX = 0;
    let currentX = 0;
    let isSwiping = false;
    let isTouch = false;

    // Touch support
    content.addEventListener('touchstart', (e) => {
      // Don't preventDefault here or we lose scrolling, just flag it 
      // or stop subsequent mousedowns via property
      isTouch = true;
      startX = e.touches[0].clientX;
      isSwiping = true;
      content.classList.add('swiping');
    }, { passive: true });

    content.addEventListener('touchmove', (e) => {
      if (!isSwiping) return;
      currentX = e.touches[0].clientX - startX;
      // limit visual swipe
      if (currentX > 150) currentX = 150;
      if (currentX < -150) currentX = -150;
      content.style.transform = `translateX(${currentX}px)`;
    });

    content.addEventListener('touchend', (e) => {
      if (!isSwiping) return; // Prevent double-fires or orphaned touch ends

      isSwiping = false;
      content.classList.remove('swiping');

      // Detect click (< 10px swipe)
      if (Math.abs(currentX) < 10) {
        currentX = 0; // Reset just in case
        content.style.transition = 'transform 0.2s ease-out';
        content.style.transform = `translateX(150px)`;

        setTimeout(() => {
          this.addItem(catName, itemName);
          content.style.transform = `translateX(0px)`;
          // Let isTouch decay after a click
          setTimeout(() => isTouch = false, 300);
        }, 200);
        return;
      }

      content.style.transform = `translateX(0px)`;

      if (currentX > 80) {
        this.addItem(catName, itemName);
      } else if (currentX < -80) {
        this.removeItem(catName, itemName);
      }
      currentX = 0;
      setTimeout(() => isTouch = false, 300);
    });

    // Mouse support for testing
    content.addEventListener('mousedown', (e) => {
      if (isTouch) return; // Stop simulated mouse devices from double counting
      startX = e.clientX;
      isSwiping = true;
      content.classList.add('swiping');
    });

    window.addEventListener('mousemove', (e) => {
      if (!isSwiping) return;
      currentX = e.clientX - startX;
      if (currentX > 150) currentX = 150;
      if (currentX < -150) currentX = -150;
      content.style.transform = `translateX(${currentX}px)`;
    });

    window.addEventListener('mouseup', (e) => {
      if (!isSwiping) {
        return; // Ignore mouseup events if a swipe wasn't even started via mousedown
      }
      isSwiping = false;
      content.classList.remove('swiping');

      // Check for a raw click (< 10px swipe) to act as an "Add" button shortcut
      if (Math.abs(currentX) < 10) {
        currentX = 0;
        content.style.transition = 'transform 0.2s ease-out';
        content.style.transform = `translateX(150px)`;

        setTimeout(() => {
          this.addItem(catName, itemName);
          content.style.transform = `translateX(0px)`;
        }, 200);
        return;
      }

      content.style.transform = `translateX(0px)`;

      if (currentX > 80) {
        this.addItem(catName, itemName);
      } else if (currentX < -80) {
        this.removeItem(catName, itemName);
      }
      currentX = 0;
    });
  },

  addItem(catName, itemName) {
    if (this.state.ignoreClicks) return;

    if (!this.state.selections[catName]) {
      this.state.selections[catName] = {};
    }
    if (!this.state.selections[catName][itemName]) {
      this.state.selections[catName][itemName] = 0;
    }
    this.state.selections[catName][itemName]++;
    this.saveState();

    // Refresh item view
    const cat = this.config.categories.find(c => c.name === catName);
    this.renderItemList(cat);
  },

  removeItem(catName, itemName) {
    if (this.state.ignoreClicks) return;

    if (this.state.selections[catName] && this.state.selections[catName][itemName]) {
      this.state.selections[catName][itemName]--;
      if (this.state.selections[catName][itemName] <= 0) {
        delete this.state.selections[catName][itemName];
      }
      this.saveState();
    }

    // Refresh item view
    const cat = this.config.categories.find(c => c.name === catName);
    this.renderItemList(cat);
  },

  addCustomItem() {
    const input = document.getElementById('custom-item-name');
    const name = input.value.trim();
    if (!name) return;

    this.addItem(this.state.currentCategory, name);
    input.value = '';
  },

  updateTotalSummary() {
    let total = 0;
    Object.values(this.state.selections).forEach(catObj => {
      Object.values(catObj).forEach(count => total += count);
    });
    document.getElementById('total-count').textContent = total;
  },

  showSelectedSummary() {
    alert("In future, this might show a quick modal. For now, generate the link and shop!");
  },

  openShareModal() {
    const listContainer = document.getElementById('share-review-list');
    if (listContainer) {
      let html = '<table style="width: 100%; border-collapse: collapse;">';
      let hasItems = false;

      this.config.categories.forEach(cat => {
        const catName = cat.name;
        if (this.state.selections[catName]) {
          const items = this.state.selections[catName];
          Object.keys(items).forEach(item => {
            hasItems = true;
            const count = items[item];
            html += `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 4px;">${item}</td>
                <td style="text-align: right; font-weight: bold; width: 40px; padding: 8px 4px;">${count}</td>
              </tr>`;
          });
        }
      });
      html += '</table>';

      if (!hasItems) {
        html = '<div style="text-align: center; color: #999; padding: 20px;">Your list is empty</div>';
      }
      listContainer.innerHTML = html;
    }

    const compressed = btoa(encodeURIComponent(JSON.stringify(this.state.selections)));
    const url = window.location.origin + window.location.pathname.replace('index.html', '') + 'shopping.html?list=' + compressed;

    document.getElementById('share-link-input').value = url;
    document.getElementById('share-modal').classList.add('active');
  },

  closeShareModal() {
    document.getElementById('share-modal').classList.remove('active');
  },

  async copyShareLink() {
    const input = document.getElementById('share-link-input');
    const url = input.value;

    try {
      await navigator.clipboard.writeText(url);
      const btn = document.querySelector('.modal-actions .btn-primary');
      const originalText = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => {
        btn.textContent = originalText;
        this.closeShareModal();
      }, 1500);
    } catch (err) {
      input.select();
      document.execCommand('copy');
      this.closeShareModal();
    }
  },

  toggleMenu() {
    document.getElementById('menu-dropdown').classList.toggle('active');
  },

  openClearModal() {
    this.toggleMenu(); // close menu
    document.getElementById('clear-modal').classList.add('active');
  },

  closeClearModal() {
    document.getElementById('clear-modal').classList.remove('active');
  },

  clearList() {
    this.state.selections = {};
    this.saveState();
    this.closeClearModal();

    // Refresh the view depending on what is open
    if (document.getElementById('category-view').classList.contains('active')) {
      this.renderCategories();
    } else {
      const cat = this.config.categories.find(c => c.name === this.state.currentCategory);
      this.renderItemList(cat);
    }
  }
};

// Close dropdown when clicking outside
window.addEventListener('click', (e) => {
  if (!e.target.matches('.menu-btn')) {
    const dropdown = document.getElementById('menu-dropdown');
    if (dropdown && dropdown.classList.contains('active')) {
      dropdown.classList.remove('active');
    }
  }
});

window.onload = () => app.init();
