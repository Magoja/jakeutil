# Chord Quiz

Name-the-chord quiz for complex guitar voicings. Shows an SVG fretboard
diagram; the player types the chord name.

- `index.html` — page shell
- `style.css` — styling
- `chord-parser.js` — chord-name parser: normalizes a typed name
  (`Cmaj9`, `CM7 add 9`, `C major 9`, `Db9`/`C#9`, …) to a pitch-class set
  for grading. Case-insensitive, optional spaces.
- `quiz.js` — game logic: SVG diagram renderer, hint (4 choices),
  scoring + streak in localStorage
- `questions.json` — question bank: 62 entries, each
  `{ id, answer, voicing }`. Voicing is low-E to high-e, frets 0–5,
  `x` = muted. Every voicing is machine-verified note-by-note against
  its answer (only the 5th may be omitted). Complex/extended harmony
  only; the same file feeds the weekday chat quiz.
