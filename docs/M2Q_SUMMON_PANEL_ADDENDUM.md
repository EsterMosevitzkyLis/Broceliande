# M2q Addendum — Summon Panel

Overrides M1 §15.1 steps 2-3, the Druid part of §16.2, and every later "click the Druid" (M1d, M1i, M2k).

## 1. Panel
- All summons are chosen from a panel at the bottom centre of the battle screen, one card each: image, name, active count / cap, cost rows, shortcut key, and a reason when unavailable.
- The panel shows in Combat only.
- It floats over the battlefield, see-through. No level geometry changes.
- Hovering a card shows the summon's description above it.

## 2. Behaviour
- Clicking a card does exactly what its shortcut key does: start placement, switch to another summon, or cancel if it is the one being placed. An unavailable summon shows its reason near the Druid, plays the denied sound and flashes its card.
- The summon being placed has a highlighted card.
- A summon can be switched while placing, so cards are no longer greyed out with "Druid is busy".
- Clicks on the panel never reach the field: no summon can be placed under it.
- Exception: while aiming a Bough Double the panel fades and lets clicks through, so targets under it stay reachable.

## 3. The Druid
- The Druid is no longer clickable and has no menu. Build and turret menus are unchanged.
