// Potions (Potions addendum): the run's potion inventory and belt, and each potion-tier's name and
// description. A potion-tier ('healing:faint', C.potionKey) is the unit everywhere. The run holds
//   potions:   { key: count }, the inventory (stacks; what is not in a belt slot)
//   belt:      [key | null], one potion per slot (no stacks), as many slots as beltSlotCount
//   beltSlots: { itemId: n }, each equipment belt's potion slots, rolled once when the run gets it
//   hasPotions: whether the run has ever owned a potion (no belt UI at all before, §3.1)
// Battle use is in js/systems/potionSystem.js.

import * as C from './config.js';
import { createRng } from './rng.js';

// Potions that do something yet (phase 1: Healing only). The others sit in slots, greyed, "not yet".
const WORKING = ['healing'];

export function potionRow(key) {
  return C.POTIONS[key] ?? null;
}

// "Faint Potion of Healing" (§1).
export function potionName(key) {
  const p = potionRow(key);
  return p ? `${C.POTION_TIERS[p.tier].label} ${p.potion}` : key;
}

export function isPotionWorking(key) {
  return WORKING.includes(potionRow(key)?.id);
}

const USE_LABEL = { drink: 'Drink', prepOnly: 'Drink in Prep', throw: 'Throw', auto: 'Used by itself' };

// "Faint · Restoration · Drink" (the tooltip's second line).
export function potionKindLine(key) {
  const p = potionRow(key);
  const category = p.category.charAt(0).toUpperCase() + p.category.slice(1);
  return `${C.POTION_TIERS[p.tier].label} · ${category} · ${USE_LABEL[p.use]}`;
}

// What it does with this tier's numbers (§5).
export function potionEffectText(key) {
  const p = potionRow(key);
  const a = p.amount;
  const d = p.duration;
  const r = p.radius;
  switch (p.id) {
    case 'healing': return `Restores ${a} HP at once.`;
    case 'regeneration': return `Restores ${a} HP a second for ${d} s.`;
    case 'cleansing': return a > 0 ? `Removes venom at once, and wards off new venom for ${a} s.` : 'Removes venom at once.';
    case 'phoenix': return `Drunk by itself when you would fall in battle: you stay at ${a} HP and take no damage for 2 s. Once per battle.`;
    case 'wardBark': return a >= 100 ? `You take no damage for ${d} s.` : `You take ${a}% less damage for ${d} s.`;
    case 'wardVenom': return a >= 100 ? `You take no venom damage for ${d} s.` : `You take ${a}% less venom damage for ${d} s.`;
    case 'fury': return `Your strikes deal ${a}x damage for ${d} s.`;
    case 'quickening': return `You strike ${a}x as fast for ${d} s.`;
    case 'foresight': return `${a} extra ${a === 1 ? 'step' : 'steps'} this Prep.`;
    case 'mireAura': return `Enemies within ${r} px of you are slowed by ${a}% for ${d} s.`;
    case 'rootgripAura': return `Every 4 s, enemies within ${r} px of you are rooted for ${a} s. Lasts ${d} s.`;
    case 'bewilderAura': return `Enemies coming within ${r} px of you are confused for ${a} s. Lasts ${d} s.`;
    case 'thornAura': return `Enemies within ${r} px of you take ${a} damage a second for ${d} s.`;
    case 'burrowcall': return `Squirrels summoned in the next ${d} s are Elder Squirrels, ${a}% faster.`;
    case 'firebomb': return `A ${r} px patch of fire where it breaks: enemies in it burn for ${a} damage a second. Lasts ${d} s.`;
    case 'acidFlask': return `Enemies within ${r} px of where it breaks take ${a}% more damage for ${d} s.`;
    case 'sporecapFlask': return `A ${r} px spore cloud where it breaks: enemies in it are confused for ${a} s. Lasts ${d} s.`;
    case 'tanglevineFlask': return `Enemies within ${r} px of where it breaks are rooted for ${a} s.`;
    default: return `${a} ${p.unit}`;
  }
}

// Every potion-tier in display order: by potion (the tab's order), then tier.
export function potionOrder(a, b) {
  const pa = potionRow(a);
  const pb = potionRow(b);
  return C.POTION_IDS.indexOf(pa.id) - C.POTION_IDS.indexOf(pb.id) || pa.rank - pb.rank;
}

// ---------------------------------------------------------------------------
// Belt slots (§3.1)
// ---------------------------------------------------------------------------

