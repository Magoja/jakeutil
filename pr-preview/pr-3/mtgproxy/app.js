// Function to log debug messages (optional, but useful for testing)
function logDebug(message) {
  const debugWindow = document.getElementById('debug-window');
  debugWindow.value += `${message}\n`; // Append the message
  debugWindow.scrollTop = debugWindow.scrollHeight; // Auto-scroll to the bottom
  console.log(message);
}

function createSerializedMarkElement() {
  const div = document.createElement('div');
  div.classList.add('serialized-mark');
  div.style.display = 'none'; // Hidden by default
  return div;
}

function initializeSerializationState(markElement, currentInput, totalInput, checkbox) {
  if (markElement && markElement.style.display !== 'none') {
    if (markElement.dataset.current && markElement.dataset.total) {
      currentInput.value = markElement.dataset.current;
      totalInput.value = markElement.dataset.total;
      checkbox.checked = true;
    } else {
      const text = markElement.innerText;
      const parts = text.split('/');
      if (parts.length === 2) {
        currentInput.value = parts[0];
        totalInput.value = parts[1];
        checkbox.checked = true;
      }
    }
  }
}

function updateSerializedMark(markElement, currentInput, totalInput, checkbox) {
  if (checkbox.checked && currentInput.value && totalInput.value) {
    markElement.dataset.current = currentInput.value;
    markElement.dataset.total = totalInput.value;
    // Graphic slash implementation
    markElement.innerHTML = `<span class="curr">${currentInput.value}</span><span class="sep"></span><span class="total">${totalInput.value}</span>`;
    markElement.style.display = 'flex';
  } else {
    markElement.style.display = 'none';
  }
}

function handleSerializationInput(currentInput, totalInput, checkbox, markElement) {
  // Auto-check if typing
  if (currentInput.value || totalInput.value) {
    if (!checkbox.checked) {
      checkbox.checked = true;
    }
  }
  updateSerializedMark(markElement, currentInput, totalInput, checkbox);
}

function handleDuplicateCard(name, urls, modal) {
  const currentCount = document.querySelectorAll('.image-box').length;
  if (currentCount >= 9) {
    alert('Maximum limit of 9 cards reached.');
    return;
  }
  const cardGrid = document.querySelector('.card-grid');
  if (cardGrid) {
    const newCard = createImageBox(name, urls);
    cardGrid.appendChild(newCard);
    modal.style.display = 'none';
  }
}

