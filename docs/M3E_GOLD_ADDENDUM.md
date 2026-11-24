# Broceliande — M3e Addendum: Gold and the Trader's Shop

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2P`, `M3A`–`M3D`). Everything there still applies unless this document overrides it. **Replaces the Trader's barter system** (M2n §3, §4.3) with gold.
**Goal:** a currency, **gold**, found in the world and on humanoid enemies, spent and earned at Traders. Each Trader becomes a fixed character with their own weighted stock tables.

> Same conventions as M3a (data in the sheet, ASCII CSV text, no leading `+ - = @`, no semicolons, verification by reading the code, quick smoke check only).

---

## 0. Data changes and the sheet

As in M2k §0. New tabs: `traderProfiles`, `traderTables`, `traderStock` (add with **Insert new sheet(s)**, Separator **Comma**, and send their gids). Changed tabs: `resources`, `features`, `drops`, `trade`, `traders`, `globals`, `sounds`, `items` (new `price` column, filled for every item; re-add its dropdowns after re-importing) and `recipes` (new `patternPrice` column, filled for every recipe).

---

## 1. Narrative framing

Gold here is **old gold**: tarnished coins from a vanished, more human past. Scorched coins in the Cinderwood's burnt villages; offerings sunk in ponds; grave-goods and the purses of the drowned in Hag's Causeway. The Druid has no use for it himself, but the people who remain (traders) still do. The icon is a worn coin with a faint green tarnish, not a shiny one.

---

## 2. Gold

### 2.1 What it is

- New `resources` row `gold`, name **Gold**, with a new `resources` column `kind`: `currency` for gold, `material` for the six existing resources.
- **Materials** appear in costs (turrets, summons, upgrades, recipes). **Currency** never does: gold is only spent and earned at Traders. Crafting stays materials-only.
- **HUD:** a gold counter (coin icon + amount) at the **start** of the resource panel, slightly set apart from the materials. Shown everywhere the resource panel is (battle, map, Trader, Tinker's Rest). Starts at 0.
- Gold works like a resource for: floaters, field drops, Squirrel pickups, the Victory sweep, sinking in the mire, carry-over, the map's carried resources, and the death penalty (§2.4).
- Coin sound on gain: a small, dull clink, distinct from the material chimes.

### 2.2 Sources: resource spots

New `features` columns `gold_min`, `gold_max` (blank = 0). Where coins make sense:

| Spot | Gold |
|---|---|
| Ruins | 4–9 |
| Pond | 2–5 (offerings and lost coins) |
| Peat Bog | 2–5 (bog bodies) |
| Tree, Reed Patch, Shrub | none |

### 2.3 Sources: enemies

Only **humanoid** enemies carry gold. New `drops` rows with resource `gold` (Grim versions: chance ×1.5, capped at 1.0, as usual):

| Enemy | Chance | Amount |
|---|---|---|
| Ogre | 100% | 15–25 |
| Drowned Thrall | 20% | 1–2 |
| Mirebound Brute | 40% | 2–4 |
| The Drowned Knight | 100% | 20–30 |
| The Bog King | 100% | 60–80 |
| Wolves, Bears, Stirges | none | |

Rough income target (TUNING): about 20–40 gold per battle in the Cinderwood, 40–80 in Hag's Causeway. Gleaner's Belt (drop chance ×1.25) applies to gold drops too.

### 2.4 Death

Gold follows the region's `deathLossPct` like other resources: all of it in the Cinderwood (run ends), 70% in Hag's Causeway (`floor(gold × 0.3)` kept). It's listed on the Defeat overlay.

---

## 3. Traders as characters

### 3.1 Profiles

Each named trader is a fixed character with their own stock tables, so players learn who sells what. New `traderProfiles` tab:

| Column | Meaning |
|---|---|
| `id` | e.g. `hettie` |
| `name` | e.g. Hettie Thistlewick |
| `regions` | blank = any region, or `cinderwood` / `hags` |
| `itemPriceMult` | multiplies the prices of items they sell |
| `patternPriceMult` | multiplies the prices of patterns they sell |
| `itemBuyMult` | multiplies what they pay for the player's items |
| `notes` | |

- Each Trader node on the map gets a profile (seeded), from those allowed in its region, with no repeats in a run.
- A row with `id` = `default` supplies any table or stock line a profile doesn't define.
- The trader's name pool moves from the `traders` tab to `traderProfiles`. The `traders` tab keeps the dialogue lines (§5).

### 3.2 Weighted tables

New `traderTables` tab, one row per table line (long format, like the designer's sketch):

| Column | Meaning |
|---|---|
| `trader` | profile id |
| `table` | `itemCount`, `patternCount`, `itemRarity` or `patternRarity` |
| `value` | the count, or the rarity |
| `weight` | its weight in that table |

On each visit (rolled when the map is generated, seeded):

1. Roll **itemCount** → how many items the trader sells.
2. For each item, roll **itemRarity** (1–3 only; Crafted items are never sold) and pick a random item of that rarity that the player doesn't own and isn't already in this shop.
3. Roll **patternCount** → how many patterns they sell.
4. For each pattern, roll **patternRarity** (0–3, so Crafted patterns *can* be sold) and pick a random pattern of that rarity that the player doesn't know and isn't already in this shop.
5. If a pool is empty for the rolled rarity, try the other rarities with weight > 0; if all are empty, that slot is skipped.

### 3.3 Resource stock and prices

New `traderStock` tab: `trader`, `resource`, `stockMin`, `stockMax`, `priceMin`, `priceMax`.

- Per visit, each resource rolls a stock between `stockMin` and `stockMax`, and a **price multiplier** between `priceMin` and `priceMax`. This replaces the global ±30% variation, so each trader has their own tendencies (one always sells Peat cheap; another charges a lot for Boughs).
- Resources a trader doesn't list (and `default` doesn't either) aren't stocked, but the trader still buys them.
- Peat is only stocked in Hag's Causeway, as before (use `regions` or the profile's region).

---

## 4. Prices

New `globals` (all TUNING):

| Key | Value | Meaning |
|---|---|---|
| `GOLD_PER_VALUE` | 2 | Gold per unit of a resource's `baseValue` (`trade` tab) |
| `RESOURCE_SELL_FRACTION` | 0.25 | What a trader pays for resources, as a fraction of their selling price |
| `ITEM_PRICE_R1` / `R2` / `R3` | 20 / 40 / 80 | Item selling prices by rarity |
| `PATTERN_PRICE_R0` / `R1` / `R2` / `R3` | 150 / 30 / 60 / 120 | Pattern selling prices by rarity (patterns are permanent, so dearer) |
| `ITEM_SELL_FRACTION` | 0.4 | What a trader pays for the player's items, as a fraction of that item's price |
| `SHOP_PRICE_JITTER` | 0.1 | Per-visit variation (±10%) on item and pattern prices |

- **Buying a resource:** `ceil(baseValue × GOLD_PER_VALUE × the trader's price multiplier)` per unit.
- **Selling a resource, in bundles:** the trader pays `buy price × RESOURCE_SELL_FRACTION` per unit, which is often a fraction of a coin. So resources are sold in **bundles** that are worth whole gold:
  - Find the smallest bundle of `n` units (n from 1 to 10) whose value `n × unit sell price` is closest to a whole number of gold **without going over** what the trader would pay. The shop shows it as a ratio, e.g. **`2 Pits → 1 gold`** or **`1 Bough → 2 gold`**.
  - The quantity stepper moves in whole bundles, so no unit is ever sold for nothing. If even 10 units are worth less than 1 gold, the trader shows **"Not interested"** for that resource.
  - Small amounts of cheap resources are worth very little. That's intended: traders aren't interested in raw materials.
- **Items and patterns sold by the trader:** the item's (or pattern's) base price × the profile's `itemPriceMult` / `patternPriceMult` × the per-visit jitter, rounded to the nearest 5.
  - **Base price:** the new `items` column `price`, or `recipes` column `patternPrice`. **Fill both columns for every existing item and recipe** with the rarity default for its rarity (`ITEM_PRICE_R*`, `PATTERN_PRICE_R*`), so every price is visible in the sheet and the designer can tweak any of them directly. A cell left blank later (e.g. for a new item) falls back to the rarity default.
