// filter-utils.js

// Helper to get colors safely (handling transform cards)
function getCardColors(card) {
  if (card.is_transform && card.faces && card.faces.length > 0) {
    return card.faces[0].colors || [];
  }
  return card.colors || [];
}

// Helper to get type_line safely
function getCardTypeLine(card) {
  if (card.is_transform && card.faces && card.faces.length > 0) {
    return card.faces[0].type_line || "";
  }
  return card.type_line || "";
}

function checkCardPassesFilter(filterState, card) {
  if (filterState.size === 0) return true;

  const colors = getCardColors(card);
  const typeLine = getCardTypeLine(card);

  const isLand = typeLine.includes('Land');
  const isMulticolor = colors.length > 1;
  const isColorless = colors.length === 0 && !isLand;

  // Check Matches
  if (!isMulticolor && filterState.has('W') && colors.includes('W')) return true;
  if (!isMulticolor && filterState.has('U') && colors.includes('U')) return true;
  if (!isMulticolor && filterState.has('B') && colors.includes('B')) return true;
  if (!isMulticolor && filterState.has('R') && colors.includes('R')) return true;
  if (!isMulticolor && filterState.has('G') && colors.includes('G')) return true;

  if (filterState.has('C') && isColorless) return true;
  if (filterState.has('M') && isMulticolor) return true;
  if (filterState.has('L') && isLand) return true;

  return false; // No match
}

function compareCollectorNumber(cardLeft, cardRight) {
  const left = (cardLeft.collector_number || "0").toString();
  const right = (cardRight.collector_number || "0").toString();
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}
