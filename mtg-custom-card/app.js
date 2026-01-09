const canvas = document.getElementById('card-canvas');
const ctx = canvas.getContext('2d');

// State
let state = {
  backgroundImage: null,
  backgroundScale: 1.0,
  backgroundX: 0,
  backgroundY: 0,
  title: 'New Card',
  type: 'Type Line',
  mana: '',
  frameColor: 'gold',
  rulesText: '',
  flavorText: '',
  power: '',
  toughness: '',
  artist: '',
  symbolCache: {}
};

// Dragging State
let isDragging = false;
let startX, startY;

// Assets (Colors for now, images later if needed)
const frameColors = {
  'gold': '#d4af37',
  '#e0e0e0': '#e0e0e0',
  '#a3c1da': '#a3c1da',
  '#222': '#222',
  '#f08080': '#f08080',
  '#90ee90': '#90ee90'
};

// Symbols
const symbolMap = {
  '{W}': 'icons/icon-1.png',
  '{U}': 'icons/icon-2.png',
  '{B}': 'icons/icon-3.png',
  '{R}': 'icons/icon-4.png',
  '{G}': 'icons/icon-5.png',
  // We can programmatically add the rest or handle them dynamically, 
  // but for now let's pre-populate common ones or just load on demand?
  // Loading all 50+ on init is safer for canvas synchronous drawing.
};

// Generate the rest of the map
for (let i = 6; i <= 53; i++) {
  symbolMap[`{i${i}}`] = `icons/icon-${i}.png`; // Use {i6} format to avoid collision and clarity
}

// Preload images
let symbolsLoaded = 0;
const totalSymbols = Object.keys(symbolMap).length;

function preloadSymbols() {
  for (const [key, src] of Object.entries(symbolMap)) {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      symbolsLoaded++;
      if (symbolsLoaded === totalSymbols) {
        drawCard(); // Draw card only after all symbols are loaded
      }
    };
    state.symbolCache[key] = img; // Store in state.symbolCache
  }
  // If there are no symbols, draw immediately
  if (totalSymbols === 0) {
    drawCard();
  }
}

// --- Initialization ---

function init() {
  preloadSymbols();
  setupEventListeners();
  // drawCard() is now called after symbols are loaded
}

function setupEventListeners() {
  // Inputs
  document.getElementById('card-title').addEventListener('input', (e) => { state.title = e.target.value; drawCard(); });
  document.getElementById('card-type').addEventListener('input', (e) => { state.type = e.target.value; drawCard(); });
  document.getElementById('mana-cost').addEventListener('input', (e) => { state.mana = e.target.value; drawCard(); });
  document.getElementById('rules-text').addEventListener('input', (e) => { state.rulesText = e.target.value; drawCard(); });
  document.getElementById('flavor-text').addEventListener('input', (e) => { state.flavorText = e.target.value; drawCard(); });
  document.getElementById('power').addEventListener('input', (e) => { state.power = e.target.value; drawCard(); });
  document.getElementById('toughness').addEventListener('input', (e) => { state.toughness = e.target.value; drawCard(); });
  document.getElementById('artist').addEventListener('input', (e) => { state.artist = e.target.value; drawCard(); });

  // Frame Buttons
  document.querySelectorAll('.frame-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      state.frameColor = e.target.dataset.color;
      // Visual feedback
      document.querySelectorAll('.frame-btn').forEach(b => b.classList.remove('selected'));
      e.target.classList.add('selected');
      drawCard();
    });
  });

  // Image Upload
  document.getElementById('image-upload').addEventListener('change', handleImageUpload);
  document.getElementById('scale-slider').addEventListener('input', (e) => {
    state.backgroundScale = parseFloat(e.target.value);
    drawCard();
  });

  // Canvas Dragging
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.offsetX;
    startY = e.offsetY;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.offsetX - startX;
    const dy = e.offsetY - startY;
    state.backgroundX += dx;
    state.backgroundY += dy;
    startX = e.offsetX;
    startY = e.offsetY;
    drawCard();
  });

  canvas.addEventListener('mouseup', () => isDragging = false);
  canvas.addEventListener('mouseout', () => isDragging = false);

  // Download
  document.getElementById('download-btn').addEventListener('click', downloadCard);
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      state.backgroundImage = img;
      // Center image initially
      state.backgroundX = (canvas.width - img.width) / 2;
      state.backgroundY = (canvas.height - img.height) / 2;
      drawCard();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

// --- Drawing Logic ---