- **Selling an item:** the item's base price (as above) × `ITEM_SELL_FRACTION` × the profile's `itemBuyMult`, rounded down to the nearest 5 (minimum 5). Selling an equipped item unequips it.
- **Patterns can't be sold** (you can't unlearn knowledge).
- Remove the barter settings (`TRADE_MARGIN`, `TRADE_MAX_RATIO_TERM`, the old global price variation). The `trade` tab keeps `baseValue` (and its stock columns as fallbacks for `default`).

---

## 5. The shop scene

Keeps the full-screen trader scene (M2n §4.2): the clearing, the Druid with his pack on the left, the trader behind the blanket on the right. The barter scale is replaced by a transaction panel.

### 5.1 Layout

- **Gold** shown large near the Druid's pack, with a small coin pile.
- **The trader's blanket** (goods) has three groups:
  - **Resources:** icon, stock, unit price, and a cheap/pricey tag (from the price multiplier).
  - **Items:** cards with icon (rarity frame), name, slot, rarity label, effect and price.
  - **Patterns:** rolled-scroll cards showing which item the pattern teaches, its rarity, its effect, its recipe (cost rows), and price.
- **The Druid's pack** (to sell): his resources with their unit sell price, and his items (equipped ones marked) with their sell price.

### 5.2 Buying and selling

