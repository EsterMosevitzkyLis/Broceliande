# Broceliande — M5a Addendum: Dialogue System

**Status:** addendum to the existing specs in `docs/`. Everything there still applies unless this document overrides it.
**Goal:** Loop Hero-style dialogues: gameplay events trigger a conversation between two characters, shown as two large portraits with a text box. The listener is dimmed; the speaker hops and is fully lit. The player only advances the text. All narrative data lives in a **second Google Sheet, "Broceliande Narrative"**, not in the config or the main sheet.

> Same conventions as before: **MUST** / **SHOULD**, **TUNING** marks starting guesses, CSV text in plain ASCII (no leading `+ - = @`, no semicolons), verification by reading the code, quick smoke check only (see `CLAUDE.md`). Ask rather than guess where this is silent.

---

## 0. Story note

The player character is, in the story, an **ovate**: a druid in training. The UI keeps calling him **the Druid** for now. In dialogues his name plate reads **You**.

---

## 1. Data: the Broceliande Narrative sheet

### 1.1 Files and pulling

- A second Google Sheet, **Broceliande Narrative**, published like the main one.
- Its tabs are pulled into `data/narrative/<tab>.csv`.
- `data/sheet_sources.json` gets a second source, e.g.:
  ```json
  {
    "main": { "publishedId": "...", "tabs": { "globals": 0, "...": 0 } },
    "narrative": { "publishedId": "...", "tabs": { "characters": 0, "dialogues": 0, "triggers": 0 } }
  }
  ```
  Keep backwards compatibility with the current single-sheet format if that's simpler (e.g. a separate `narrative` key next to the existing fields).
- `tools/pull_sheet.py` (and the `.bat`) pulls both sheets; `?live` mode reads both.
- The game loads the narrative CSVs at start-up with the rest, and validates them (§1.5).

### 1.2 `characters` tab

| Column | Meaning |
|---|---|
| `id` | e.g. `druid`, `diaena` |
| `name` | Shown under the portrait. The player character's is `You`. |
| `portrait` | Optional image file name in `data/narrative/portraits/`. Blank or missing file = placeholder drawing (§3.4). |
| `notes` | Ignored by the game |

### 1.3 `dialogues` tab

One row per line:

| Column | Meaning |
|---|---|
| `dialogue` | Dialogue ID, e.g. `introAwakening` |
| `line` | Order within the dialogue (1, 2, 3…) |
| `speaker` | A character ID |
| `text` | The line. May contain commas (quoted in the CSV). |
| `notes` | Ignored |

### 1.4 `triggers` tab

One row per trigger:

| Column | Meaning |
|---|---|
| `id` | Trigger ID |
| `enabled` | TRUE / FALSE |
| `event` | The game event (§2) |
| `regionOrder` | Condition: region by its order (1 = first region). Blank = any. |
| `row` | Condition: map row (1 = first row). Blank = any. |
| `level` | Condition: a level ID. Blank = any. Use `regionOrder` + `row` when the trigger should survive level renames. |
| `item` | Condition for `itemAcquired`: an item ID. Blank = any. |
| `occurrence` | Condition for counted events: e.g. `1` for the first death ever. Blank = any. |
| `dialogue` | The dialogue to play |
| `left` | Character on the left (the player character by convention) |
| `right` | Character on the right |
| `repeat` | `onceEver` (default), `oncePerRun` or `always` |
| `priority` | When several triggers match the same event, higher plays first; ties by row order |
| `notes` | Ignored |

### 1.5 Validation