// The chances of [2, 3, 4, 5] slots for a belt item, by its rarity.
export function beltSlotOdds(itemId) {
  return C.BELT_SLOT_ODDS[C.ITEMS[itemId].rarity] ?? C.BELT_SLOT_ODDS[0];
}

// An equipment belt's slots, rolled once per run when the run gets it (addItem), seeded from the
// run seed and the item, so getting it again (sold and bought back, an undone craft) keeps the roll.
export function rollBeltSlots(run, itemId) {
  if (C.ITEMS[itemId]?.slot !== 'belt' || run.beltSlots[itemId] !== undefined) return;
  let h = (run.seed ^ 0x5be17) >>> 0;
  for (let i = 0; i < itemId.length; i++) h = Math.imul(h ^ itemId.charCodeAt(i), 2654435761) >>> 0;
  const odds = beltSlotOdds(itemId);
  const total = odds.reduce((a, b) => a + b, 0);
  let x = createRng(h).next() * total;
  let slots = 2 + odds.findLastIndex((w) => w > 0); // (rounding)
  for (let i = 0; i < odds.length; i++) {
    x -= odds[i];
    if (x < 0 && odds[i] > 0) { slots = 2 + i; break; }
  }
  run.beltSlots[itemId] = slots;
}

// How many potion slots the Druid has: the equipped belt's roll, or POTION_SLOTS_BASE without one.
export function beltSlotCount(run) {
  const belt = run.equipped.belt;
  return Math.min(C.POTION_MAX_SLOTS, belt ? run.beltSlots[belt] ?? C.POTION_SLOTS_BASE : C.POTION_SLOTS_BASE);
}

// The tooltip line for a belt item (equipment panel, Tinker, Trader): its rolled slots once the run
// has it, else the odds ("Potion slots: 2 (80%) or 3 (20%)"). null for any other item.
export function beltSlotsLine(run, itemId) {
  if (C.ITEMS[itemId]?.slot !== 'belt') return null;
  const rolled = run?.beltSlots?.[itemId];
  if (rolled !== undefined) return `Potion slots: ${rolled}`;
  const odds = beltSlotOdds(itemId);
  const total = odds.reduce((a, b) => a + b, 0);
  const parts = odds.map((w, i) => ({ n: 2 + i, pct: Math.round((100 * w) / total) })).filter((o) => o.pct > 0);
  return parts.length === 1 ? `Potion slots: ${parts[0].n}` : `Potion slots: ${parts.map((o) => `${o.n} (${o.pct}%)`).join(' or ')}`;
}

// After any change of belt: the slot list matches the count; potions in slots that no longer exist
// go back to the inventory, last slots first.
export function fitBelt(run) {
  const n = beltSlotCount(run);
  while (run.belt.length > n) {
    const key = run.belt.pop();
    if (key) addPotion(run, key);
  }
  while (run.belt.length < n) run.belt.push(null);
}

// ---------------------------------------------------------------------------
// Inventory (§2) and the belt's equip / unequip (§3.2)
// ---------------------------------------------------------------------------

export function addPotion(run, key, count = 1) {
  if (!C.POTIONS[key] || count <= 0) return false;
  run.potions[key] = (run.potions[key] ?? 0) + count;
  if (!run.hasPotions) {
    run.hasPotions = true;
    fitBelt(run);
  }
  return true;
}

function takePotion(run, key) {
  if (!(run.potions[key] > 0)) return false;
  run.potions[key]--;
  if (run.potions[key] === 0) delete run.potions[key];
  return true;
}

// Inventory → the first free slot (nothing if the belt is full).
export function equipPotion(run, key) {
  const i = run.belt.indexOf(null);
  if (i < 0 || !takePotion(run, key)) return false;
  run.belt[i] = key;
  return true;
}

// A slot → the inventory.
export function unequipPotion(run, slot) {
  const key = run.belt[slot];
  if (!key) return false;
  run.belt[slot] = null;
  addPotion(run, key);
  return true;
}

// The inventory's potion-tiers in display order, with counts: [{ key, count }].
export function potionStacks(run) {
  return Object.keys(run.potions).filter((k) => run.potions[k] > 0).sort(potionOrder).map((key) => ({ key, count: run.potions[key] }));
}

// How many potions the run owns in all (inventory and belt).
export function potionTotal(run) {
  return Object.values(run.potions).reduce((a, b) => a + b, 0) + run.belt.filter(Boolean).length;
}

// Debug (Shift+F): one of each Faint potion.
export function addFaintPotions(run) {
  for (const id of C.POTION_IDS) addPotion(run, C.potionKey(id, 'faint'));
}
