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
  const clearBtn = document.getElementById('clear-btn');
  const consoleOutput = document.getElementById('console-output');
  const errorsOutput = document.getElementById('errors-output');
  const tabs = document.querySelectorAll('.tab');
  const errorTab = document.getElementById('error-tab');

  // Event Listeners
  runBtn.addEventListener('click', runCode);
  clearBtn.addEventListener('click', clearOutput);

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

  function runCode() {
    clearOutput();
    const code = editor.getValue();

    // Switch to output tab by default
    document.querySelector('[data-target="console"]').click();

    try {
      // Create a safe-ish scope for execution
      // using Function constructor to avoid direct eval usage if possible,
      // though for a playground eval is often what's needed for scope access if we wanted it.
      // But let's wrap it in an IIFE style with our custom print.

      const wrappedCode = `
        (function() {
          try {
            ${code}
          } catch(err) {
            throw err;
          }
        })();
      `;

      // Define safe scope variables
      const safeScope = {
        print: print,
        console: {
          log: print,
          error: (msg) => { throw new Error(msg); },
          warn: print,
          info: print
        },
        // Block some globals if we really wanted to be safe, but this is client side playground.
        // window: {}, 
        // document: {} 
        // For now, full access is fine as requested.
      };

      // Execute
      // We use a function constructor to give access to our 'print'
      // new Function('print', code)(print);

      // Better approach to allow 'print' usage directly:
      // We will actually just use 'new Function' with arguments.
      // Note: This doesn't capture console.log calls inside unless we proxy console, 
      // but the user requirement effectively asked for 'print()'.
      // We will also map console.log to print for convenience.

      const runFunc = new Function('print', 'console', code);
      runFunc(print, { log: print, error: console.error, warn: console.warn });

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
