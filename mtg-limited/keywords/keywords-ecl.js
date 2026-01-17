KeywordExtractor.register('ecl', (card) => {
  const extras = [];
  const oracleText = card.oracle_text || (card.faces ? card.faces[0].oracle_text : '') || '';

  if (oracleText.includes('-1/-1') || oracleText.includes('Blight') || oracleText.includes('Persist') || oracleText.includes('Wither')) {
    extras.push('-1/-1');
  }

  if (oracleText.includes('Whenever you cast a spell with mana 4 or greater')) {
    extras.push('Spell 4+ Mana');
  }

  if (oracleText.includes('Become tapped')) {
    extras.push('Tapped Trigger');
  }

  return extras;
});