function createPreviewModalPopup(imgElement, name, urls, markElement) {
  const modal = document.createElement('div');
  modal.classList.add('modal');
  modal.style.display = 'none';

  const modalContent = document.createElement('div');
  modalContent.classList.add('modal-content');

  // Header
  const header = document.createElement('div');
  header.classList.add('modal-header');
  const title = document.createElement('h2');
  title.innerText = `${name} (${urls.length} matches)`;
  const closeBtn = document.createElement('button');
  closeBtn.classList.add('close-btn');
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => modal.style.display = 'none');
  header.appendChild(title);
  header.appendChild(closeBtn);

  // Body
  const body = document.createElement('div');
  body.classList.add('modal-body');
  const imageGrid = document.createElement('div');
  imageGrid.classList.add('image-list-grid');
  imageGrid.classList.add('image-list-grid');

  // Serialization Controls
  const serialControls = document.createElement('div');
  serialControls.classList.add('serialization-controls');

  const checkboxLabel = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkboxLabel.appendChild(checkbox);
  checkboxLabel.appendChild(document.createTextNode(' Enable Serialized Mark'));

  const inputsDiv = document.createElement('div');
  inputsDiv.classList.add('serial-inputs');
  const currentInput = document.createElement('input');
  currentInput.type = 'text';
  currentInput.placeholder = '001';
  currentInput.classList.add('serial-input');

  const separator = document.createTextNode(' / ');

  const totalInput = document.createElement('input');
  totalInput.type = 'text';
  totalInput.placeholder = '500';
  totalInput.classList.add('serial-input');

  inputsDiv.appendChild(currentInput);
  inputsDiv.appendChild(separator);
  inputsDiv.appendChild(totalInput);

  serialControls.appendChild(checkboxLabel);
  serialControls.appendChild(inputsDiv);

  body.appendChild(imageGrid);

  // Footer
  const footer = document.createElement('div');
  footer.classList.add('modal-footer');
  const loadMoreBtn = document.createElement('button');
  loadMoreBtn.classList.add('load-more-btn');
  loadMoreBtn.style.display = 'none';
  const duplicateBtn = document.createElement('button');
  duplicateBtn.classList.add('duplicate-btn');
  duplicateBtn.innerText = 'Duplicate Card';
  footer.appendChild(loadMoreBtn);
  footer.appendChild(duplicateBtn);

  modalContent.appendChild(header);
  modalContent.appendChild(serialControls); // Moved here to be fixed
  modalContent.appendChild(body);
  modalContent.appendChild(footer);
  modal.appendChild(modalContent);

  // Logic
  let currentIndex = 0;
  const BATCH_SIZE = 20;

  function renderBatch() {
    const nextBatch = urls.slice(currentIndex, currentIndex + BATCH_SIZE);
    nextBatch.forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.classList.add('modal-image');
      img.addEventListener('click', () => {
        imgElement.src = url;
        modal.style.display = 'none';
      });
      imageGrid.appendChild(img);
    });
    currentIndex += nextBatch.length;

    if (currentIndex >= urls.length) {
      loadMoreBtn.style.display = 'none';
    } else {
      loadMoreBtn.style.display = 'block';
      const remaining = urls.length - currentIndex;
      const nextCount = Math.min(remaining, BATCH_SIZE);
      loadMoreBtn.innerText = `Show next ${nextCount} (${currentIndex} / ${urls.length} shown)`;
    }
  }

  loadMoreBtn.addEventListener('click', renderBatch);

  // Duplicate Logic
  duplicateBtn.addEventListener('click', () => handleDuplicateCard(name, urls, modal));

  // Initial render
  renderBatch();

  // Serialization Logic
  initializeSerializationState(markElement, currentInput, totalInput, checkbox);

  checkbox.addEventListener('change', () => updateSerializedMark(markElement, currentInput, totalInput, checkbox));

  const onInputMatch = () => handleSerializationInput(currentInput, totalInput, checkbox, markElement);

  currentInput.addEventListener('input', onInputMatch);
  totalInput.addEventListener('input', onInputMatch);

  return modal;
}

function createImageBoxForPrint(name, url) {
  const imgElement = document.createElement('img');
  imgElement.src = url;
  imgElement.alt = name;
  imgElement.classList.add('main-image');
  return imgElement;
}

function attachPopupEventListeners(modal) {
  // Close modal when pressing the Escape key
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.style.display === 'block') {
      modal.style.display = 'none';
    }
  });

  // Close modal when clicking outside the content
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
}

function createImageBox(name, urls) {
  const container = document.createElement('div');
  container.classList.add('image-box');
  container.setAttribute('draggable', 'true'); // Enable dragging

  // Drag and Drop Event Listeners
  container.addEventListener('dragstart', () => {
    container.classList.add('dragging');
  });

  container.addEventListener('dragend', () => {
    container.classList.remove('dragging');
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault(); // Allow dropping
    const afterElement = getDragAfterElement(container.parentNode, e.clientY, e.clientX);
    const draggable = document.querySelector('.dragging');
    if (afterElement == null) {
      container.parentNode.appendChild(draggable);
    } else {
      container.parentNode.insertBefore(draggable, afterElement);
    }
  });

  // Create the main image element
  const imgElement = createImageBoxForPrint(name, urls[0]);
  const markElement = createSerializedMarkElement(); // Create mark
  const modal = createPreviewModalPopup(imgElement, name, urls, markElement); // Pass mark
  attachPopupEventListeners(modal);
  document.body.appendChild(modal);

  imgElement.addEventListener('click', () => {
    modal.style.display = 'block';

    // Check if duplicate button should be disabled
    const duplicateBtn = modal.querySelector('.duplicate-btn');
    if (duplicateBtn) {
      const currentCount = document.querySelectorAll('.image-box').length;
      if (currentCount >= 9) {
        duplicateBtn.disabled = true;
        duplicateBtn.title = "Maximum limit of 9 cards reached.";
      } else {
        duplicateBtn.disabled = false;
        duplicateBtn.title = "";
      }
    }
  });

  container.appendChild(imgElement);
  container.appendChild(markElement); // Append mark
  return container;
}