function drawCard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Frame / Background Base
  // For now, filling with a color. Later we can load frame images.
  const frameColor = frameColors[state.frameColor] || state.frameColor;
  ctx.fillStyle = '#000'; // Black border
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Inner border
  const borderSize = 35;
  ctx.fillStyle = frameColor;
  ctx.fillRect(borderSize, borderSize, canvas.width - borderSize * 2, canvas.height - borderSize * 2);

  // 2. Art Area
  // Standard MTG art box roughly
  const artX = 55;
  const artY = 115; // Below header
  const artW = canvas.width - 110;
  const artH = 480;

  // Draw uploaded image
  ctx.save();
  ctx.beginPath();
  ctx.rect(artX, artY, artW, artH);
  ctx.clip();

  ctx.fillStyle = '#222';
  ctx.fillRect(artX, artY, artW, artH); // placeholder background

  if (state.backgroundImage) {
    const img = state.backgroundImage;
    const scaledW = img.width * state.backgroundScale;
    const scaledH = img.height * state.backgroundScale;
    // The x/y are relative to the canvas, so just draw it.
    // We added offsets. To make it intuitive, we might want the offsets to be relative to the *center* or something,
    // but for now simple translation works.
    ctx.drawImage(img, state.backgroundX, state.backgroundY, scaledW, scaledH);
  }
  ctx.restore();

  // 3. Card Title Box
  drawCardBox(40, 40, canvas.width - 80, 60, frameColor);

  // Title Text
  ctx.font = 'bold 36px serif'; // Use a better font later if loaded
  ctx.fillStyle = '#000';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.title, 60, 70);

  // Mana Cost
  if (state.mana) {
    // Mana cost usually aligns right.
    // We need to measure it first to position correctly, or just draw from right.
    // drawRichText draws generic from left-to-right.
    // Quick hack: Estimate width or just draw from a calculated position?
    // Better: drawRichText can optionally handle alignment or we measure.
    // Let's implement a measure function or just guess for now.
    // Actually, let's just reverse the tokens for RTL drawing? No, symbol order matters.
    // Let's just draw it starting at X = 650ish and go left? 
    // No, standard is drawing from an anchor.
    // Simplest: Draw normally, but set startX such that it ends at right margin.

    // For now, let's just guess a start X
    // To align right, we need to measure the full rich text width first.
    // This is a simplified approach for now.
    const manaIconSize = 32; // Standard size for mana symbols
    const manaTextWidth = measureRichText(ctx, state.mana, manaIconSize);
    const manaX = canvas.width - 60 - manaTextWidth;
    drawRichText(ctx, state.mana, manaX, 70, manaIconSize, false);
  }

  // 4. Type Line Box
  const typeY = 600;
  drawCardBox(40, typeY, canvas.width - 80, 50, frameColor);

  // Type Text
  ctx.textAlign = 'left';
  ctx.font = 'bold 32px serif';
  ctx.fillStyle = '#000';
  ctx.fillText(state.type, 60, typeY + 25);

  // 5. Rules Text Box
  const rulesY = 660;
  const rulesH = 300;
  drawTextBox(40, rulesY, canvas.width - 80, rulesH);

  // Rules Text
  ctx.fillStyle = '#000';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  // Rules text needs wrapping
  const rulesLineHeight = 36;
  const rulesTextBottomY = drawRichText(ctx, state.rulesText, 60, rulesY + 20, 30, true, canvas.width - 120, rulesLineHeight);

  // Flavor Text (Italic, below rules if possible, or just append)
  // We need to know where rules text ENDED.
  // drawRichText currently doesn't return Y.
  // Let's improve drawRichText to return nextY.

  // For now, let's just stick flavor text at a fixed position or measure?
  // Let's just put it at the bottom of the box for simplicity as per previous version.
  if (state.flavorText) {
    ctx.font = 'italic 28px serif';
    const flavorTextY = rulesTextBottomY + 10; // Start flavor text below rules text
    drawRichText(ctx, state.flavorText, 60, flavorTextY, 28, true, canvas.width - 120, 32);
  }

  // 6. Power/Toughness
  if (state.power || state.toughness) {
    const ptBoxW = 140;
    const ptBoxH = 60;
    const ptX = canvas.width - 40 - ptBoxW + 10;
    const ptY = canvas.height - 40 - ptBoxH - 20;

    drawCardBox(ptX, ptY, ptBoxW, ptBoxH, '#e0e0e0', true);

    ctx.fillStyle = '#000';
    ctx.font = 'bold 38px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${state.power} / ${state.toughness}`, ptX + ptBoxW / 2, ptY + ptBoxH / 2);
  }

  // 7. Artist Credit
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Ills. ${state.artist}`, 60, canvas.height - 30);
}

// Helper to draw the textured boxes (simulating card frames)
function drawCardBox(x, y, w, h, color, isPT = false) {
  ctx.save();
  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Border
  ctx.fillStyle = '#a0a0a0'; // generic border color
  // Use slightly rounded rects? Canvas doesn't have native rounded rect in all browsers, 
  // but we can assume modern here or just simple rects.
  // roundRect is supported in recent Chrome/FF/Safari
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }

  // Inner fill
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#e8e8e8'; // text box bg is usually light
  if (!isPT) // Titles often have texture/color, for now just light gray or mix
    ctx.fillStyle = color === 'gold' ? '#eec' : '#eee';

  ctx.beginPath();
  const inset = 3;
  if (ctx.roundRect) {
    ctx.roundRect(x + inset, y + inset, w - inset * 2, h - inset * 2, 4);
  } else {
    ctx.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
  }
  ctx.fill();
  ctx.restore();
}

function drawTextBox(x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#fffff0'; // Creamy text box
  ctx.globalAlpha = 0.9;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }

  // Border
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

// Draw Rich Text with Symbol Support
// align: 'left' assumed
// Returns the y-coordinate of the next line after drawing.
function drawRichText(ctx, text, x, y, iconSize, wrap, maxWidth, lineHeight) {
  if (!text) return y;

  // Regex to split by {X}
  // Captures the braces too: {W}
  const parts = text.split(/(\{.*?\})/g);

  let currentX = x;
  let currentY = y;

  // Save original font settings
  const originalFont = ctx.font;
  const originalFillStyle = ctx.fillStyle;
  const originalTextAlign = ctx.textAlign;
  const originalTextBaseline = ctx.textBaseline;

  // Helper to draw a text chunk, handling wrapping if enabled
  function drawTextChunk(str) {
    const words = str.split(' ');
    words.forEach((word, index) => {
      const wordWithSpace = word + (index < words.length - 1 ? ' ' : '');
      const width = ctx.measureText(wordWithSpace).width;

      if (wrap && currentX + width > x + maxWidth && currentX !== x) { // currentX !== x prevents empty first line
        currentX = x;
        currentY += lineHeight;
      }
      ctx.fillText(wordWithSpace, currentX, currentY);
      currentX += width;
    });
  }

  parts.forEach(part => {
    if (!part) return;

    // Check if symbol
    if (part.startsWith('{') && part.endsWith('}')) {
      // It's a symbol, checking map
      const key = part.toUpperCase(); // normalize key
      const img = state.symbolCache[key]; // Access from state.symbolCache

      if (img) {
        // Check wrap
        if (wrap && currentX + iconSize > x + maxWidth && currentX !== x) {
          currentX = x;
          currentY += lineHeight;
        }

        // Draw Icon
        // Center vertically based on lineHeight
        const yOffset = (lineHeight - iconSize) / 2;
        ctx.drawImage(img, currentX, currentY + yOffset, iconSize, iconSize);
        currentX += iconSize + 2; // spacing
      } else {
        // Symbol not found, draw as text
        drawTextChunk(part);
      }
    } else {
      // Regular text
      drawTextChunk(part);
    }
  });

  // Restore original font settings
  ctx.font = originalFont;
  ctx.fillStyle = originalFillStyle;
  ctx.textAlign = originalTextAlign;
  ctx.textBaseline = originalTextBaseline;

  return currentY; // Return the y-coordinate of the last drawn line
}

// Helper to measure rich text width (for right alignment)
function measureRichText(ctx, text, iconSize) {
  if (!text) return 0;

  const parts = text.split(/(\{.*?\})/g);
  let totalWidth = 0;

  parts.forEach(part => {
    if (!part) return;

    if (part.startsWith('{') && part.endsWith('}')) {
      const key = part.toUpperCase();
      const img = state.symbolCache[key];
      if (img) {
        totalWidth += iconSize + 2; // Icon width + spacing
      } else {
        totalWidth += ctx.measureText(part).width;
      }
    } else {
      totalWidth += ctx.measureText(part).width;
    }
  });
  return totalWidth;
}


function downloadCard() {
  const link = document.createElement('a');
  link.download = `${state.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
  link.href = canvas.toDataURL('image/jpeg', 0.9);
  link.click();
}

// Start
init();
