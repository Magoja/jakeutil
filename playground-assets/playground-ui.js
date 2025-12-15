class PlaygroundUI {
  constructor(options) {
    this.editor = options.editor;
    this.defaultCode = options.defaultCode || "";
    this.storageKey = options.storageKey || "playground-code";
    this.runCallback = options.runCallback;

    // UI Elements
    this.consoleOutput = document.getElementById('console-output');
    this.errorsOutput = document.getElementById('errors-output');
    this.errorTab = document.getElementById('error-tab');
    this.shareModal = document.getElementById('share-modal');
    this.shareUrlInput = document.getElementById('share-url');

    // Buttons
    this.runBtn = document.getElementById('run-btn');
    this.editBtn = document.getElementById('edit-btn');
    this.shareBtn = document.getElementById('share-btn');
    this.resetBtn = document.getElementById('reset-btn');
    this.clearBtn = document.getElementById('clear-btn');

    // Modal buttons
    this.closeModalBtn = document.getElementById('close-modal');
    this.copyBtn = document.getElementById('copy-btn');

    this.init();
  }

  init() {
    // Bind button events
    if (this.runBtn) this.runBtn.addEventListener('click', () => this.runCode());
    if (this.editBtn) this.editBtn.addEventListener('click', () => this.editCode());
    if (this.shareBtn) this.shareBtn.addEventListener('click', () => this.shareCode());
    if (this.resetBtn) this.resetBtn.addEventListener('click', () => this.resetCode());
    if (this.clearBtn) this.clearBtn.addEventListener('click', () => this.clearOutput());

    // Modal events
    if (this.closeModalBtn) this.closeModalBtn.addEventListener('click', () => this.hideModal());
    if (this.shareModal) this.shareModal.addEventListener('click', (e) => {
      if (e.target === this.shareModal) this.hideModal();
    });
    if (this.copyBtn) this.copyBtn.addEventListener('click', () => this.copyShareUrl());

    // Tab events
    this.setupTabs();

    // Auto-save
    this.editor.on('change', () => {
      if (!this.editor.isReadOnly()) {
        localStorage.setItem(this.storageKey, this.editor.getValue());
      }
    });

    // Initialize Code Content
    this.loadCode();
  }

  setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        const targetId = tab.getAttribute('data-target') + '-output';
        const target = document.getElementById(targetId);
        if (target) target.classList.add('active');
      });
    });
  }

  loadCode() {
    const hash = window.location.hash;
    let loadedFromUrl = false;

    // 1. Try URL
    if (hash && hash.startsWith('#code=')) {
      try {
        const compressed = hash.substring(6);
        const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
        if (decompressed) {
          this.editor.setValue(decompressed);
          loadedFromUrl = true;
          this.setReadOnlyMode(true);
        }
      } catch (e) {
        console.error("Failed to load code from URL", e);
      }
    }

    // 2. Try LocalStorage if not from URL
    if (!loadedFromUrl) {
      const savedCode = localStorage.getItem(this.storageKey);
      if (savedCode) {
        this.editor.setValue(savedCode);
      } else {
        this.editor.setValue(this.defaultCode);
      }
      this.setReadOnlyMode(false);
    }
  }

  setReadOnlyMode(isReadOnly) {
    this.editor.setOption('readOnly', isReadOnly);
    if (isReadOnly) {
      if (this.editBtn) this.editBtn.classList.remove('hidden');
      if (this.shareBtn) this.shareBtn.classList.add('hidden');
      if (this.resetBtn) this.resetBtn.classList.add('hidden');
    } else {
      if (this.editBtn) this.editBtn.classList.add('hidden');
      if (this.shareBtn) this.shareBtn.classList.remove('hidden');
      if (this.resetBtn) this.resetBtn.classList.remove('hidden');
    }
  }

  editCode() {
    if (confirm("Edit this code? This will overwrite your current local workspace.")) {
      localStorage.setItem(this.storageKey, this.editor.getValue());
      window.location.href = window.location.pathname; // Remove hash
    }
  }

  resetCode() {
    if (confirm("Reset code to default? This will discard current changes.")) {
      this.editor.setValue(this.defaultCode);
      this.clearOutput();
      history.replaceState(null, '', ' ');
    }
  }

  shareCode() {
    const code = this.editor.getValue();
    const compressed = LZString.compressToEncodedURIComponent(code);
    const url = `${window.location.origin}${window.location.pathname}#code=${compressed}`;

    window.history.replaceState(null, '', `#code=${compressed}`);

    if (this.shareUrlInput) this.shareUrlInput.value = url;
    if (this.shareModal) this.shareModal.classList.remove('hidden');

    setTimeout(() => {
      if (this.shareUrlInput) {
        this.shareUrlInput.focus();
        this.shareUrlInput.select();
      }
    }, 100);
  }

  hideModal() {
    if (this.shareModal) this.shareModal.classList.add('hidden');
  }

  copyShareUrl() {
    if (this.shareUrlInput) {
      this.shareUrlInput.select();
      document.execCommand('copy');
      if (this.copyBtn) {
        const originalText = this.copyBtn.textContent;
        this.copyBtn.textContent = 'Copied!';
        setTimeout(() => this.copyBtn.textContent = originalText, 2000);
      }
    }
  }

  clearOutput() {
    if (this.consoleOutput) this.consoleOutput.innerHTML = '';
    if (this.errorsOutput) this.errorsOutput.innerHTML = '';
    if (this.errorTab) this.errorTab.classList.remove('has-errors');
  }

  runCode() {
    this.clearOutput();
    this.addTimestampLog();

    // Switch to console tab
    const consoleTab = document.querySelector('[data-target="console"]');
    if (consoleTab) consoleTab.click();

    if (this.runCallback) {
      try {
        this.runCallback(this.editor.getValue());
      } catch (err) {
        this.handleError(err);
      }
    }
  }

  addTimestampLog() {
    if (!this.consoleOutput) return;
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const dateMark = document.createElement('div');
    dateMark.className = 'system-log';
    dateMark.textContent = `--- Execution started at ${timeString} ---`;
    this.consoleOutput.appendChild(dateMark);
  }

  print(...args) {
    if (!this.consoleOutput) return;
    const line = document.createElement('div');
    line.className = 'log-line';

    const text = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    line.textContent = text;
    this.consoleOutput.appendChild(line);
    this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
  }

  // Alias for simple string printing which might be easier for python stdout
  printLine(text) {
    if (!this.consoleOutput) return;
    const line = document.createElement('div');
    line.className = 'log-line';
    line.textContent = text;
    this.consoleOutput.appendChild(line);
    this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
  }

  handleError(err) {
    if (this.errorTab) {
      this.errorTab.click();
      this.errorTab.classList.add('has-errors');
    }

    if (this.errorsOutput) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.textContent = err.toString();

      if (err.stack) {
        const stackDiv = document.createElement('pre');
        stackDiv.style.marginTop = '10px';
        stackDiv.style.opacity = '0.7';
        stackDiv.textContent = err.stack;
        errorDiv.appendChild(stackDiv);
      }
      this.errorsOutput.appendChild(errorDiv);
    }
  }
}