function splitCardList(text) {
  return text.split('\n').map(card => card.trim()).filter(Boolean);
}

function getUploadedImages() {
  const fileInput = document.getElementById('custom-image-upload');
  const files = Array.from(fileInput.files);
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  const imageObjects = imageFiles.map(file => ({
    name: file.name,
    urls: [URL.createObjectURL(file)] // Create a temporary URL for the file
  }));

  return imageObjects;
}

function getDebugCardList() {
  return ["Mox Pearl", "Mox Sapphire", "Mox Ruby", "Mox Emerald", "Mox Jet", "Black Lotus", "Ancestral Recall", "Timetwister", "Time Walk"];
}

function getCardListFromText() {
  return splitCardList(document.getElementById('card-list').value.trim());
}

function getListOfCardImageOnly(cardList) {
  let listOfCardImages = [];
  for (const card of cardList) {
    if (card.image_uris && card.image_uris.normal) {
      listOfCardImages.push(card.image_uris.normal);
    } else {
      logDebug(`No image found for card: ${card.name}`);
    }
  }
  return listOfCardImages;
}

async function fetchCardImageFromScryfall(cardName) {
  // Document: https://scryfall.com/docs/api/cards/search
  // Example: https://api.scryfall.com/cards/search?q=!%22Necropotence%22&pretty=true&unique=art
  let escapedCardNameExactMatch = encodeURIComponent("!\"" + cardName + "\"");
  const response = await fetch(`https://api.scryfall.com/cards/search?&unique=prints&q=${escapedCardNameExactMatch}`);
  if (!response.ok) {
    throw new Error(`Error fetching card: ${response.statusText}`);
  }

  const cardData = await response.json();
  let imageLists = getListOfCardImageOnly(cardData.data);
  logDebug(`Fetched card data for "${cardName}": ${JSON.stringify(imageLists)}`);
  return imageLists;
}

function createGrid() {
  const kCardGrid = "card-grid";
  const grid = document.createElement('div');
  grid.classList.add(kCardGrid);
  return grid;
}

function getCardImageBlockWithCleanup() {
  const kCardImages = "card-images";
  const cardImages = document.getElementById(kCardImages);
  cardImages.innerHTML = ''; // Clear previous results
  return cardImages;
}

async function resolveCardImages(cardList) {
  let cardImages = [];

  for (const [_, cardName] of cardList.entries()) {
    logDebug(`Fetching card: ${cardName}`);
    let imageUrls = await fetchCardImageFromScryfall(cardName);
    if (imageUrls.length > 0) {
      logDebug(`- Successfully fetched image for: ${cardName}`);
      cardImages.push({ name: cardName, urls: imageUrls });
    } else {
      logDebug(`- Failed to fetch image for: ${cardName}`);
    }
  }

  return cardImages;
}

