document.addEventListener('DOMContentLoaded', () => {
  // Initialize CodeMirror
  const editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
    mode: 'python',
    theme: 'monokai',
    lineNumbers: true,
    autoCloseBrackets: true,
    tabSize: 4, // Python standard
    indentUnit: 4
  });

  const DEFAULT_CODE = `# Write your Python here
# Press Run button or Cmd+Enter to execute

print("Hello, World!")

def sum(a, b):
    return a + b

print(f"Sum of 5 + 3 is: {sum(5, 3)}")
`;

  // Initialize UI Helper
  const ui = new PlaygroundUI({
    editor: editor,
    defaultCode: DEFAULT_CODE,
    storageKey: 'python-playground-code',
    runCallback: executePython
  });

  // Set Keymap
  editor.setOption("extraKeys", {
    "Cmd-Enter": () => ui.runCode(),
    "Ctrl-Enter": () => ui.runCode(),
    "Tab": function (cm) {
      if (cm.somethingSelected()) {
        cm.indentSelection("add");
      } else {
        cm.replaceSelection("    ", "end");
      }
    }
  });

  editor.focus();

  // Pyodide Logic
  let pyodide = null;
  let pyodideReadyPromise = loadPyodideEnvironment();

  async function loadPyodideEnvironment() {
    ui.printLine("Loading Python environment... (first time may take a moment)");
    try {
      pyodide = await loadPyodide({
        stdout: (text) => ui.printLine(text),
        stderr: (text) => ui.printLine("STDERR: " + text)
      });
      ui.printLine("Python is ready!");
      return pyodide;
    } catch (err) {
      ui.handleError("Failed to load Pyodide: " + err.message);
    }
  }

  async function executePython(code) {
    if (!pyodide) {
      ui.printLine("Waiting for Python to load...");
      await pyodideReadyPromise;
    }

    if (!pyodide) {
      ui.handleError("Python environment failed to load.");
      return;
    }

    try {
      // We don't print the return value automatically, only what's printed to stdout
      // unless user wants REPL style?
      // For now, let's just run it. If it returns something, we could print it.
      // But standard script execution usually relies on print().
      await pyodide.runPythonAsync(code);
    } catch (err) {
      ui.handleError(err);
    }
  }
});
