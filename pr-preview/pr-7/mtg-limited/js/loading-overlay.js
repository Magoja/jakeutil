class LoadingOverlay {
  constructor(elementId = 'global-loading-overlay') {
    this.overlay = document.getElementById(elementId);
    if (!this.overlay) {
      console.warn(`LoadingOverlay: Element with ID '${elementId}' not found.`);
    }
  }

  /**
   * Shows the loading overlay with a message.
   * @param {string} message - The message to display.
   */
  show(message = 'Loading...') {
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      const textEl = this.overlay.querySelector('p');
      if (textEl) textEl.textContent = message;
    }
  }

  /**
   * Hides the loading overlay.
   */
  hide() {
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
  }

  /**
   * Shows an error message in the overlay.
   * @param {string} message - The error message to display.
   */
  showError(message = 'An error occurred.') {
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      const textEl = this.overlay.querySelector('p');
      if (textEl) textEl.textContent = message;
      // Optional: Add error styling class if needed in future
    }
  }
}
