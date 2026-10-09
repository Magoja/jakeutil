const shopping = {
  config: null,
  list: {}, // The reconstructed list from URL
  flatItems: [], // Ordered flat list of items

  async init() {
    this.config = await CostcoShared.loadConfig('unshift');
    this.parseUrl();
    this.buildFlatList();
    this.renderList();
    this.attachPullToClear();
  },

  parseUrl() {
    const params = new URLSearchParams(window.location.search);
    const listData = params.get('list');
    if (listData) {
      try {
        this.list = JSON.parse(decodeURIComponent(atob(listData)));
      } catch (e) {
        console.error("Invalid list data", e);
        this.list = {};
      }
    }
  },

  buildFlatList() {
    this.flatItems = [];

    // Sort categories by their natural appearance in the config file
    const sortedCats = [...this.config.categories];

    sortedCats.forEach(cat => {
      if (this.list[cat.name]) {
        Object.entries(this.list[cat.name]).forEach(([itemName, count]) => {
          this.flatItems.push({
            id: cat.name + '_' + itemName,
            category: cat.name,
            color: cat.color,
            name: itemName,
            count: count,
            status: 'pending' // pending, completed, missing
          });
        });
      }
    });
  },

  renderList() {
    const listEl = document.getElementById('shopping-list');
    listEl.innerHTML = '';

    let completedCount = 0;
    let totalCount = this.flatItems.length;

    this.flatItems.forEach((item, index) => {
      if (item.status === 'completed' || item.status === 'missing') {
        completedCount++;
      }

      const li = document.createElement('li');
      li.className = 'swipe-container';

      // Add status class
      let statusClass = '';
      if (item.status === 'completed') statusClass = 'strikethrough';
      if (item.status === 'missing') statusClass = 'missing';

      // Backgrounds for swipe
      // Right to complete (green left bg)
      // Left for options (missing/cancel) (red right bg)
      let rightBgText = item.status === 'pending' ? 'Missing' : 'Undo';
      let leftBgText = item.status === 'pending' ? 'Complete' : 'Undo';
      let leftColor = item.status === 'pending' ? 'var(--success)' : 'var(--text-light)';
      let rightColor = item.status === 'pending' ? 'var(--danger)' : 'var(--text-light)';

      // Styling based on status
      let contentColor = item.color;
      let textColor = 'white';
      if (item.status === 'completed') {
        contentColor = '#e0e0e0';
        textColor = '#333';
      }

      li.innerHTML = `
        <div class="swipe-background">
          <div class="swipe-bg-left" style="background:${leftColor}"><span>${leftBgText}</span></div>
          <div class="swipe-bg-right" style="background:${rightColor}"><span>${rightBgText}</span></div>
        </div>
        <div class="swipe-content ${statusClass}" data-index="${index}" style="background:${contentColor}; color:${textColor}; border-bottom: 1px solid rgba(255,255,255,0.2);">
          <span>${item.name}</span>
          <span class="item-count" style="background: rgba(0,0,0,0.3); color: white; ${item.count <= 1 ? 'display: none;' : ''}">${item.count}</span>
        </div>
      `;
      listEl.appendChild(li);

      this.attachSwipe(li, index);
    });

    document.getElementById('completed-count').textContent = completedCount;
    document.getElementById('total-count').textContent = totalCount;
  },

  attachSwipe(container, index) {
    const content = container.querySelector('.swipe-content');

    let startX = 0;
    let currentX = 0;
    let isSwiping = false;
    let isTouch = false;

    // Touch support
    content.addEventListener('touchstart', (e) => {
      isTouch = true;
      startX = e.touches[0].clientX;
      isSwiping = true;
      content.classList.add('swiping');
    }, { passive: true });

    content.addEventListener('touchmove', (e) => {
      if (!isSwiping) return;
      currentX = e.touches[0].clientX - startX;
      if (currentX > 150) currentX = 150;
      if (currentX < -150) currentX = -150;
      content.style.transform = `translateX(${currentX}px)`;
    });

    content.addEventListener('touchend', (e) => {
      if (!isSwiping) return;

      isSwiping = false;
      content.classList.remove('swiping');

      // handle click
      if (Math.abs(currentX) < 10) {
        currentX = 0;
        content.style.transition = 'transform 0.2s ease-out';
        content.style.transform = `translateX(150px)`;

        setTimeout(() => {
          if (this.flatItems[index].status === 'pending') {
            this.flatItems[index].status = 'completed';
          } else {
            this.flatItems[index].status = 'pending';
          }
          this.renderList();
          content.style.transform = `translateX(0px)`;
          setTimeout(() => isTouch = false, 300);
        }, 200);
        return;
      }

      content.style.transform = `translateX(0px)`;
      this.handleSwipe(index, currentX);
      currentX = 0;
      setTimeout(() => isTouch = false, 300);
    });

    // Mouse support
    content.addEventListener('mousedown', (e) => {
      if (isTouch) return;
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
      if (!isSwiping) return;

      isSwiping = false;
      content.classList.remove('swiping');

      // handle click
      if (Math.abs(currentX) < 10) {
        currentX = 0;
        content.style.transition = 'transform 0.2s ease-out';
        content.style.transform = `translateX(150px)`;

        setTimeout(() => {
          if (this.flatItems[index].status === 'pending') {
            this.flatItems[index].status = 'completed';
          } else {
            this.flatItems[index].status = 'pending';
          }
          this.renderList();
          content.style.transform = `translateX(0px)`;
        }, 200);
        return;
      }

      content.style.transform = `translateX(0px)`;
      this.handleSwipe(index, currentX);
      currentX = 0;
    });
  },

  handleSwipe(index, distance) {
    const item = this.flatItems[index];

    if (distance > 80) {
      // Swiped right target
      if (item.status === 'pending') {
        item.status = 'completed';
      } else {
        item.status = 'pending'; // undo
      }
      this.renderList();
    } else if (distance < -80) {
      // Swiped left target
      if (item.status === 'pending') {
        item.status = 'missing';
      } else {
        item.status = 'pending'; // undo
      }
      this.renderList();
    }
  },

  attachPullToClear() {
    let startY = 0;
    let isPulling = false;
    const pullDownEl = document.getElementById('pull-down');

    window.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (!isPulling) return;
      const currentY = e.touches[0].clientY;
      const distance = currentY - startY;

      if (distance > 50) {
        pullDownEl.style.display = 'block';
        if (distance > 120) {
          pullDownEl.textContent = 'Release to clear completed!';
          pullDownEl.style.color = 'var(--primary)';
        } else {
          pullDownEl.textContent = 'Pull down to clear completed...';
          pullDownEl.style.color = 'var(--text-light)';
        }
      }
    });

    window.addEventListener('touchend', (e) => {
      if (!isPulling) return;
      isPulling = false;
      const currentY = e.changedTouches[0].clientY;

      if (currentY - startY > 120) {
        this.clearCompleted();
      }

      pullDownEl.style.display = 'none';
      pullDownEl.style.color = 'var(--text-light)';
    });
  },

  clearCompleted() {
    this.flatItems = this.flatItems.filter(item => item.status === 'pending');
    this.renderList();
  },

  cloneAndEdit() {
    // Reconstruct list into the format builder expects
    const selections = {};
    this.flatItems.forEach(item => {
      if (!selections[item.category]) selections[item.category] = {};
      selections[item.category][item.name] = item.count;
    });

    // Save to local storage so builder opens it
    localStorage.setItem('costco_builder_state', JSON.stringify(selections));

    // Redirect to builder
    const url = window.location.origin + window.location.pathname.replace('shopping.html', 'index.html');
    window.location.href = url;
  }
};

window.onload = () => shopping.init();
