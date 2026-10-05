/* Chord Quiz game logic. Depends on ChordParser (chord-parser.js). */
(function () {
  'use strict';

  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var STRING_BASES = [4, 9, 2, 7, 11, 4]; // E A D G B e
  var STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];
  var N_FRETS = 5;

  var questions = [];
  var current = null;
  var lastId = null;
  var hinted = false;
  var stats = { score: 0, answered: 0, streak: 0, best: 0 };

  function $(id) { return document.getElementById(id); }

  function loadStats() {
    try {
      var s = JSON.parse(localStorage.getItem('chordquiz-stats') || '{}');
      for (var k in stats) if (typeof s[k] === 'number') stats[k] = s[k];
    } catch (e) {}
  }
  function saveStats() {
    try { localStorage.setItem('chordquiz-stats', JSON.stringify(stats)); } catch (e) {}
  }

  function renderDiagram(svg, voicing) {
    var frets = voicing.split('-').map(function (v) {
      v = v.trim().toLowerCase();
      return v === 'x' ? -1 : (v === '0' || v === 'o' ? 0 : parseInt(v, 10));
    });
    var W = 320, H = 380, ml = 44, mr = 24, mt = 76, mb = 30;
    var gw = W - ml - mr, gh = H - mt - mb;
    var sx = gw / 5, sy = gh / N_FRETS;
    var NS = 'http://www.w3.org/2000/svg';
    function el(tag, attrs) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    }
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = '';
    // fret lines
    for (var f = 0; f <= N_FRETS; f++) {
      var y = mt + f * sy;
      svg.appendChild(el('line', { x1: ml, y1: y, x2: W - mr, y2: y,
        stroke: '#222', 'stroke-width': f === 0 ? 5 : 2 }));
    }
    // strings
    for (var sIdx = 0; sIdx < 6; sIdx++) {
      var x = ml + sIdx * sx;
      svg.appendChild(el('line', { x1: x, y1: mt, x2: x, y2: mt + gh,
        stroke: '#222', 'stroke-width': sIdx === 0 ? 4 : 2 }));
    }
    // fret numbers
    for (var fn = 1; fn <= N_FRETS; fn++) {
      var t = el('text', { x: ml - 16, y: mt + (fn - 0.5) * sy, 'text-anchor': 'middle',
        'dominant-baseline': 'central', 'font-size': 15, fill: '#777' });
      t.textContent = fn;
      svg.appendChild(t);
    }
    // markers
    for (var i = 0; i < 6; i++) {
      var mx = ml + i * sx, fv = frets[i];
      var name = el('text', { x: mx, y: 22, 'text-anchor': 'middle', 'font-size': 17, fill: '#222' });
      name.textContent = STRING_NAMES[i];
      svg.appendChild(name);
      if (fv === -1) {
        var xt = el('text', { x: mx, y: 52, 'text-anchor': 'middle', 'font-size': 20,
          'font-weight': 'bold', fill: '#222' });
        xt.textContent = '✕';
        svg.appendChild(xt);
      } else if (fv === 0) {
        svg.appendChild(el('circle', { cx: mx, cy: 48, r: 10, fill: 'none',
          stroke: '#222', 'stroke-width': 3 }));
      } else {
        var cy = mt + (fv - 0.5) * sy;
        svg.appendChild(el('circle', { cx: mx, cy: cy, r: 15, fill: '#222' }));
      }
    }
  }

  function voicingNotes(voicing) {
    var names = [];
    var parts = voicing.split('-');
    for (var i = 0; i < 6; i++) {
      var v = parts[i].trim().toLowerCase();
      if (v === 'x') continue;
      names.push(STRING_NAMES[i] + (v === '0' || v === 'o' ? '' : v) +
        ' (' + NOTE_NAMES[(STRING_BASES[i] + parseInt(v, 10)) % 12] + ')');
    }
    return names.join(', ');
  }

  function pickQuestion() {
    var pool = questions.filter(function (q) { return q.id !== lastId; });
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function pickDistractors(q, n) {
    var answerParsed = ChordParser.parse(q.answer);
    var scored = [];
    questions.forEach(function (c) {
      if (c.id === q.id) return;
      var cp = ChordParser.parse(c.answer);
      var score = 0;
      if (cp && answerParsed && cp.root === answerParsed.root) score += 2;
      if (c.answer.replace(/^[A-G][#b]?/, '') === q.answer.replace(/^[A-G][#b]?/, '')) score += 2;
      scored.push({ q: c, score: score, r: Math.random() });
    });
    scored.sort(function (a, b) { return (b.score - a.score) || (a.r - b.r); });
    var out = [], seen = {};
    seen[q.answer] = 1;
    for (var i = 0; i < scored.length && out.length < n; i++) {
      if (!seen[scored[i].q.answer]) { seen[scored[i].q.answer] = 1; out.push(scored[i].q); }
    }
    return out;
  }

  function showQuestion() {
    current = pickQuestion();
    lastId = current.id;
    hinted = false;
    renderDiagram($('diagram'), current.voicing);
    $('answer').value = '';
    $('feedback').className = 'feedback';
    $('feedback').innerHTML = '';
    $('choices').innerHTML = '';
    $('choices').style.display = 'none';
    $('hint-btn').style.display = '';
    $('next-btn').style.display = 'none';
    $('submit-btn').style.display = '';
    $('answer').disabled = false;
    $('answer').focus();
  }

  function grade(userText) {
    var userParsed = ChordParser.parse(userText);
    var candidates = [current.answer].concat(current.aliases || []);
    var ok = candidates.some(function (a) {
      return ChordParser.same(userParsed, ChordParser.parse(a));
    });
    return { userParsed: userParsed, ok: ok };
  }

  function answerLabel() {
    var label = current.answer;
    if (current.aliases && current.aliases.length) {
      label += ' <span class="hint-note">(also accepted: ' +
        current.aliases.map(escapeHtml).join(', ') + ')</span>';
    }
    return label;
  }

  function reveal(correct, userText) {
    stats.answered++;
    var fb = $('feedback');
    if (correct) {
      stats.score++;
      if (!hinted) {
        stats.streak++;
        stats.best = Math.max(stats.best, stats.streak);
      }
      fb.className = 'feedback correct';
      fb.innerHTML = '<strong>Correct!</strong> ' + answerLabel() +
        (hinted ? ' <span class="hint-note">(with hint)</span>' : '') +
        '<div class="notes">Notes: ' + escapeHtml(voicingNotes(current.voicing)) + '</div>';
    } else {
      stats.streak = 0;
      fb.className = 'feedback wrong';
      var heard = userText ? ' You answered <strong>' + escapeHtml(userText) + '</strong>.' : '';
      fb.innerHTML = '<strong>Not quite.</strong>' + heard +
        ' The answer is <strong>' + answerLabel() + '</strong>.' +
        '<div class="notes">Notes: ' + escapeHtml(voicingNotes(current.voicing)) + '</div>';
    }
    saveStats();
    updateStats();
    $('submit-btn').style.display = 'none';
    $('hint-btn').style.display = 'none';
    $('choices').style.display = 'none';
    $('next-btn').style.display = '';
    $('answer').disabled = true;
  }

  function submitAnswer(text) {
    if (!current || $('next-btn').style.display !== 'none') return;
    var g = grade(text);
    if (!g.userParsed) {
      var fb = $('feedback');
      fb.className = 'feedback parse-error';
      fb.textContent = 'Could not parse "' + text + '" as a chord name. Try e.g. Cmaj9, Bb13, F#m7b5.';
      return;
    }
    reveal(g.ok, text);
  }

  function showHint() {
    hinted = true;
    var distractors = pickDistractors(current, 3);
    var options = distractors.concat([current]);
    for (var i = options.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = options[i]; options[i] = options[j]; options[j] = tmp;
    }
    var box = $('choices');
    box.innerHTML = '';
    options.forEach(function (opt) {
      var b = document.createElement('button');
      b.className = 'choice-btn';
      b.textContent = opt.answer;
      b.onclick = function () { submitAnswer(opt.answer); };
      box.appendChild(b);
    });
    box.style.display = 'grid';
    $('hint-btn').style.display = 'none';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function updateStats() {
    $('stat-score').textContent = stats.score;
    $('stat-answered').textContent = stats.answered;
    $('stat-streak').textContent = stats.streak;
    $('stat-best').textContent = stats.best;
  }

  function init() {
    loadStats();
    updateStats();
    $('submit-btn').onclick = function () { submitAnswer($('answer').value); };
    $('answer').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitAnswer($('answer').value);
    });
    $('hint-btn').onclick = showHint;
    $('next-btn').onclick = showQuestion;
    fetch('questions.json')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (bank) {
        questions = bank.questions;
        if (!questions.length) throw new Error('empty bank');
        showQuestion();
      })
      .catch(function (err) {
        $('feedback').className = 'feedback wrong';
        $('feedback').textContent = 'Could not load questions.json: ' + err.message;
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