- **Resources:** click a resource on either side → the centre panel shows **Buy** or **Sell**, a quantity stepper with **Max** (selling steps in whole bundles, §4), the total in gold, and the before/after counts.
- **Items and patterns:** click a card → the centre panel shows it larger, with **Buy** (or **Sell** for the player's items) and the price. A bought pattern is learned permanently on the spot; a bought item joins the run's items (shown as New on the map).
- Buttons are disabled with a reason when you can't afford it, the trader is out of stock, or (for items) you already own it.
- **Undo last trade** works repeatedly until you leave (buying a pattern is undone too, unlearning it, only within the visit).
- Sounds: coin clinks on buy and sell; the pattern sound on buying a pattern.

### 5.3 Map tooltip hints

Replace the barter hints with:

```
Wandering Trader — Hettie Thistlewick
Sells: 1 item (Rare), 2 patterns
Cheap: Shells
Has Boughs: 2
```

- `Sells:` counts and the rarities rolled (items and patterns).
- `Cheap:` resources with a low price multiplier this visit.
- The Bough stock line, as before.

---

## 6. Starter traders

All TUNING. Weights are given as `value:weight` pairs.

### 6.1 Profiles

| id | Name | Regions | Personality | itemPriceMult | patternPriceMult | itemBuyMult |
|---|---|---|---|---|---|---|
| `hettie` | Hettie Thistlewick | any | The pattern seller: always has patterns, never sells Commons | 1.0 | 0.9 | 1.0 |
| `marrow` | Old Marrow | any | The resource merchant: big stock, cheap common materials, rarely items | 1.1 | 1.2 | 0.8 |
| `ash` | Brother Ash | cinderwood | Relic dealer: pricey Rare items, pays well for your items | 1.2 | 1.1 | 1.4 |
| `mag` | Mag Fennick | hags | Swamp trader: Peat, Shells and Reeds cheap, sells Crafted patterns | 1.0 | 1.0 | 1.0 |
| `tom` | Tom Nine-Toes | any | Cheapskate: low prices both ways, mostly Common and Uncommon items | 0.8 | 0.9 | 0.6 |
| `sorrel` | Sorrel the Pedlar | any | Generalist: a bit of everything | 1.0 | 1.0 | 1.0 |
| `default` | | | Fallback only | 1.0 | 1.0 | 1.0 |

### 6.2 Tables

| Trader | itemCount | patternCount | itemRarity | patternRarity |
|---|---|---|---|---|
| hettie | 0:7, 1:12 | 1:13, 2:8 | 2:5, 3:8 | 1:3, 2:5, 3:4, 0:2 |
| marrow | 0:10, 1:3 | 0:12, 1:2 | 1:6, 2:3 | 1:5, 2:3 |
| ash | 1:6, 2:6, 3:2 | 0:8, 1:3 | 2:3, 3:7 | 2:3, 3:4 |
| mag | 0:5, 1:6 | 1:8, 2:4 | 1:3, 2:4, 3:2 | 0:6, 2:3, 3:2 |
| tom | 1:6, 2:6, 3:3 | 0:6, 1:4 | 1:7, 2:4 | 1:6, 2:2 |
| sorrel | 0:3, 1:7, 2:3 | 0:4, 1:7, 2:2 | 1:4, 2:4, 3:2 | 1:4, 2:4, 3:2, 0:1 |
| default | 0:5, 1:5 | 0:6, 1:4 | 1:5, 2:4, 3:1 | 1:5, 2:4, 3:2, 0:1 |

### 6.3 Resource stock and price ranges

Write `traderStock` rows from these tendencies (Claude Code fills the exact rows; `default` covers anything not listed):

| Trader | Tendencies |
|---|---|
| default | Pits 8–16, Feathers 4–8, Shells 3–6, Reeds 2–5, Boughs 1–2, Peat 3–6 (Hag's Causeway only), price 0.85–1.15 |
| hettie | Small stock (about half of default), price 0.9–1.2 |
| marrow | Big stock (about double), Pits and Feathers price 0.6–0.85, others 0.9–1.1 |
| ash | Small stock, price 1.0–1.3 |
| mag | Peat, Shells and Reeds big stock at 0.6–0.85; others default |
| tom | Default stock, price 0.75–1.0 |
| sorrel | Default |

---

## 7. Dialogue

The `traders` tab keeps its lines, with a new optional `trader` column (blank = any trader) so characters can have their own voice, and new kinds `buy`, `sell` and `poor` (can't afford). Claude Code writes 2 lines per kind for Hettie, Old Marrow, Brother Ash and Mag Fennick, in their personalities, and keeps the generic lines for the others.

---

## 8. Debug

- `G` also grants +50 gold.
- `Shift+T` (on the map) opens a trader scene; pressing it again cycles through the profiles.
- Panel (in the shop): the profile, the rolled counts and rarities, and each resource's stock and price multiplier.

---

## 9. Acceptance criteria

### Gold
- [ ] Gold is a `currency` resource with its own HUD counter (starting at 0), never part of material costs.
- [ ] Ruins, Ponds and Peat Bogs yield gold; humanoid enemies drop it as field drops; beasts and Stirges don't.
- [ ] Gold works with floaters, Squirrels, the sweep, sinking, carry-over and the death penalty.

### Traders
- [ ] Fixed profiles with their own tables and stock, assigned per Trader node by region, no repeats per run.
- [ ] Shops roll item and pattern counts and rarities from the tables, never sell owned items or known patterns, never sell Crafted items, can sell Crafted patterns.
- [ ] Prices follow §4; resources sell back for a quarter of their price, in whole-gold bundles shown as ratios (e.g. `2 Pits → 1 gold`); items sell for 40% (× the profile); patterns can't be sold.
- [ ] Every item has a filled `price` and every recipe a filled `patternPrice` (rarity defaults as starting values); a blank cell falls back to the rarity default.
- [ ] The shop scene shows gold, goods (resources, items, patterns with full details) and the pack; buying, selling and repeated undo work; a bought pattern is learned permanently.
- [ ] Map tooltips show what the trader sells and their cheap resources.
- [ ] Barter settings are removed.

### General
- [ ] Dialogue per trader and new kinds work.
- [ ] Debug additions work; the report lists new and changed tabs; the pull script wasn't run.
- [ ] Everything else still works.
