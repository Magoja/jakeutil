---
name: mtg-keyword-update
description: Add or update synergy filter rules in mtg-limited/keyword.json for an MTG set. Use when the user wants to add a new set to the limited trainer, refresh draft archetype/synergy tags, or asks to "update keywords" for a set. Accepts an optional set code argument (e.g. "msh"); defaults to the latest released limited set when none is given. Skips sets already present. Fetches cards from Scryfall, derives one consolidated synergy group per two-color draft archetype, runs a 3-agent swarm review, edits the file, and auto-commits. Only operates on the jakeutil project (/Users/magoja/Documents/project/jakeutil).
tools: Read, Write, Bash, Agent
---

# MTG Keyword Update

Update `mtg-limited/keyword.json` with synergy filter rules for an MTG set — a specific set if a code is passed as an argument, otherwise the latest released limited set.

**Project root (all file paths must be relative to this):** `/Users/magoja/Documents/project/jakeutil`

> **Fetching from Scryfall:** the Scryfall API blocks the `WebFetch` tool (HTTP 403). Always fetch via `Bash` using `curl` or a Python `urllib` script, and **send a `User-Agent` header** (Scryfall returns HTTP 400/403 without one), e.g. `curl -s -H 'User-Agent: jakeutil-keyword-update/1.0' -H 'Accept: application/json' <url>`. Do all card parsing/counting in a Python script and write intermediate data to the scratchpad directory (e.g. `<scratchpad>/cards.json`) so the review agents can read it instead of you pasting huge card lists into context.

---

## Step 1 – Determine the target set

**If a set code was passed as an argument** (e.g. `msh`), use it directly as `targetSet`:
- Fetch `https://api.scryfall.com/sets/{code}` (curl + User-Agent — see note above) to confirm it exists and capture `.code` and `.name`.
- If the set is not found, output `No set found for code "{code}".` and stop.
- This path does NOT apply the "latest"/recency filters below — the user named the set explicitly.

**If no argument was passed**, auto-detect the latest limited set. Fetch `https://api.scryfall.com/sets/` (curl + User-Agent) and parse the `data` array.

Filter rules (matching `set-utils.js` booster logic):
- `set_type` must be one of: `core`, `expansion`, `masters`, `draft_innovation`
- `released_at` must be ≤ today + 14 days (sets releasing within the next 2 weeks are included, matching `maxAgeDays: 14`)
- `card_count` must be > 0 (set must be complete/populated)
- Sort the filtered list by `released_at` descending
- Take the first entry as `targetSet` (capture `.code` and `.name`)

---

## Step 2 – Check if keyword.json already has this set

Read `/Users/magoja/Documents/project/jakeutil/mtg-limited/keyword.json`.

If `targetSet.code` is already a top-level key → output:

```
keyword.json already contains "{code}" ({name}). Nothing to do.
```

Then stop.

---

## Step 3 – Fetch all cards for the set

Fetch `https://api.scryfall.com/cards/search?q=set%3A{setCode}&unique=prints` (curl/urllib + User-Agent — see note at top).

If the response has `has_more: true`, follow `next_page` URLs until exhausted. Collect all cards from every page. Add a short `sleep` (~0.1s) between pages to respect Scryfall rate limits.

For each card record, extract:
- `name`
- `oracle_text` (or from `card_faces[0].oracle_text` for double-faced cards)
- `type_line` (or from `card_faces[0].type_line`)
- `keywords` array

Build a flat list of all cards with these four fields and save it to the scratchpad (e.g. `<scratchpad>/{setCode}_cards.json`).

> **Dedup when counting.** `unique=prints` returns duplicate entries for the same card (alternate art, promos). When you count how many cards match a theme, dedup by `name` first — otherwise a single card can look like a 3-card theme. Do all counting in a Python script, not by eye.

---

## Step 4 – Identify the draft archetypes (signpost cards)

The goal is **one consolidated synergy group per two-color draft archetype**, not many small single-mechanic groups. First discover what the archetypes actually are:

- Fetch the multicolor/gold cards: `https://api.scryfall.com/cards/search?q=set%3A{setCode}+is%3Agold&unique=cards&order=color` (curl + User-Agent).
- Group them by color pair (`colors` array). The gold uncommons are the **signposts** — each names an archetype's mechanic and tribe.
- The **dual lands** (`{T}: Add {X} or {Y}` cards) confirm each pair's tribe/theme.
- **Do not assume 10 archetypes.** Count the color pairs that actually appear. Some sets are a 5-pair "color ring" (each color pairs with its two neighbors → 5 archetypes, e.g. `hob`), others have all 10. Let the gold cards tell you.
- If the user supplied a starter list of archetypes (color pair → tribe → mechanic), treat it as authoritative and use the gold cards to fill in any pairs they left unstated.

---

## Step 5 – Build one consolidated group per archetype

For **each archetype**, create a single keyword group named `"{Colors} {Tribe} — {Mechanic}"` (e.g. `"WU Humans — Draw Two"`, `"UG Elves — Landfall"`). The group's regex rules are a **union** — a card is tagged if ANY rule matches — so pack each archetype's whole playable pool into one filter, spanning three ingredient types:

- **Enabler** — cards that turn the mechanic on (e.g. for a "draw two" theme: `recruit`, extra-draw effects; for landfall: land ramp / `search your library for [^.]*land`).
- **Payoff** — cards that reward it (e.g. `draw (your |their )?second card`, `landfall`, `Storied` / `enduring story`).
- **Tribe** — the archetype's creature type via `type_line` (e.g. `Human`, `Elf`). Include closely-linked types when a dual land pumps several (e.g. `hob`'s BG land targets Bear/Spider/Wolf).

