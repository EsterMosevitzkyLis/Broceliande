// The level map (M2a §4), drawn from the run's generated map (M2g): the region's own background
// (M3a §5.2: burnt country for the Cinderwood, marsh for Hag's Causeway) and title (§5.1), gently
// curved dashed roads for every `next` link, and the nodes in their state
// (available, completed, locked, bypassed), with names, the hovered node, the Druid token and,
// in debug, node IDs and links. Visual only: reads the run, never changes it.

import * as C from '../config.js';
import { createRng } from '../rng.js';
import { mapNode, nodeState, nodeRadius, regionStartNode } from '../run.js';
import { roadCurve, curvePoint, nodeDegrees, pathTotal } from '../mapGen.js';
import { drawWolfHead, drawDruid, DRUID_REST_POSE } from './entities.js';

const COLORS = {
  title: '#efe4c4',
  road: 'rgba(196, 178, 128, 0.38)',
  roadLit: 'rgba(240, 222, 168, 0.95)',
  roadBypassed: 'rgba(110, 110, 100, 0.28)',
  node: '#4a3221',
  rim: '#dcc99a',
  head: '#ece0c2',
  glow: '255, 233, 168',
  victory: '#d6302a',
  bossRim: '#8e1f1a',
  bossGlow: '200, 30, 20',
  label: '#f1e8cc',
  debug: 'rgba(120, 220, 255, 0.95)',
};

// ---------------------------------------------------------------------------
// Region backgrounds (M3a §5.2), in the region's palette (palettes row map<Region>: floor and
// floorAccent_light the ground, treeDark_canopy_0 / treeLight_0 the clusters, and the region's own
// colours). Shapes are scattered once per map with MAP_DECOR_SEED, clear of the nodes, their names
// and the clearing round the equipment; ash and mist drift with wall-clock time (visual only).
// ---------------------------------------------------------------------------
const regionKey = (id) => id[0].toUpperCase() + id.slice(1);
const mapPalette = (regionId) => C.PLACE_PALETTE[`map${regionKey(regionId)}`];

const backgroundByMap = new WeakMap();
function mapBackground(map) {
  if (backgroundByMap.has(map)) return backgroundByMap.get(map);
  const rng = createRng(C.MAP_DECOR_SEED + C.REGIONS[map.regionId].order);
  const B = C.MAP_BACKGROUNDS[map.regionId] ?? {};
  // A random spot on the ground, or null if it falls on a node, its name or the equipment clearing.
  const spot = (margin) => {
    const x = rng.range(0, C.STAGE_WIDTH);
    const y = rng.range(C.HUD_STRIP_HEIGHT, C.STAGE_HEIGHT);
    const clear = map.nodes.every((n) => Math.hypot(n.pos.x - x, n.pos.y + 20 - y) > C.MAP_NODE_RADIUS + margin);
    const e = C.EQUIP_CLEARING; // M2e (revised): a natural clearing round the equipment, its edge ragged
    const inClearing = Math.hypot((x - e.x) / e.rx, (y - e.y) / e.ry) < 1 + rng.range(-C.EQUIP_CLEARING_RAGGED, C.EQUIP_CLEARING_RAGGED);
    return clear && !inClearing ? { x, y } : null;
  };
  const many = (count, margin, make) => {
    const out = [];
    for (let i = 0; i < count * 3 && out.length < count; i++) {
      const p = spot(margin);
      if (p) out.push(make(p));
    }
    return out;
  };
  const bg = {
    clusters: many(B.clusters ?? 0, 80, (p) => ({ ...p, trunks: rng.int(1, 3), blobs: Array.from({ length: rng.int(3, 6) }, () => ({ dx: rng.range(-34, 34), dy: rng.range(-18, 18), r: rng.range(9, 20) })) })),
    embers: many(B.embers ?? 0, 70, (p) => ({ ...p, r: rng.range(5, 11), phase: rng.range(0, Math.PI * 2) })),
    ash: Array.from({ length: B.ashMotes ?? 0 }, () => ({ x: rng.range(0, C.STAGE_WIDTH), y: rng.range(0, C.STAGE_HEIGHT), r: rng.range(1.2, 2.6), phase: rng.range(0, Math.PI * 2) })),
    pools: many(B.pools ?? 0, 90, (p) => ({ ...p, rx: rng.range(40, 95), ry: rng.range(16, 34), rot: rng.range(-0.25, 0.25) })),
    reeds: many(B.reeds ?? 0, 60, (p) => ({ ...p, s: rng.range(0.7, 1.2), n: rng.int(4, 7) })),
    willows: many(B.willows ?? 0, 90, (p) => ({ ...p, s: rng.range(0.8, 1.3), lean: rng.range(-0.25, 0.25) })),
    stones: many(B.stones ?? 0, 70, (p) => ({ ...p, rot: rng.range(-0.5, 0.5), n: rng.int(2, 4) })),
    mist: Array.from({ length: B.mist ?? 0 }, () => ({ x: rng.range(0, C.STAGE_WIDTH), y: rng.range(C.HUD_STRIP_HEIGHT + 60, C.STAGE_HEIGHT), rx: rng.range(160, 300), ry: rng.range(30, 60), phase: rng.range(0, Math.PI * 2) })),
  };
  backgroundByMap.set(map, bg);
  return bg;
}

