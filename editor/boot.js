// Map editor start-up (M4a §5): load the data tabs and every level's map file as the game does
// (js/boot.js), apply them to config.js, and only then load the editor itself (app.js and the game
// modules it imports, which read config values as they load). A level without a map file gets a
// blank map in memory (mapFile.js blankMap: its lanes from the lanes tab), marked in the level
// picker, to start from with Generate draft (§5.7); its file is written when it's saved.

import * as C from '../js/config.js';
import { loadTables } from '../js/data/loader.js';
import { validateTables } from '../js/data/validate.js';
import { loadMaps, blankMap, lanesFromTab } from '../js/mapFile.js';
import { parseCsv } from '../js/data/csv.js';

const NEW_LEVEL_NEAR_RADIUS = 440; // px, a new level's near radius to start from (today's levels: 400–480)

const loading = document.getElementById('ed-loading');

// The lanes reference tab (data/lanes.csv: level, laneId, name, entry), which the game never loads:
// a new level's lane ids, names and entry points. [] when it can't be read.
async function laneRows() {
  try {
    const res = await fetch('data/lanes.csv', { cache: 'no-store' });
    if (!res.ok) return [];
    const [head, ...rows] = parseCsv(await res.text());
    return rows.map((r) => Object.fromEntries(head.map((k, i) => [k.trim(), (r[i] ?? '').trim()])));
  } catch {
    return [];
  }
}

function fail(message) {
  loading.textContent = message;
  loading.classList.add('error');
}

try {
  const { tables, problems } = await loadTables((tab) => `data/${tab}.csv`);
  const levelIds = (tables.levels ?? []).map((r) => r.id).filter(Boolean);
  const { maps, backgrounds } = await loadMaps(levelIds, problems);
  // A missing map file is the one problem the editor expects; anything else is shown at the top.
  const missing = levelIds.filter((id) => !maps[id]);
  const withMaps = { ...tables, levels: tables.levels.filter((r) => maps[r.id]) };
  if (problems.errors.length === missing.length) validateTables(withMaps, problems, maps);
  const dataProblems = problems.errors.filter((p) => !(p.tab === 'maps' && missing.some((id) => p.column === `${id}.json`)));
  C.applyData(withMaps, maps, backgrounds);
  // Blank maps for the levels without a file (their palette from the first level of their region
  // that has one), then the data again with every level.
  const lanes = await laneRows();
  const blanks = {};
  for (const id of missing) {
    const row = tables.levels.find((r) => r.id === id);
    const donor = tables.levels.filter((r) => maps[r.id]).sort((a, b) => (a.region === row.region ? 0 : 1) - (b.region === row.region ? 0 : 1) || a.row - b.row)[0];
    blanks[id] = blankMap(id, lanesFromTab(id, lanes), {
      corridorWidth: C.CORRIDOR_WIDTH, meleeRadius: C.DRUID_MELEE_RADIUS, nearRadius: NEW_LEVEL_NEAR_RADIUS,
      palette: JSON.parse(JSON.stringify(maps[donor.id].palette)),
    });
  }
  if (missing.length) C.applyData(tables, { ...maps, ...blanks }, backgrounds);
  const { startEditor } = await import('./app.js');
  await startEditor({ levelRows: tables.levels, laneRows: lanes, maps: { ...maps, ...blanks }, backgrounds, missing, dataProblems });
  loading.hidden = true;
} catch (err) {
  console.error(err);
  fail(`The editor could not start: ${err.message}`);
}
