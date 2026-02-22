const app = {
  config: null,
  state: {
    selections: {}, // e.g. { "Meat": [ {name: "Bacon", count: 2} ] }
    currentCategory: null
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
      li.onclick = () => this.showItems(cat.name);

      li.style.background = cat.color;
      // Dark text for light colors, white for dark wouldn't hurt. Since we have text-shadow, white text is safest.
      li.style.color = "white";

      li.innerHTML = `
        <div class="cat-name" style="padding: 16px; width:100%; box-sizing:border-box;">${cat.name}</div>
        <div class="item-count ${count === 0 ? 'zero' : ''}" id="count-${cat.name}" style="margin-right: 16px;">${count}</div>
      `;
      list.appendChild(li);
    });

    // Update Special count
    let specialCount = 0;
    if (this.state.selections['Special']) {
      specialCount = Object.values(this.state.selections['Special']).reduce((a, b) => a + b, 0);
    }
    const specCountEl = document.getElementById('count-Special');
    if (specCountEl) {
      specCountEl.textContent = specialCount;
      specCountEl.className = `item-count ${specialCount === 0 ? 'zero' : ''}`;
    }

    this.updateTotalSummary();
  },

  showCategories() {
    document.getElementById('category-view').classList.add('active');
    document.getElementById('item-view').classList.remove('active');
    document.getElementById('header-title').textContent = "Categories";
    document.getElementById('back-btn').style.display = 'none';
    this.state.currentCategory = null;
    this.renderCategories();
  },

  showItems(catName) {
    this.state.currentCategory = catName;
    const cat = this.config.categories.find(c => c.name === catName);

    document.getElementById('category-view').classList.remove('active');
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

    // Touch support
    content.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      isSwiping = true;
      content.classList.add('swiping');
    });

    content.addEventListener('touchmove', (e) => {
      if (!isSwiping) return;
      currentX = e.touches[0].clientX - startX;
      // limit visual swipe
      if (currentX > 150) currentX = 150;
      if (currentX < -150) currentX = -150;
      content.style.transform = `translateX(${currentX}px)`;
    });

    content.addEventListener('touchend', (e) => {
      isSwiping = false;
      content.classList.remove('swiping');
      content.style.transform = `translateX(0px)`;

      if (currentX > 80) {
        this.addItem(catName, itemName);
      } else if (currentX < -80) {
        this.removeItem(catName, itemName);
      }
      currentX = 0;
    });

    // Mouse support for testing
    content.addEventListener('mousedown', (e) => {
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
        // Handle click: animate swipe right to add item
        content.classList.remove('swiping');
        content.style.transition = 'transform 0.2s ease-out';
        content.style.transform = `translateX(150px)`;

        setTimeout(() => {
          this.addItem(catName, itemName);
          content.style.transform = `translateX(0px)`;
        }, 200);
        return;
      }
      isSwiping = false;
      content.classList.remove('swiping');
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