async function generateCardImages(cardsInfo) {
  const kCardsPerPage = 9;

  let cardImages = getCardImageBlockWithCleanup();

  if (cardsInfo.length == 0) {
    logDebug(" - No card is selected. Abort");
    return;
  }

  let currentGrid = createGrid();
  cardImages.appendChild(currentGrid);

  for (let index = 0; index < cardsInfo.length; ++index) {
    if (index % kCardsPerPage == 0 && index > 0) {
      // If we reached the end of the page, create a new grid
      currentGrid = createGrid();
      cardImages.appendChild(currentGrid);
    }

    const info = cardsInfo[index];
    logDebug(`Fetching card: ${info.name}`);

    currentGrid.appendChild(createImageBox(info.name, info.urls));
  }
}

// Helper function to find the element after the cursor position
function getDragAfterElement(container, y, x) {
  const draggableElements = [...container.querySelectorAll('.image-box:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offsetX = x - box.left - box.width / 2;
    const offsetY = y - box.top - box.height / 2;
    const distance = offsetX * offsetX + offsetY * offsetY;

    if (closest.distance === null || distance < closest.distance) {
      return { distance: distance, element: child };
    } else {
      return closest;
    }
  }, { distance: null, element: null }).element;
}

function unittest() {
  logDebug("## Unittest: Start");

  let testCoverages = {
    "[Test name template]": function () { /* do something here */ return true; },
    "Test splitCardList()": function () {
      function compare(input, expectedOutput) {
        let inputResult = JSON.stringify(input);
        let expectedResult = JSON.stringify(expectedOutput);
        if (inputResult != expectedResult) {
          logDebug(`- Test failed: Expected ${expectedResult}, got ${inputResult}`);
          return false;
        }
        return true;
      }

      if (!compare(splitCardList("Card1\nCard2\nCard3"), ["Card1", "Card2", "Card3"])) {
        return false;
      }
      if (!compare(splitCardList(" Card1 \n Card2 \n Card3 "), ["Card1", "Card2", "Card3"])) {
        return false;
      }
      if (!compare(splitCardList("Card1\n\nCard2\nCard3"), ["Card1", "Card2", "Card3"])) {
        return false;
      }
      if (!compare(splitCardList(""), [])) {
        return false;
      }
      if (!compare(splitCardList("   "), [])) {
        return false;
      }
      return true;
    }
  }

  function safeExecute(testName, testFunction) {
    try {
      if (!testFunction()) {
        logDebug(`- Test "${testName}" failed.`);
        return false;
      }
      return true;
    } catch (error) {
      logDebug(`- Test "${testName}" encountered an error: ${error.message}`);
      return false;
    }
  }

  let listFailedTests = [];

  for (const [testName, testFunction] of Object.entries(testCoverages)) {
    logDebug(`Running test: ${testName}`);
    if (!safeExecute(testName, testFunction)) {
      listFailedTests.push(testName);
    }
  }

  if (listFailedTests.length > 0) {
    logDebug("## Unittest: Failed tests:");
    for (const failedTest of listFailedTests) {
      logDebug(`- ${failedTest}`);
    }
  } else {
    logDebug("## Unittest: All tests passed.");
  }
}

async function getCardInfoFromUI() {
  let cardInfos = [...await resolveCardImages(getCardListFromText()), ...getUploadedImages()];

  if (cardInfos.length === 0) {
    logDebug("No card list provided. Use debug list.");
    cardInfos = [...await resolveCardImages(getDebugCardList())];
  }

  if (cardInfos.length > 9) {
    logDebug(`# Limiting to 9 cards (received ${cardInfos.length}).`);
    cardInfos = cardInfos.slice(0, 9);
  }

  return cardInfos;
}

document.getElementById('generate-proxies').addEventListener('click', async () => {
  logDebug("# Starting to generate proxies...");
  await generateCardImages(await getCardInfoFromUI());
  logDebug("# Finished generating proxies.");
});

document.getElementById('print-proxies').addEventListener('click', () => {
  logDebug("# Preparing print view...");
  window.print();
});

document.addEventListener('DOMContentLoaded', () => {
  unittest();

  logDebug("# Tool is ready.");
});
