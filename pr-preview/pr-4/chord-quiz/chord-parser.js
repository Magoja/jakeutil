/* Chord name parser: "Cmaj9", "CM7 add 9", "C major 9" -> { root: 0, pcs: [0,2,4,7,11] }
 * Comparison is by pitch-class set, so enharmonic equivalents ("Db9" vs "C#9")
 * and synonymous spellings grade the same. Mirrors /tmp/verify_bank.py logic. */
(function (global) {
  'use strict';
  var PC = { c: 0, 'c#': 1, db: 1, d: 2, 'd#': 3, eb: 3, e: 4, f: 5,
             'f#': 6, gb: 6, g: 7, 'g#': 8, ab: 8, a: 9, 'a#': 10, bb: 10, b: 11 };

  function parseChordName(input) {
    if (!input) return null;
    var s = String(input).trim();
    s = s.replace(/Δ/g, 'maj').replace(/°/g, 'dim').replace(/ø/g, 'm7b5');
    s = s.replace(/M(?!aj)/g, '\u0000'); // uppercase M not part of 'maj' = major
    s = s.toLowerCase().replace(/\u0000/g, 'maj');
    s = s.replace(/majaj/g, 'maj');
    var words = [['major', 'maj'], ['minor', 'min'], ['diminished', 'dim'],
                 ['augmented', 'aug'], ['dominant', ''], ['sharp', '#'], ['flat', 'b']];
    for (var w = 0; w < words.length; w++) s = s.split(words[w][0]).join(words[w][1]);
    s = s.replace(/\+(?!\d)/g, 'aug');
    var m = s.match(/^([a-g])(##|#|bb|b)?/);
    if (!m) return null;
    var rootName = m[1] + (m[2] || '');
    if (!(rootName in PC)) return null;
    var root = PC[rootName];
    var rest0 = s.slice(m[0].length);
    var pcs = {}, fam = null;
    function setPcs(arr, f) { pcs = {}; fam = f; for (var i = 0; i < arr.length; i++) pcs[arr[i]] = 1; }
    if (rest0.charAt(0) === '-' && rest0.length > 1 && /\d/.test(rest0.charAt(1))) {
      setPcs([0, 3, 7], 'min');
      var rest = rest0.slice(1);
    } else {
      var rest = rest0;
    }
    rest = rest.replace(/[\s\-()\/]/g, '');
    if (fam === null) {
    var quals = [
      ['m7b5', [0, 3, 6, 10], 'min'], ['maj7', [0, 4, 7, 11], 'maj'], ['ma7', [0, 4, 7, 11], 'maj'],
      ['min7', [0, 3, 7, 10], 'min'], ['m7', [0, 3, 7, 10], 'min'], ['dim7', [0, 3, 6, 9], 'dim'],
      ['maj', [0, 4, 7], 'maj'], ['ma', [0, 4, 7], 'maj'], ['min', [0, 3, 7], 'min'],
      ['dim', [0, 3, 6], 'dim'], ['aug', [0, 4, 8], 'aug'], ['sus4', [0, 5, 7], 'sus'],
      ['sus2', [0, 2, 7], 'sus'], ['sus', [0, 5, 7], 'sus'], ['m', [0, 3, 7], 'min'], ['-', [0, 3, 7], 'min'],
      ['7', [0, 4, 7, 10], 'dom'], ['6', [0, 4, 7, 9], 'six'], ['', [0, 4, 7], 'tri']
    ];
    for (var q = 0; q < quals.length; q++) {
      if (rest.indexOf(quals[q][0]) === 0) {
        setPcs(quals[q][1], quals[q][2]);
        rest = rest.slice(quals[q][0].length);
        break;
      }
    }
    }
    function addSeventh() {
      if (fam === 'tri' || fam === 'sus' || fam === 'six' || fam === 'min' ||
          fam === 'dom' || fam === 'aug' || fam === 'dim') pcs[10] = 1;
      else if (fam === 'maj') pcs[11] = 1;
    }
    function addNinth() {
      if (fam === 'maj') { pcs[11] = 1; pcs[2] = 1; }
      else if (fam === 'six') { pcs[2] = 1; }
      else { pcs[10] = 1; pcs[2] = 1; }
    }
    var i = 0;
    while (i < rest.length) {
      var r = rest.slice(i), matched = true;
      if (r.indexOf('maj13') === 0) { pcs[11] = 1; pcs[2] = 1; pcs[9] = 1; i += 5; }
      else if (r.indexOf('maj9') === 0) { pcs[11] = 1; pcs[2] = 1; i += 4; }
      else if (r.indexOf('maj11') === 0) { pcs[11] = 1; pcs[5] = 1; i += 5; }
      else if (r.indexOf('maj7') === 0) { pcs[11] = 1; i += 4; }
      else if (r.indexOf('add13') === 0) { pcs[9] = 1; i += 5; }
      else if (r.indexOf('add11') === 0) { pcs[5] = 1; i += 5; }
      else if (r.indexOf('add9') === 0) { pcs[2] = 1; i += 4; }
      else if (r.indexOf('add6') === 0) { pcs[9] = 1; i += 4; }
      else if (r.indexOf('add4') === 0) { pcs[5] = 1; i += 4; }
      else if (r.indexOf('add2') === 0) { pcs[2] = 1; i += 4; }
      else if (r.indexOf('add') === 0) { i += 3; }
      else if (r.indexOf('sus4') === 0) { delete pcs[3]; delete pcs[4]; pcs[5] = 1; i += 4; }
      else if (r.indexOf('sus2') === 0) { delete pcs[3]; delete pcs[4]; pcs[2] = 1; i += 4; }
      else if (r.indexOf('b13') === 0) { pcs[8] = 1; i += 3; }
      else if (r.indexOf('#11') === 0) { pcs[6] = 1; i += 3; }
      else if (r.indexOf('b9') === 0) { pcs[1] = 1; i += 2; }
      else if (r.indexOf('#9') === 0) { pcs[3] = 1; i += 2; }
      else if (r.indexOf('b5') === 0) { pcs[6] = 1; i += 2; }
      else if (r.indexOf('#5') === 0) { pcs[8] = 1; i += 2; }
      else if (r.indexOf('13') === 0) { addSeventh(); pcs[2] = 1; pcs[9] = 1; i += 2; }
      else if (r.indexOf('11') === 0) { addSeventh(); pcs[5] = 1; i += 2; }
      else if (r.indexOf('9') === 0) { addNinth(); i += 1; }
      else if (r.indexOf('6') === 0) { pcs[9] = 1; i += 1; }
      else if (r.indexOf('7') === 0) { pcs[10] = 1; i += 1; }
      else if (r.indexOf('2') === 0) { pcs[2] = 1; i += 1; }
      else { matched = false; i += 1; }
    }
    var out = [];
    for (var k in pcs) out.push((root + parseInt(k, 10)) % 12);
    out.sort(function (a, b) { return a - b; });
    return { root: root, pcs: out };
  }

  function sameChord(a, b) {
    if (!a || !b || a.pcs.length !== b.pcs.length) return false;
    for (var i = 0; i < a.pcs.length; i++) if (a.pcs[i] !== b.pcs[i]) return false;
    return true;
  }

  global.ChordParser = { parse: parseChordName, same: sameChord };
})(typeof window !== 'undefined' ? window : globalThis);