function drawMapBackground(ctx, map, t) {
  const P = mapPalette(map.regionId);
  const bg = mapBackground(map);
  const mx = C.STAGE_WIDTH / 2; // the ground runs across the whole screen (M2e, revised)
  const g = ctx.createRadialGradient(mx, C.STAGE_HEIGHT * 0.6, 100, mx, C.STAGE_HEIGHT * 0.6, C.STAGE_WIDTH * 0.6);
  g.addColorStop(0, P.floorAccent.light);
  g.addColorStop(1, P.floor);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, C.STAGE_WIDTH, C.STAGE_HEIGHT);
  ctx.save();
  // The Hag's Causeway marsh: still black pools with a faint sheen, broken causeway stones.
  for (const pl of bg.pools) {
    ctx.fillStyle = P.water.rim;
    ctx.beginPath();
    ctx.ellipse(pl.x, pl.y, pl.rx + 6, pl.ry + 4, pl.rot, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.water.deep;
    ctx.beginPath();
    ctx.ellipse(pl.x, pl.y, pl.rx, pl.ry, pl.rot, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = P.water.ripple;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(pl.x - pl.rx * 0.2, pl.y - pl.ry * 0.25, pl.rx * 0.45, pl.ry * 0.3, pl.rot, Math.PI * 1.1, Math.PI * 1.8);
    ctx.stroke();
  }
  for (const st of bg.stones) {
    for (let i = 0; i < st.n; i++) {
      ctx.save();
      ctx.translate(st.x + i * 22 * Math.cos(st.rot), st.y + i * 22 * Math.sin(st.rot));
      ctx.rotate(st.rot + (i % 2 ? 0.15 : -0.1));
      ctx.fillStyle = P.rock.dark;
      ctx.fillRect(-10, -6, 20, 12);
      ctx.fillStyle = P.rock.base;
      ctx.fillRect(-9, -6, 18, 5);
      ctx.restore();
    }
  }
  // The Cinderwood: charred tree clusters, dark trunks under sparse dull foliage.
  for (const c of bg.clusters) {
    ctx.strokeStyle = P.treeDark.trunk;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (let i = 0; i < c.trunks; i++) {
      const x = c.x + (i - (c.trunks - 1) / 2) * 16;
      ctx.beginPath();
      ctx.moveTo(x, c.y + 18);
      ctx.lineTo(x + 3, c.y - 22);
      ctx.stroke();
    }
    for (const [fill, k] of [[P.treeDark.canopy[0], 1], [P.treeLight[0], 0.45]]) {
      ctx.fillStyle = fill;
      for (const b of c.blobs) {
        ctx.beginPath();
        ctx.arc(c.x + b.dx - (1 - k) * 4, c.y + b.dy - 14 - (1 - k) * 6, b.r * k, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  for (const e of bg.embers) {
    const flicker = 0.55 + 0.45 * Math.sin(t * 2.3 + e.phase) * Math.sin(t * 0.9 + e.phase * 2);
    const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 3);
    glow.addColorStop(0, P.ember);
    glow.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.globalAlpha = Math.max(0.15, flicker);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Hag's Causeway: reed clumps and dead, drooping willows.
  for (const r of bg.reeds) {
    ctx.lineCap = 'round';
    for (let i = 0; i < r.n; i++) {
      const dx = (i - r.n / 2) * 4 * r.s;
      const h = (16 + ((i * 7) % 10)) * r.s;
      ctx.strokeStyle = i % 2 ? P.vegetation.light : P.vegetation.base;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(r.x + dx, r.y);
      ctx.lineTo(r.x + dx + (i - r.n / 2) * 1.5, r.y - h);
      ctx.stroke();
    }
  }
  for (const w of bg.willows) {
    const top = { x: w.x + w.lean * 30 * w.s, y: w.y - 46 * w.s };
    ctx.strokeStyle = P.treeDark.trunk;
    ctx.lineCap = 'round';
    ctx.lineWidth = 6 * w.s;
    ctx.beginPath();
    ctx.moveTo(w.x, w.y);
    ctx.quadraticCurveTo(w.x - w.lean * 20, w.y - 26 * w.s, top.x, top.y);
    ctx.stroke();
    ctx.strokeStyle = P.treeLight[0];
    ctx.lineWidth = 1.6;
    for (let i = -3; i <= 3; i++) {
      const sx = top.x + i * 6 * w.s;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.quadraticCurveTo(sx + i * 4 * w.s, top.y - 6 * w.s, sx + i * 5 * w.s, top.y + (26 + Math.abs(i) * -2) * w.s);
      ctx.stroke();
    }
  }
  // Drifting: ash motes falling over the Cinderwood, mist wisps over the marsh.
  if (bg.ash.length) {
    ctx.fillStyle = P.ash;
    const D = C.MAP_ASH_DRIFT;
    for (const a of bg.ash) {
      const y = C.HUD_STRIP_HEIGHT + ((a.y + t * D.speed) % (C.STAGE_HEIGHT - C.HUD_STRIP_HEIGHT));
      const x = a.x + Math.sin(t * 0.6 + a.phase) * D.sway;
      ctx.beginPath();
      ctx.arc(x, y, a.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const M = C.MAP_MIST_DRIFT;
  for (const m of bg.mist) {
    const span = C.STAGE_WIDTH + m.rx * 2;
    const x = ((m.x + t * M.speed) % span) - m.rx;
    const y = m.y + Math.sin(t * 0.3 + m.phase) * M.wobble;
    const g2 = ctx.createRadialGradient(x, y, 0, x, y, m.rx);
    g2.addColorStop(0, P.mist);
    g2.addColorStop(1, 'rgba(190, 215, 210, 0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, m.ry / m.rx);
    ctx.translate(-x, -y);
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(x, y, m.rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// M3a §5.1: the region's name over the map area, in large storybook type.
function drawRegionTitle(ctx, regionId) {
  const T = C.MAP_TITLE;
  ctx.save();
  ctx.font = `${T.fontPx}px Georgia, serif`;
  ctx.letterSpacing = `${T.letterSpacing}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = COLORS.title;
  ctx.fillText(C.REGIONS[regionId].name.toUpperCase(), (C.EQUIP_PANEL_WIDTH + C.STAGE_WIDTH) / 2, C.HUD_STRIP_HEIGHT + T.y);
  ctx.restore();
}

// A road from node a up to node b (M2g §2.4): its quadratic curve, bowing `bend` px sideways,
// starting and ending just outside the two circles.
function roadPoints(a, b, bend) {
  const curve = roadCurve(a, b, bend);
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const p = curvePoint(curve, i / 40);
    if (Math.hypot(p.x - a.pos.x, p.y - a.pos.y) > nodeRadius(a) + 10 && Math.hypot(p.x - b.pos.x, p.y - b.pos.y) > nodeRadius(b) + 10) pts.push(p);
  }
  return pts;
}

// Road style (§4.3): lit from a won node to its available children; greyed to a bypassed node;
// faint otherwise.
function roadStyle(run, from, to) {
  const toState = nodeState(run, to.id);
  if (toState === 'bypassed') return { color: COLORS.roadBypassed, width: 4 };
  if (nodeState(run, from.id) === 'completed' && toState !== 'locked') return { color: COLORS.roadLit, width: 6 };
  return { color: COLORS.road, width: 4 };
}

// Icon draw functions named by NODE_TYPES (M2c §1.1).
const NODE_ICONS = { wolfHead: drawWolfHead, lantern: drawLanternIcon, anvil: drawAnvilIcon };

const STATE_ALPHA = { available: 1, completed: 1, locked: 0.5, bypassed: 0.3 };

function drawNode(ctx, node, state, hovered, t) {
  const type = C.NODE_TYPES[node.type];
  const r = nodeRadius(node) * (hovered ? C.MAP_HOVER_SCALE : 1);
  const { x, y } = node.pos;
  ctx.save();
  ctx.globalAlpha = STATE_ALPHA[state];
  if (state === 'available') {
    const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * C.MAP_PULSE_HZ);
    const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r + 22);
    g.addColorStop(0, `rgba(${COLORS.glow}, ${0.35 + 0.35 * pulse})`);
    g.addColorStop(1, `rgba(${COLORS.glow}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r + 22, 0, Math.PI * 2);
    ctx.fill();
  }
  if (type.large) drawBossPulse(ctx, x, y, r, t); // M2f §2: a slow, faint red pulse round the Boss
  ctx.fillStyle = type.fill ?? COLORS.node;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = type.rim ?? (type.large ? COLORS.bossRim : COLORS.rim);
  ctx.lineWidth = type.large ? 6 : 4;
  ctx.stroke();
  // Icon per node type (M2c §1.1): the wolf's head, with red eyes for Fell Wilds and the Boss.
  NODE_ICONS[type.icon](ctx, x, y + r * 0.04, r * 0.62, COLORS.head, type.fill ?? COLORS.node, { redEyes: type.redEyes });
  if (state === 'completed' && type.completedMark === 'coin') {
    drawCoinMark(ctx, x + r * 0.55, y + r * 0.5, r * 0.42); // M2n §2.2: a visited Trader
  } else if (state === 'completed' && type.completedMark === 'hammer') {
    drawHammerMark(ctx, x + r * 0.55, y + r * 0.5, r * 0.5); // M2p §4.1: a visited Tinker's Rest
  } else if (state === 'completed') {
    // A bold red V over the circle.
    ctx.strokeStyle = COLORS.victory;
    ctx.lineWidth = r * 0.23; // scales with the node (M2e §4.6)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.62, y - r * 0.5);
    ctx.lineTo(x - r * 0.05, y + r * 0.62);
    ctx.lineTo(x + r * 0.7, y - r * 0.78);
    ctx.stroke();
  }
  ctx.font = `italic ${C.MAP_LABEL_FONT_PX}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = COLORS.label;
  const lines = labelLines(ctx, node.name);
  const lineY = (i) => y + nodeRadius(node) + 8 + i * (C.MAP_LABEL_FONT_PX + 2);
  // A soft dark pill behind each line, so roads pass behind the name and it stays readable.
  const pill = C.MAP_LABEL_PILL;
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.fillStyle = pill.color;
  lines.forEach((line, i) => {
    const w = ctx.measureText(line).width + pill.padX * 2;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, lineY(i) - pill.padY, w, C.MAP_LABEL_FONT_PX + pill.padY * 2 + 1, pill.radius);
    ctx.fill();
  });
  ctx.restore();
  lines.forEach((line, i) => ctx.fillText(line, x, lineY(i)));
  ctx.restore();
}

// The Trader node's icon (M2n §2.2): a lantern silhouette with a warm glowing pane. Same
// signature as the other node icons; size: about its half-height.
function drawLanternIcon(ctx, x, y, size, color, cutColor) {
  const s = size;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.12;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.78, s * 0.2, Math.PI, 0); // the ring on top
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.42, y - s * 0.5);       // the cap
  ctx.lineTo(x + s * 0.42, y - s * 0.5);
  ctx.lineTo(x + s * 0.22, y - s * 0.72);
  ctx.lineTo(x - s * 0.22, y - s * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - s * 0.5, y + s * 0.5, s, s * 0.16); // the base
  ctx.fillStyle = '#ffd77a';                   // the glowing pane
  ctx.shadowColor = 'rgba(255, 200, 90, 0.9)';
  ctx.shadowBlur = s * 0.5;
  ctx.fillRect(x - s * 0.34, y - s * 0.5, s * 0.68, s);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = cutColor;                  // the frame bars
  ctx.lineWidth = s * 0.08;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.5);
  ctx.lineTo(x, y + s * 0.5);
  ctx.stroke();
  ctx.restore();
}

// The Tinker's Rest node's icon (M2p §4.1): an anvil silhouette over a faint forge glow. Same
// signature as the other node icons; size: about its half-height.
function drawAnvilIcon(ctx, x, y, size, color) {
  const s = size;
  ctx.save();
  const g = ctx.createRadialGradient(x, y + s * 0.2, 0, x, y + s * 0.2, s * 1.1);
  g.addColorStop(0, 'rgba(255, 150, 70, 0.45)');
  g.addColorStop(1, 'rgba(255, 150, 70, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y + s * 0.2, s * 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.95, y - s * 0.42);            // the horn's tip
  ctx.quadraticCurveTo(x - s * 0.6, y - s * 0.12, x - s * 0.35, y - s * 0.1);
  ctx.lineTo(x - s * 0.2, y + s * 0.1);              // the waist
  ctx.lineTo(x - s * 0.22, y + s * 0.38);
  ctx.lineTo(x - s * 0.6, y + s * 0.62);             // the foot
  ctx.lineTo(x + s * 0.6, y + s * 0.62);
  ctx.lineTo(x + s * 0.22, y + s * 0.38);
  ctx.lineTo(x + s * 0.2, y + s * 0.1);
  ctx.lineTo(x + s * 0.7, y - s * 0.1);              // the heel
  ctx.lineTo(x + s * 0.7, y - s * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// A visited Tinker's Rest's mark (M2p §4.1), in place of the red V: a small hammer.
function drawHammerMark(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.6);
  ctx.fillStyle = '#8a5a30';                         // the handle
  ctx.fillRect(-size * 0.09, -size * 0.3, size * 0.18, size * 1.05);
  ctx.fillStyle = '#c8cdd2';                         // the head
  ctx.strokeStyle = '#4a4e52';
  ctx.lineWidth = size * 0.08;
  ctx.beginPath();
  ctx.rect(-size * 0.5, -size * 0.6, size, size * 0.34);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// A visited Trader's mark (M2n §2.2), in place of the red V: a small gold coin.
function drawCoinMark(ctx, x, y, r) {
  ctx.save();
  ctx.fillStyle = '#e8b830';
  ctx.strokeStyle = '#8a6414';
  ctx.lineWidth = r * 0.18;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#fff0b0';
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.6, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
  ctx.restore();
}

// The Boss node's slow, faint red pulse (M2f §2), in every state.
function drawBossPulse(ctx, x, y, r, t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * C.MAP_BOSS_PULSE_HZ);
  const g = ctx.createRadialGradient(x, y, r * 0.9, x, y, r + 30);
  g.addColorStop(0, `rgba(${COLORS.bossGlow}, ${0.18 + 0.22 * pulse})`);
  g.addColorStop(1, `rgba(${COLORS.bossGlow}, 0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r + 30, 0, Math.PI * 2);
  ctx.fill();
}

// A node name in one line, or two if wider than MAP_LABEL_MAX_WIDTH (split at the space nearest
// the middle; M2e §4.6). ctx must have the label font set.
function labelLines(ctx, name) {
  if (ctx.measureText(name).width <= C.MAP_LABEL_MAX_WIDTH || !name.includes(' ')) return [name];
  const spaces = [...name.matchAll(/ /g)].map((m) => m.index);
  const cut = spaces.reduce((a, b) => (Math.abs(b - name.length / 2) < Math.abs(a - name.length / 2) ? b : a));
  return [name.slice(0, cut), name.slice(cut + 1)];
}

// The Druid token (§4.3 SHOULD): beside the node he last won, or beside the start node (M2e:
// the smaller map leaves no room below it).
function drawDruidToken(ctx, run) {
  const won = run.completedNodeIds;
  const node = mapNode(run, won.length ? won[won.length - 1] : regionStartNode(run.regionId));
  const at = won.length
    ? { x: node.pos.x + nodeRadius(node) + 34, y: node.pos.y + 6 }    // beside it
    : { x: node.pos.x - C.MAP_NODE_RADIUS - 34, y: node.pos.y + 6 };   // beside the start node, on its left
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(0.6, 0.6);
  drawDruid(ctx, 0, 0, false, 0, DRUID_REST_POSE);
  ctx.restore();
}

// hoverId: the available node under the pointer, or null. t: s (real time) for the pulse.
export function drawMap(ctx, run, hoverId, t, debug) {
  const map = run.map;
  drawMapBackground(ctx, map, t);
  drawRegionTitle(ctx, map.regionId);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.setLineDash([16, 12]);
  for (const road of map.roads) {
    const node = mapNode(run, road.from);
    const next = mapNode(run, road.to);
    const style = roadStyle(run, node, next);
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.beginPath();
    roadPoints(node, next, road.bend ?? 0).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.restore();

  for (const node of map.nodes) drawNode(ctx, node, nodeState(run, node.id), node.id === hoverId, t);
  drawDruidToken(ctx, run);

  if (debug) {
    ctx.save();
    ctx.font = '15px monospace';
    ctx.fillStyle = COLORS.debug;
    ctx.textBaseline = 'top';
    // M2g §4: each node's in / out degree, the attempts used and the check that failed most.
    const deg = nodeDegrees(map);
    const counts = Object.entries(map.failCounts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    const head = [
      `Map: ${map.attempts}/${C.MAP_MAX_ATTEMPTS} attempts  paths ${pathTotal(map)}${map.failed.length ? `  FAILS: ${map.failed.join(', ')}` : ''}${C.MAP_RANDOMISE ? '' : `  FIXED (seed ${C.MAP_FIXED_SEED})`}  (L = new map)`,
      `Failed most: ${counts.length ? counts.map(([c, n]) => `${c} ${n}`).join(', ') : 'none'}`,
      `Traders in rows: ${map.traderRows.map((i) => map.rows[i][0].row).join(', ') || 'none'}   Tinker's Rests in rows: ${map.tinkerRows.map((i) => map.rows[i][0].row).join(', ') || 'none'}${map.movedExtra ? ' (one moved: its first row never passed)' : ''}`,
    ];
    head.forEach((line, i) => ctx.fillText(line, C.EQUIP_PANEL_WIDTH + 24, C.HUD_STRIP_HEIGHT + 16 + i * 20));
    map.nodes.forEach((n, i) => {
      ctx.fillText(`${n.id} (${n.levelId ?? n.type}) → [${n.next.join(', ')}]  ${nodeState(run, n.id)}`, C.EQUIP_PANEL_WIDTH + 24, C.HUD_STRIP_HEIGHT + 80 + i * 20);
      ctx.fillText(`${n.id}  in ${deg[n.id].in} / out ${deg[n.id].out}`, n.pos.x - C.MAP_NODE_RADIUS, n.pos.y - C.MAP_NODE_RADIUS - 22);
    });
    ctx.restore();
  }
}
