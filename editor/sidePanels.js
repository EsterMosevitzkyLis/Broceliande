// The right panel's editing sections (M4b): the selected spot (coordinates, pinned role, jitter,
// zone, the lanes it covers), typed coordinates for the Druid, a waypoint or a decoration object,
// the Zone rules and Level rules sections, and the read-only Level data section. Every change goes
// through api.begin() / api.changed() / api.end(), so it is one undo step.
//
// The new map-file fields are written only when set (a spot's pin and jitter, the level's rules), so
// a file that doesn't use them is unchanged; a spot's keys keep the order x, y, zone, zoneAuto, pin,
// jitter, hide (M6c §1.1).

import * as C from '../js/config.js';
import { geometricZone, zoneIds, zoneQuota, zoneCandidates, isNearZone } from '../js/zones.js';
import { spotPin, featureMix, levelWaves, waveTotals, laneMinTurretSlots, routeFactors } from '../js/levelSettings.js';
import { TOTAL_LETTERS } from '../js/scene.js';
import { refPos, setRefPos, movedRefs } from './geometry.js';

const JITTER_MAX = 40; // px, the jitter slider's top (§2)
const SPOT_KEYS = ['x', 'y', 'zone', 'zoneAuto', 'pin', 'jitter', 'hide'];
const RULES = [
  ['laneMinTurretSlots', 'Turret slots covering each lane', () => C.LANE_MIN_TURRET_SLOTS, 1],
  ['routeMinFactor', 'Prep route band, lower edge (× stepBudget)', () => C.FEATURE_ROUTE_MIN_FACTOR, 0.05],
  ['routeMaxFactor', 'Prep route band, upper edge (× stepBudget)', () => C.FEATURE_ROUTE_MAX_FACTOR, 0.05],
];

const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

// A number field: blank shows the default in grey (placeholder); onSet(value or undefined).
function numberField(value, placeholder, step, onSet, width = 64) {
  const input = el('input', { type: 'number', step, value: value ?? '', placeholder: String(placeholder) });
  input.style.width = `${width}px`;
  input.addEventListener('change', () => onSet(input.value === '' ? undefined : Number(input.value)));
  return input;
}

