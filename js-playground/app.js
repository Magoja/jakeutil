document.addEventListener('DOMContentLoaded', () => {
  // Initialize CodeMirror
  const editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
    mode: 'javascript',
    theme: 'monokai',
    lineNumbers: true,
    autoCloseBrackets: true,
    tabSize: 2,
    extraKeys: {
      "Cmd-Enter": runCode,
      "Ctrl-Enter": runCode
    }
  });

  // Editor is initially focused
  editor.focus();

  // Elements
  const runBtn = document.getElementById('run-btn');
  const editBtn = document.getElementById('edit-btn');
  const shareBtn = document.getElementById('share-btn');
  const resetBtn = document.getElementById('reset-btn');
  const clearBtn = document.getElementById('clear-btn');
  const consoleOutput = document.getElementById('console-output');
  const errorsOutput = document.getElementById('errors-output');
  const tabs = document.querySelectorAll('.tab');
  const errorTab = document.getElementById('error-tab');

  // Modal Elements
  const shareModal = document.getElementById('share-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const shareUrlInput = document.getElementById('share-url');
  const copyBtn = document.getElementById('copy-btn');

  const DEFAULT_CODE = `// Write your Javascript here
// Press Run button or Cmd+Enter to execute

print("Hello, World!");

function sum(a, b) {
  return a + b;
}

print("Sum of 5 + 3 is: " + sum(5, 3));
`;

  const STORAGE_KEY = 'js-playground-code';

  // Initialization: URL > Local > Default
  initializeCode();

  // Event Listeners
  runBtn.addEventListener('click', runCode);
  editBtn.addEventListener('click', editCode);
  shareBtn.addEventListener('click', shareCode);
  resetBtn.addEventListener('click', resetCode);
  clearBtn.addEventListener('click', clearOutput);

  // Auto-save logic
  editor.on('change', () => {
    // Only save if not read-only (which checks URL)
    if (!editor.isReadOnly()) {
      localStorage.setItem(STORAGE_KEY, editor.getValue());
    }
  });

  closeModalBtn.addEventListener('click', hideModal);
  shareModal.addEventListener('click', (e) => {
    if (e.target === shareModal) hideModal();
  });

  copyBtn.addEventListener('click', () => {
    shareUrlInput.select();
    document.execCommand('copy');
    copyBtn.textContent = 'Copied!';
    setTimeout(() => copyBtn.textContent = 'Copy', 2000);
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Deactivate all
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      // Activate clicked
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-target') + '-output';
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Functions
  function initializeCode() {
    const hash = window.location.hash;
    let loadedFromUrl = false;

    // 1. Try URL
    if (hash && hash.startsWith('#code=')) {
      try {
        const compressed = hash.substring(6);
        const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
        if (decompressed) {
          editor.setValue(decompressed);
          loadedFromUrl = true;

          // Set Read-Only Mode
          editor.setOption('readOnly', true);

          // Toggle Buttons
          editBtn.classList.remove('hidden');
          shareBtn.classList.add('hidden');
          resetBtn.classList.add('hidden');
        }
      } catch (e) {
        console.error("Failed to load code from URL", e);
      }
    }

    // 2. Try LocalStorage if not from URL
    if (!loadedFromUrl) {
      const savedCode = localStorage.getItem(STORAGE_KEY);
      if (savedCode) {
        editor.setValue(savedCode);
      }
    }
    // Note: If no URL code and no Saved code, editor has initial text from HTML (which matches DEFAULT_CODE roughly, but let's ensure consistency if needed).
    // The HTML textarea has default content, so we are good.
  }

  function checkUrlForCode() {
    // Logic moved to initializeCode
  }

  function editCode() {
    // Save current (shared) code to local storage
    if (confirm("Edit this code? This will overwrite your current local workspace.")) {
      localStorage.setItem(STORAGE_KEY, editor.getValue());
      // Reload without hash to return to local view
      window.location.href = window.location.pathname;
    }
  }

  function resetCode() {
    if (confirm("Reset code to 'Hello World'? This will discard current changes.")) {
      editor.setValue(DEFAULT_CODE);
      clearOutput();
      // URL hash should be cleared if present?
      // remove #code from url
      history.replaceState(null, '', ' ');
    }
  }

  function shareCode() {
    const code = editor.getValue();
    const compressed = LZString.compressToEncodedURIComponent(code);
    const url = `${window.location.origin}${window.location.pathname}#code=${compressed}`;

    // Update URL without reloading (optional, users might like this)
    window.history.replaceState(null, '', `#code=${compressed}`);

    // Show Modal
    shareUrlInput.value = url;
    shareModal.classList.remove('hidden');

    // Focus and select
    setTimeout(() => {
      shareUrlInput.focus();
      shareUrlInput.select();
    }, 100);
  }

  function hideModal() {
    shareModal.classList.add('hidden');
  }

  function clearOutput() {
    consoleOutput.innerHTML = '';
    errorsOutput.innerHTML = '';
    errorTab.classList.remove('has-errors');
  }

  function print(...args) {
    const line = document.createElement('div');
    line.className = 'log-line';

    // Convert args to string representation
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
    consoleOutput.appendChild(line);

    // Auto scroll to bottom
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  function addTimestampLog() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const dateMark = document.createElement('div');
    dateMark.className = 'system-log';
    dateMark.textContent = `--- Execution started at ${timeString} ---`;
    consoleOutput.appendChild(dateMark);
  }

  function runCode() {
    clearOutput();
    addTimestampLog();

    const code = editor.getValue();

    document.querySelector('[data-target="console"]').click();

    try {
      const runFunc = new Function('print', 'console', code);
      runFunc(print, { log: print, error: (msg) => { throw new Error(msg); }, warn: print });
    } catch (err) {
      handleError(err);
    }
  }

  function handleError(err) {
    // Switch to error tab
    errorTab.click();
    errorTab.classList.add('has-errors');

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = err.toString();

    // Try to get validation details if available (stack trace etc)
    if (err.stack) {
      const stackDiv = document.createElement('pre');
      stackDiv.style.marginTop = '10px';
      stackDiv.style.opacity = '0.7';
      stackDiv.textContent = err.stack;
      errorDiv.appendChild(stackDiv);
    }

    errorsOutput.appendChild(errorDiv);
  }
});
