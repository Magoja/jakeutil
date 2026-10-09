const CardUI = {
  /**
   * Creates a comprehensive DOM element for a card, including spinners,
   * image loading handling, and transform button if applicable.
   * @param {Object} card - The card data object from Scryfall.
   * @returns {HTMLElement} The constructed div.card-item element.
   */
  createCardElement(card) {
    const cardElement = document.createElement('div');
    cardElement.classList.add('card-item');

    // Default to front face
    let currentFaceIndex = 0;

    // Determine initial face and image
    let faces = card.faces;
    let face = faces && faces.length > 0 ? faces[0] : card;

    // Handle case where single-faced card doesn't have 'faces' array but top-level props
    if (!faces) {
      faces = [card];
      face = card;
    }

    const imageUrl = Scryfall.getPrimaryImage(card);

    // Spinner
    const spinner = this.createSpinner();
    cardElement.appendChild(spinner);

    const img = this.createCardImage(imageUrl, face.name);

    // Hide spinner when image loads
    img.onload = () => { spinner.style.display = 'none'; };
    img.onerror = () => { spinner.style.display = 'none'; };

    cardElement.appendChild(img);

    if (card.is_transform && card.faces) {
      cardElement.classList.add('transformable');

      const flipBtn = this.createFlipButton();

      // Make whole card clickable for transform cards
      cardElement.onclick = () => {
        currentFaceIndex = (currentFaceIndex + 1) % card.faces.length;
        const newFace = card.faces[currentFaceIndex];
        if (newFace.image_uris) {
          img.src = newFace.image_uris.normal;
          img.alt = newFace.name;
        }
      };

      cardElement.appendChild(flipBtn);
    }

    return cardElement;
  },

  createCardElementForDeck(card) {
    const cardElement = document.createElement('div');
    cardElement.classList.add('card-item');

    // Spinner
    const spinner = this.createSpinner();
    cardElement.appendChild(spinner);

    // Double-Sided Handling
    if (card.faces && card.faces.length > 1) { // Double-sided
      cardElement.classList.add('double-sided');

      const facesContainer = document.createElement('div');
      facesContainer.classList.add('faces-container');

      card.faces.forEach((face, index) => {
        const faceImg = this.createCardImage(face.image_uris ? face.image_uris.normal : '', face.name);
        faceImg.classList.add('face-image');
        if (index === 0) faceImg.classList.add('front-face');
        else faceImg.classList.add('back-face');

        // Hide spinner when front image loads
        if (index === 0) {
          faceImg.onload = () => { spinner.style.display = 'none'; };
          faceImg.onerror = () => { spinner.style.display = 'none'; };
        }
        facesContainer.appendChild(faceImg);
      });

      cardElement.appendChild(facesContainer);

    } else { // Single-Sided
      const imageUrl = Scryfall.getPrimaryImage(card);
      const img = this.createCardImage(imageUrl, card.name);

      // Hide spinner when image loads
      img.onload = () => { spinner.style.display = 'none'; };
      img.onerror = () => { spinner.style.display = 'none'; };

      cardElement.appendChild(img);
    }

    return cardElement;
  },

  createFlipButton() {
    const flipBtn = document.createElement('button');
    flipBtn.classList.add('flip-button');
    flipBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>`;
    return flipBtn;
  },

  createCardImage(imageUrl, name) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.loading = "lazy"; // Native lazy loading
    img.alt = name;
    img.classList.add('card-image');
    return img;
  },

  createSpinner() {
    const spinner = document.createElement('div');
    spinner.classList.add('spinner');
    return spinner;
  }
};