Errors at start-up (shown in the game's error panel, as for the main sheet):

- a trigger's `dialogue`, `left`, `right` or `item` doesn't exist;
- a dialogue line's `speaker` isn't one of that trigger's two characters;
- an unknown `event` or `repeat` value;
- a dialogue with gaps or duplicates in `line`.

Warnings: a portrait file that's named but missing (the placeholder is used).

---

## 2. Events and triggers

### 2.1 Events

The dialogue system listens on the existing event bus. Each event carries its context (region, row, level, item, counts):

| Event | When it fires | When the dialogue shows |
|---|---|---|
| `prepStart` | A battle's Prep begins (after the scene fade-in) | Immediately, before the player can do anything else |
| `battleWon` | A battle is won | After the end delay, **before** the Victory overlay |
| `death` | The Druid dies (`occurrence` counts deaths across all runs) | After the end delay, **before** the Defeat overlay |
| `itemAcquired` | An item joins the run (revealed after victory, bought, or crafted) | Where it happens: on the map after the reveal message, or in the Trader or Tinker's Rest scene |
| `regionEntered` | A region's map opens at the start of that region | On the map, after the crossing dialog (if any) |

Further events can be added later the same way.

### 2.2 Matching and repeats

- When an event fires, every enabled trigger whose `event` and filled-in conditions match is a candidate.
- **Repeat rules:**
  - `onceEver`: plays once, ever. Remembered in `localStorage` (key e.g. `broceliande.dialoguesSeen.v1`, a list of trigger IDs), with try/catch; if storage is unavailable, it lasts for the session.
  - `oncePerRun`: remembered in the run state, reset by Start again.
  - `always`: plays every time.
- Several candidates play **one after another** in priority order, each as its own dialogue.
- A dialogue counts as seen as soon as it opens (so skipping it doesn't make it replay).

---

## 3. The dialogue box

### 3.1 Layout

- A dark overlay (about 60%) over the whole screen. The game underneath is paused and receives no input.
- **Two large portraits**, about 380 × 480 px: the `left` character on the left edge, the `right` character on the right edge, both standing on the lower half of the screen.
- **Name plates** under each portrait, with the character's `name` (e.g. **You**, **Diaena**).
- **A text box** between the portraits, across the lower part of the screen, in the storybook style used for the region dialog. A small "continue" marker (e.g. a gently pulsing ▸) at its bottom right when the line is complete.
- A small **Skip** button in a top corner.

### 3.2 Speaking and listening

- The **speaker** is shown fully lit.
- The **listener** is dimmed: darker (about 45% brightness) and slightly desaturated.
- On each new line, the speaker **hops**: a quick bounce of about 10 px up and back, over about 0.22 s (ease out, then in). If the speaker changes, the new speaker un-dims during the hop and the previous one dims. The first line opens with the first speaker's hop.
- Respect `prefers-reduced-motion`: no hop, just the lighting change.

### 3.3 Text and advancing

- **Typewriter:** each line appears letter by letter (about 45 characters per second, TUNING).
- **Advance** with a left click anywhere, **Space** or **Enter**:
  - while the line is still typing: complete it instantly;
  - when it's complete: go to the next line;
  - after the last line: close the dialogue, and the game carries on (or the next queued dialogue opens).
- **Skip** (the button, or **Esc**) closes the whole dialogue at once.
- Clicks used by the dialogue never reach the game underneath.

### 3.4 Placeholder portraits

Until real images exist in `data/narrative/portraits/`:

- **The player character (`druid`):** a large bust of the existing hooded Druid drawing, hood over the eyes, beard, staff over the shoulder.
- **Diaena (`diaena`):** a simple drawn bust of a young woman with long auburn hair, a hooded green-grey cloak, and a calm, alert expression, in the game's palette.
- Characters without a portrait or a placeholder get a plain silhouette in a neutral colour, with their name.

Portrait images, when present, are drawn to fit the portrait frame, keeping their proportions, anchored at the bottom.

### 3.5 Sound

New `sounds` rows (main sheet): `dialogueOpen` (a soft low chime), `dialogueAdvance` (a quiet page-turn tick). Typing has no sound.

### 3.6 Settings

New `globals` keys (main sheet), all TUNING:

| Key | Value |
|---|---|
| `DIALOGUE_TYPE_SPEED` | 45 (characters per second) |
| `DIALOGUE_HOP_HEIGHT` | 10 (px) |
| `DIALOGUE_HOP_TIME` | 0.22 (s) |
| `DIALOGUE_DIM_BRIGHTNESS` | 0.45 |

---

## 4. The first dialogue

`characters`:

| id | name | portrait |
|---|---|---|
| `druid` | You | |
| `diaena` | Diaena | |

`dialogues`:

| dialogue | line | speaker | text |
|---|---|---|---|
| `introAwakening` | 1 | `diaena` | Are you awake? |
| `introAwakening` | 2 | `druid` | Aahhh... My head hurts. |
| `introAwakening` | 3 | `diaena` | There are wolves coming. We should run. |
| `introAwakening` | 4 | `druid` | Wolves? Where?... |

`triggers`:

| id | enabled | event | regionOrder | row | dialogue | left | right | repeat | priority |
|---|---|---|---|---|---|---|---|---|---|
| `introAwakening` | TRUE | `prepStart` | 1 | 1 | `introAwakening` | `druid` | `diaena` | `onceEver` | 0 |

So: clicking the first node of the first region starts Prep, and before anything else can be clicked, the dialogue plays. When it closes, Prep carries on as usual.

---

## 5. Debug

- Debug panel buttons: **Forget seen dialogues** (clears both the saved list and the run's list) and **Play dialogue…** (a dropdown of every dialogue, shown with the trigger's characters, or with the first two speakers if it has no trigger).
- Panel line: the dialogue currently open and its line number, and the triggers that matched the last event.

---

## 6. Acceptance criteria

- [ ] The Broceliande Narrative sheet's three tabs are pulled into `data/narrative/` by the pull script, read in `?live` mode, and validated at start-up.
- [ ] Triggers match events by their filled-in conditions; repeats follow `onceEver`, `oncePerRun` and `always`; several matches play in priority order.
- [ ] The five events fire at the right moments and show their dialogues where §2.1 says.
- [ ] The dialogue box: overlay, two portraits with name plates, text box, continue marker, Skip.
- [ ] The listener is dimmed; the speaker is lit and hops on each line; reduced motion respected.
- [ ] Typewriter text; click, Space or Enter completes then advances; Skip or Esc closes; no clicks reach the game.
- [ ] Placeholder portraits for the Druid and Diaena; image files used when present.
- [ ] The intro dialogue plays once ever when the first Prep of region 1, row 1 begins, then Prep continues.
- [ ] Debug buttons and panel lines work.
- [ ] Everything else still works.