export function createSidePanels(api) {
  const { ed } = api;
  const edit = (fn) => {
    api.begin();
    fn();
    api.changed(false);
    api.end();
  };

  // A spot rebuilt with its keys in order; undefined removes a key.
  function setSpot(index, changes) {
    const merged = { ...ed.map.candidates[index], ...changes };
    const out = {};
    for (const k of SPOT_KEYS) if (merged[k] !== undefined) out[k] = merged[k];
    for (const [k, v] of Object.entries(merged)) if (!SPOT_KEYS.includes(k) && v !== undefined) out[k] = v;
    ed.map.candidates[index] = out;
  }

  // ---- Coordinates (spot, Druid, waypoint, decoration) -------------------------------------
  function coordinates(ref) {
    const p = refPos(ed.map, ref);
    const set = (axis, v) => {
      if (!Number.isFinite(v)) return;
      edit(() => {
        // The Druid moves the lane ends with him, as when dragged.
        const d = { x: axis === 'x' ? v - p.x : 0, y: axis === 'y' ? v - p.y : 0 };
        for (const r of movedRefs(ed.map, [ref])) {
          const q = refPos(ed.map, r);
          setRefPos(ed.map, r, q.x + d.x, q.y + d.y);
        }
      });
    };
    return el('div', { className: 'ed-mix-row' },
      'x', numberField(p.x, '', 1, (v) => set('x', v), 80),
      'y', numberField(p.y, '', 1, (v) => set('y', v), 80));
  }

  // ---- A single selected spot ---------------------------------------------------------------
  function spot(index) {
    const c = ed.map.candidates[index];
    const sc = ed.scene.candidates[index];
    const level = ed.scene.level;
    const out = [coordinates({ kind: 'candidate', index })];

    // Role (§1.4): the six pins, with one feature:<type> per feature type.
    const role = el('select', {},
      el('option', { value: 'auto', textContent: 'auto (rolled each run)' }),
      el('option', { value: 'turret', textContent: 'turret slot' }),
      el('option', { value: 'feature', textContent: 'resource spot (type rolled)' }),
      ...Object.entries(C.FEATURE_TYPES).map(([id, t]) => el('option', { value: `feature:${id}`, textContent: `resource spot: ${t.name}` })),
      el('option', { value: 'notVacant', textContent: 'not vacant (turret or resource, rolled)' }),
      el('option', { value: 'vacant', textContent: 'vacant (always empty)' }));
    role.value = c.pin ?? 'auto';
    role.addEventListener('change', () => edit(() => setSpot(index, { pin: role.value === 'auto' ? undefined : role.value })));
    out.push(el('label', { className: 'ed-mix-row' }, 'Role', role));

    // Hidden (M6c §1.1): under ferns in a hiddenSpots region: rolled, always or never.
    const hide = el('select', {},
      el('option', { value: 'auto', textContent: 'auto (rolled each run)' }),
      el('option', { value: 'always', textContent: 'always (under ferns)' }),
      el('option', { value: 'never', textContent: 'never' }));
    hide.value = c.hide ?? 'auto';
    hide.addEventListener('change', () => edit(() => setSpot(index, { hide: hide.value === 'auto' ? undefined : hide.value })));
    out.push(el('label', { className: 'ed-mix-row' }, 'Hidden', hide));

    // Jitter (§2): its own, or the default.
    const value = el('span', { className: 'ed-slider-value', textContent: `${sc.jitter} px${c.jitter === undefined ? ' (default)' : ''}` });
    const slider = el('input', { type: 'range', min: 0, max: JITTER_MAX, step: 1, value: sc.jitter });
    slider.addEventListener('input', () => {
      api.begin();
      setSpot(index, { jitter: Number(slider.value) });
      value.textContent = `${slider.value} px`;
      api.changed(true);
    });
    slider.addEventListener('change', () => api.end());
    const reset = el('button', { type: 'button', textContent: 'default', title: `LOCATION_JITTER, ${C.LOCATION_JITTER} px` });
    reset.disabled = c.jitter === undefined;
    reset.addEventListener('click', () => edit(() => setSpot(index, { jitter: undefined })));
    out.push(el('label', { className: 'ed-slider' }, 'Jitter', slider, value, reset));

    // Zone: auto, or a manual one.
    const geo = geometricZone(level, c);
    const zone = el('select', {},
      el('option', { value: 'auto', textContent: `auto (${geo})` }),
      ...zoneIds(level).map((z) => el('option', { value: z, textContent: `${z} (manual)` })));
    zone.value = c.zoneAuto ? 'auto' : c.zone;
    zone.addEventListener('change', () => edit(() => setSpot(index, zone.value === 'auto' ? { zone: geo, zoneAuto: true } : { zone: zone.value, zoneAuto: false })));
    out.push(el('label', { className: 'ed-mix-row' }, 'Zone', zone));

    // Coverage (§4).
    out.push(el('div', { textContent: `Covers: ${sc.lanes.join(', ') || 'no lane'}` }));
    return out;
  }

  // The selection's editing controls: a spot's, or the coordinates of the Druid, a waypoint or a
  // decoration object with a position.
  function selection() {
    const sel = ed.selection;
    if (sel.length !== 1) return [];
    const ref = sel[0];
    if (ref.kind === 'candidate' && ed.map.candidates[ref.index]) return spot(ref.index);
    if (['druid', 'waypoint', 'decor'].includes(ref.kind) && refPos(ed.map, ref)) return [coordinates(ref)];
    return [];
  }

  // ---- Zone rules (§3.1) --------------------------------------------------------------------
  function setQuota(zone, kind, value) {
    const all = { ...ed.map.zoneQuotaOverrides };
    const entry = { ...(all[zone] ?? {}), [kind]: value };
    const ordered = {};
    for (const k of ['turret', 'feature']) if (entry[k] !== undefined) ordered[k] = entry[k];
    if (Object.keys(ordered).length) all[zone] = ordered;
    else delete all[zone];
    ed.map.zoneQuotaOverrides = all;
  }

  function zoneRules() {
    const level = ed.scene.level;
    const rows = zoneIds(level).map((zone) => {
      const base = level.zoneQuotas[isNearZone(zone) ? 'near' : 'far'];
      const over = ed.map.zoneQuotaOverrides[zone] ?? {};
      const spots = zoneCandidates(level, zone);
      const pins = spots.map((i) => spotPin(level.candidateLocations[i]).role).filter((r) => r !== 'auto');
      const pinText = ['turret', 'feature', 'notVacant', 'vacant'].map((r) => [r, pins.filter((x) => x === r).length]).filter(([, n]) => n)
        .map(([r, n]) => `${n}${{ turret: 'T', feature: 'R', notVacant: '≠∅', vacant: '∅' }[r]}`).join(' ');
      const reset = el('button', { type: 'button', textContent: '↺', title: 'Back to the default quotas' });
      reset.disabled = !ed.map.zoneQuotaOverrides[zone];
      reset.addEventListener('click', () => edit(() => { setQuota(zone, 'turret', undefined); setQuota(zone, 'feature', undefined); }));
      return el('tr', {},
        el('td', { textContent: zone }),
        el('td', { textContent: String(spots.length) }),
        el('td', { textContent: pinText || '–' }),
        el('td', {}, numberField(over.turret, base.turret, 1, (v) => edit(() => setQuota(zone, 'turret', v)), 48)),
        el('td', {}, numberField(over.feature, base.feature, 1, (v) => edit(() => setQuota(zone, 'feature', v)), 48)),
        el('td', {}, reset));
    });
    const totals = zoneIds(level).reduce((t, z) => {
      const q = zoneQuota(level, z);
      return { turret: t.turret + q.turret, feature: t.feature + q.feature };
    }, { turret: 0, feature: 0 });
    const mixTotal = Object.values(featureMix(level)).reduce((a, b) => a + b, 0);
    const table = el('table', { className: 'ed-table' },
      el('tr', {}, ...['zone', 'spots', 'pinned', 'turret', 'feature', ''].map((h) => el('th', { textContent: h }))), ...rows);
    const total = el('div', { textContent: `Totals: ${totals.turret} turret slots, ${totals.feature} resource spots (feature mix: ${mixTotal})` });
    const out = [table, total];
    if (totals.feature !== mixTotal) out.push(el('div', { className: 'ed-warning', textContent: `Resource spots (${totals.feature}) don't match the feature mix (${mixTotal}).` }));
    out.push(el('div', { className: 'ed-note', textContent: 'Grey: the global default. Typing a number overrides it for this level (the map file\'s zoneQuotaOverrides); ↺ removes the override.' }));
    return out;
  }

  // ---- Level rules (§3.2) -------------------------------------------------------------------
  function setRule(key, value) {
    const rules = { ...(ed.map.rules ?? {}), [key]: value };
    const ordered = {};
    for (const [k] of RULES) if (rules[k] !== undefined) ordered[k] = rules[k];
    // The map rebuilt with `rules` after zoneQuotaOverrides (left out when empty).
    const map = {};
    for (const [k, v] of Object.entries(ed.map)) {
      if (k === 'rules') continue;
      map[k] = v;
      if (k === 'zoneQuotaOverrides' && Object.keys(ordered).length) map.rules = ordered;
    }
    ed.map = map;
  }

  function levelRules() {
    const rules = ed.map.rules ?? {};
    return RULES.map(([key, label, fallback, step]) => {
      const reset = el('button', { type: 'button', textContent: '↺', title: 'Back to the global default' });
      reset.disabled = rules[key] === undefined;
      reset.addEventListener('click', () => edit(() => setRule(key, undefined)));
      return el('div', { className: 'ed-mix-row' }, el('span', { className: 'ed-rule-label', textContent: label }),
        numberField(rules[key], fallback(), step, (v) => edit(() => setRule(key, v)), 64), reset);
    });
  }

  // ---- Level data (§5), read-only -------------------------------------------------------------
  function levelData() {
    const level = ed.scene.level;
    const letters = Object.fromEntries(TOTAL_LETTERS);
    const pinned = {};
    for (const c of level.candidateLocations) {
      const t = spotPin(c).featureType;
      if (t) pinned[t] = (pinned[t] ?? 0) + 1;
    }
    const waves = levelWaves(level).map((w, i) => {
      const totals = Object.entries(waveTotals(w)).map(([type, n]) => `${n}${letters[type] ?? ` ${C.ENEMY_TYPES[type]?.name ?? type}`}`).join(' ');
      return `W${i + 1}: ${totals}${w.gapAfter !== undefined && i < levelWaves(level).length - 1 ? ` (gap ${w.gapAfter})` : ''}${w.tolls ? ` (tolls ${w.tolls})` : ''}`;
    });
    const mix = Object.entries(featureMix(level)).filter(([, n]) => n)
      .map(([t, n]) => `${C.FEATURE_TYPES[t]?.name ?? t} ${n}${pinned[t] ? ` (${pinned[t]} pinned)` : ''}`).join(', ');
    const f = routeFactors(level);
    const lines = [
      `${level.name}: ${C.REGIONS[level.region]?.name ?? level.region}, row ${level.row}, ${level.nodeType}`,
      `enemyHpMult ${level.enemyHpMult ?? '1 (default)'}, stuckTime ${level.stuckTime ?? `${C.STUCK_TIME} (default)`}`,
      `stepBudget ${level.stepBudget}${ed.prep.suggested ? ` (suggested ${ed.prep.suggested})` : ''}; route band ${f.min}–${f.max} ×; lanes need ${laneMinTurretSlots(level)} turret slots`,
      `Feature mix: ${mix || 'none'}`,
      ...waves,
    ];
    return [
      ...lines.map((t) => el('div', { textContent: t })),
      el('div', { className: 'ed-note', textContent: 'Read-only: these numbers are edited in the Google Sheet (levels, waves and spawns tabs).' }),
    ];
  }

  return { selection, zoneRules, levelRules, levelData };
}
