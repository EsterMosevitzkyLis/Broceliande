// Map editor start-up (M4a §5): load the data tabs and every level's map file as the game does
// (js/boot.js), apply them to config.js, and only then load the editor itself (app.js and the game
// modules it imports, which read config values as they load). Levels without a map file are left
// out of the applied data and marked in the level picker.

import * as C from '../js/config.js';
import { loadTables } from '../js/data/loader.js';
import { validateTables } from '../js/data/validate.js';
import { loadMaps } from '../js/mapFile.js';

const loading = document.getElementById('ed-loading');

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
  if (problems.errors.length === missing.length) validateTables({ ...tables, levels: tables.levels.filter((r) => maps[r.id]) }, problems, maps);
  const dataProblems = problems.errors.filter((p) => !(p.tab === 'maps' && missing.some((id) => p.column === `${id}.json`)));
  C.applyData({ ...tables, levels: tables.levels.filter((r) => maps[r.id]) }, maps, backgrounds);
  const { startEditor } = await import('./app.js');
  await startEditor({ levelRows: tables.levels, maps, backgrounds, missing, dataProblems });
  loading.hidden = true;
} catch (err) {
  console.error(err);
  fail(`The editor could not start: ${err.message}`);
}
