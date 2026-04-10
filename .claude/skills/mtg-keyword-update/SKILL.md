---
name: mtg-keyword-update
description: Update mtg-limited/keyword.json with synergy filter rules for the latest MTG limited set (if not already present). Fetches cards from Scryfall, analyzes synergy patterns, runs a swarm review, updates the file, and commits. Only operates on the jakeutil project folder (/Users/magoja/Documents/project/jakeutil).
tools: WebFetch, Read, Write, Bash, Agent
---

# MTG Keyword Update

Update `mtg-limited/keyword.json` with synergy filter rules for the latest MTG limited set.

**Project root (all file paths must be relative to this):** `/Users/magoja/Documents/project/jakeutil`

---

## Step 1 – Find the latest limited set

Fetch `https://api.scryfall.com/sets/` and parse the `data` array.

Filter rules (matching `set-utils.js` booster logic):
- `set_type` must be one of: `core`, `expansion`, `masters`, `draft_innovation`
- `released_at` must be ≤ today + 14 days (sets releasing within the next 2 weeks are included, matching `maxAgeDays: 14`)
- `card_count` must be > 0 (set must be complete/populated)
- Sort the filtered list by `released_at` descending
- Take the first entry as `latestSet` (capture `.code` and `.name`)

---

## Step 2 – Check if keyword.json already has this set

Read `/Users/magoja/Documents/project/jakeutil/mtg-limited/keyword.json`.

If `latestSet.code` is already a top-level key → output:

```
keyword.json already contains "{code}" ({name}). Nothing to do.
```

Then stop.

---

## Step 3 – Fetch all cards for the set

Fetch `https://api.scryfall.com/cards/search?q=set%3A{setCode}&unique=prints`.

If the response has `has_more: true`, follow `next_page` URLs until exhausted. Collect all cards from every page.

For each card record, extract:
- `name`
- `oracle_text` (or from `card_faces[0].oracle_text` for double-faced cards)
- `type_line` (or from `card_faces[0].type_line`)
- `keywords` array

Build a flat list of all cards with these four fields.

---

## Step 4 – Analyze synergies

Go through the full card list and identify **8–15 synergy groups**. For each group, produce:
- A short, human-readable **name** (e.g. "Life Gain", "Graveyard Recursion", "Token Swarm")
- **1–3 regex rules**, each specifying:
  - `property`: `"oracle_text"` or `"type_line"`
  - `regex`: a pattern that matches the synergy text (regexes are matched case-insensitively)

**What to look for:**

| Theme | Approach |
|-------|----------|
| Named mechanics (Landfall, Proliferate, Convoke, etc.) | Regex the keyword name in `oracle_text` |
| Repeating oracle_text phrases (3+ cards) | Extract the common clause as a regex |
| Tribal creature types with 4+ members | Match `type_line` |
| Graveyard themes | Regex "from your graveyard", "dies", "flashback", etc. |
| +1/+1 or -1/-1 counter themes | Regex counter notation |
| Life gain | Regex "gain" and "life", or "lifelink" |
| Sacrifice synergy | Regex "sacrifice" in `oracle_text` |
| Spell-casting triggers | Regex "whenever you cast" |
| Enter-the-battlefield triggers | Regex "when .* enters" |
| Token generation | Regex "create" and "token" |

Draft the synergy groups as a JSON object matching this structure:

```json
{
  "{setCode}": {
    "keywords": {
      "Group Name": [
        { "property": "oracle_text", "regex": "pattern" },
        { "property": "type_line", "regex": "pattern" }
      ]
    }
  }
}
```

---

## Step 5 – Swarm review

Spawn **3 agents in parallel** (single message, 3 Agent tool calls) with the draft JSON and the full card list. Each agent has a specific focus:

**Agent 1 – Coverage review:**
> "You are reviewing draft synergy groups for the MTG set {setCode} ({setName}). Here is the full card list: {cardList}. Here is the draft keyword JSON: {draftJSON}. Are there major synergy themes present in 3 or more cards that are missing from the draft? List any missing groups with suggested names and regex patterns."

**Agent 2 – Accuracy review:**
> "You are reviewing draft synergy groups for the MTG set {setCode} ({setName}). Here is the full card list: {cardList}. Here is the draft keyword JSON: {draftJSON}. For each regex pattern, check whether it correctly matches the intended cards. Flag: (a) false positives — patterns that match unrelated cards, (b) misses — cards that belong to a group but the regex doesn't catch them. Suggest tighter or broader patterns as needed."

**Agent 3 – Format review:**
> "You are reviewing the format of a keyword.json entry for the MTG set {setCode}. Here is the existing keyword.json for reference: {existingJSON}. Here is the new draft entry: {draftJSON}. Does the structure, nesting, and field names exactly match the existing format? Report any discrepancies."

Collect all three responses. Reconcile feedback:
- Add any missing groups identified by Agent 1
- Fix regex patterns flagged by Agent 2
- Correct any format issues from Agent 3

Produce the final JSON entry.

---

## Step 6 – Update keyword.json

Read the current `/Users/magoja/Documents/project/jakeutil/mtg-limited/keyword.json`.

Merge the new set entry into the top-level object (add `"{setCode}": { "keywords": { ... } }` alongside existing keys).

Write the updated JSON back to `/Users/magoja/Documents/project/jakeutil/mtg-limited/keyword.json` with 2-space indentation.

---

## Step 7 – Commit

```bash
git -C /Users/magoja/Documents/project/jakeutil add mtg-limited/keyword.json
git -C /Users/magoja/Documents/project/jakeutil commit -m "$(cat <<'EOF'
Add keyword synergies for {setCode} ({setName})

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

Output: `Done. Added {N} synergy groups for {setCode} ({setName}) and committed.`