Each rule specifies:
- `property`: `"oracle_text"` or `"type_line"`
- `regex`: a pattern (matched case-insensitively)

**Always add a `"Creature Removal"` group** (a non-archetype utility filter, placed after the archetype groups). Start from this reusable base and add any set-specific removal wordings (evasion-conditional destroys, named burn spells, edict phrasings, mass -X/-X, etc.), then verify against the deduped pool for false positives (exclude "damage to target opponent"/face burn and generic "destroy target permanent" fixers that aren't really creature removal):

```json
"Creature Removal": [
  { "property": "oracle_text", "regex": "destroy target creature" },
  { "property": "oracle_text", "regex": "exile target creature" },
  { "property": "oracle_text", "regex": "deals \\d+ damage to (target creature|any target|another target creature|each [^.]*creature)" },
  { "property": "oracle_text", "regex": "deals \\d+ damage divided" },
  { "property": "oracle_text", "regex": "gets? -\\d/-\\d" },
  { "property": "oracle_text", "regex": "creatures? (target player controls|an opponent controls) gets? -\\d" },
  { "property": "oracle_text", "regex": "sacrifices a creature" },
  { "property": "oracle_text", "regex": "fights? (target|another target)" }
]
```

**Guidelines learned from `hob`:**
- Named mechanics → regex the keyword word in `oracle_text` (`ferocious`, `amass`, `landfall`, `Storied`).
- Prefer specific payoff clauses over broad verbs. `\+1/\+1 counter` not `\+1/\+1` (the latter catches anthems/pumps). `\bdie(s)?,` catches plural "die," triggers. Don't include bare `sacrifice this` (hits self-sac utility lands).
- Keep each group's total match count sane — aim for roughly 15–45% of the deduped pool per archetype. If a `type_line: Artifact` / `type_line: Legendary` enabler balloons a group, narrow it (e.g. `type_line: Equipment` + `type_line: Saga` instead of all `Artifact`).
- Verify every regex's match list/count in a Python script against the deduped pool before finalizing — don't guess.

Draft the entry as a JSON object matching this structure:

```json
{
  "{setCode}": {
    "keywords": {
      "WU Humans — Draw Two": [
        { "property": "type_line", "regex": "Human" },
        { "property": "oracle_text", "regex": "recruit" },
        { "property": "oracle_text", "regex": "draw (your |their )?second card" }
      ]
    }
  }
}
```

> The em dash `—` in group names is intentional and matches the `hob` entry style.

---

## Step 6 – Swarm review

Write the draft JSON to the scratchpad (e.g. `<scratchpad>/{setCode}_draft.json`). Spawn **3 agents in parallel** (single message, 3 Agent tool calls). Give each agent the **file paths** to the card list and the draft (they have file tools) rather than pasting the full card list inline. Each agent has a specific focus:

**Agent 1 – Coverage review:**
> "You are reviewing draft archetype synergy groups for the MTG set {setCode} ({setName}). Read the full card list at {cardListPath} and the draft keyword JSON at {draftPath}. The set's draft archetypes are {archetypeList}. For each archetype group, are there enabler or payoff cards (3+ unique cards, deduped by name) that belong to that archetype but are missing from its regex rules? Also flag any archetype that appears in the gold/signpost cards but has no group at all. Verify counts by scripting against the card list. Suggest concrete regex additions."

**Agent 2 – Accuracy review:**
> "You are reviewing draft archetype synergy groups for the MTG set {setCode} ({setName}). Read the full card list at {cardListPath} and the draft keyword JSON at {draftPath}. Write a Python script to run each regex (case-insensitive) against the deduped card pool. For each rule report: (a) false positives — cards it matches that don't belong to that archetype, (b) misses — cards that belong but aren't caught. Watch for over-broad patterns (bare `\\+1/\\+1`, `type_line: Artifact`/`Legendary`, generic `sacrifice this`). Suggest tighter or broader patterns. Do not guess — test."

**Agent 3 – Format review:**
> "You are reviewing the format of a keyword.json entry for the MTG set {setCode}. Read the existing keyword.json at /Users/magoja/Documents/project/jakeutil/mtg-limited/keyword.json and the new draft entry at {draftPath}. Does the structure, nesting, and field names exactly match the existing format (top-level set code → `keywords` → group name → array of `{property, regex}` objects)? Check regex escaping conventions (`\\+`, `\\d`, `\\b`). Report any discrepancies. Note: a `booster` key is optional and not required."

Collect all three responses. Reconcile feedback:
- Add missing enabler/payoff rules or missing archetype groups identified by Agent 1
- Fix regex patterns flagged by Agent 2
- Correct any format issues from Agent 3

Produce the final JSON entry.

---

## Step 7 – Update keyword.json

Read the current `/Users/magoja/Documents/project/jakeutil/mtg-limited/keyword.json`.

Merge the new set entry into the top-level object (add `"{setCode}": { "keywords": { ... } }` alongside existing keys). **Merge textually** (insert the new block) rather than round-tripping the whole file through a JSON dumper — the existing entries use hand-formatted compact styling that a re-dump would destroy, creating a huge noise diff. Anchor the edit on the file's tail (end of the last existing entry).

After writing, validate the file parses: `python3 -c "import json; json.load(open('mtg-limited/keyword.json'))"`.

---

## Step 8 – Commit

```bash
git -C /Users/magoja/Documents/project/jakeutil add mtg-limited/keyword.json
git -C /Users/magoja/Documents/project/jakeutil commit -m "$(cat <<'EOF'
Add keyword synergies for {setCode} ({setName})

Co-Authored-By: {your model} <noreply@anthropic.com>
EOF
)"
```

(Use the `Co-Authored-By` line for the model actually running this skill.)

Output: `Done. Added {N} archetype synergy groups for {setCode} ({setName}) and committed.`
