document.addEventListener('DOMContentLoaded', () => {
  // Initialize CodeMirror
  const editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
    mode: 'javascript',
    theme: 'monokai',
    lineNumbers: true,
    autoCloseBrackets: true,
    tabSize: 2
  });

  const DEFAULT_CODE = `// Write your Javascript here
// Press Run button or Cmd+Enter to execute

print("Hello, World!");

function sum(a, b) {
  return a + b;
}

print("Sum of 5 + 3 is: " + sum(5, 3));
`;

  // Initialize UI Helper
  const ui = new PlaygroundUI({
    editor: editor,
    defaultCode: DEFAULT_CODE,
    storageKey: 'js-playground-code',
    runCallback: executeCode
  });

  // Set Keymap after UI is ready
  editor.setOption("extraKeys", {
    "Cmd-Enter": () => ui.runCode(),
    "Ctrl-Enter": () => ui.runCode()
  });

  // Editor is initially focused
  editor.focus();

  function executeCode(code) {
    // Custom print that redirects to UI
    const print = (...args) => ui.print(...args);

    // Mock console to redirect logs
    const consoleMock = {
      log: print,
      error: (msg) => { throw new Error(msg); },
      warn: print
    };

    // Execute safely
    const runFunc = new Function('print', 'console', code);
    runFunc(print, consoleMock);
  }
});
