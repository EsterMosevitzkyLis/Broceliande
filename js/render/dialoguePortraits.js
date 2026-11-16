// Dialogue portraits (M5a §3.4), drawn into a w × h frame (DIALOGUE_PORTRAIT_W × _H) with the
// figure standing on its bottom edge. A character's image, when the characters tab names one that
// loaded, is fitted to the frame keeping its proportions, anchored at the bottom. Otherwise a drawn
// placeholder: the Druid (a large bust of his hooded drawing), Diaena, or a plain silhouette with
// the character's name. Visual only.

import { CHARACTERS } from '../narrative.js';

// The Druid's colours (render/entities.js, render/equipment.js).
const DRUID = {
  robe: '#3d6b4a', robeDark: '#2b4f36', robeLight: '#4f8560', hood: '#4c7f58', hoodRim: '#5c9268',
  hoodShadow: 'rgba(16, 26, 18, 0.93)', skin: '#d9b48f', skinShade: '#c39a74',
  beard: '#e8e4d8', beardShade: '#c9c4b6', staff: '#7a5530', staffDark: '#5a3d22', gem: '#9fe8a8',
};

// Diaena: long auburn hair, a hooded green-grey cloak, in the game's muted palette.
const DIAENA = {
  cloak: '#5f6f5c', cloakDark: '#465442', cloakLight: '#73846f', hair: '#8a3a1d', hairLight: '#ad5329', hairDark: '#62260f',
  skin: '#e4c19e', skinShade: '#cfa682', blush: 'rgba(214, 120, 100, 0.18)', eye: '#3f5a3a', lid: '#4a2a1a',
  lips: '#b0675a', clasp: '#c8a45a',
};

const SILHOUETTE = { body: '#596059', edge: '#6c746c', text: '#d8dcd2' };

export function drawDialoguePortrait(ctx, characterId, w, h) {
  ctx.clearRect(0, 0, w, h);
  const character = CHARACTERS[characterId];
  if (character?.image) drawImageFitted(ctx, character.image, w, h);
  else if (characterId === 'druid') drawDruidBust(ctx, w, h);
  else if (characterId === 'diaena') drawDiaenaBust(ctx, w, h);
  else drawSilhouette(ctx, w, h, character?.name ?? characterId);
}

function drawImageFitted(ctx, img, w, h) {
  const s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  ctx.drawImage(img, (w - dw) / 2, h - dh, dw, dh);
}

function ellipse(ctx, x, y, rx, ry, color, rot = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

// Shoulders and chest: a wide rounded shape from the bottom edge up to the neck.
function shoulders(ctx, cx, h, halfTop, top, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - 175, h);
  ctx.bezierCurveTo(cx - 172, top + 60, cx - halfTop - 40, top, cx - halfTop, top);
  ctx.lineTo(cx + halfTop, top);
  ctx.bezierCurveTo(cx + halfTop + 40, top, cx + 172, top + 60, cx + 175, h);
  ctx.closePath();
  ctx.fill();
}

// The Druid: hood over his eyes, white beard down his chest, staff over his shoulder.
function drawDruidBust(ctx, w, h) {
  const cx = w / 2 + 10;
  // Hood, behind the head and down onto the shoulders, with a soft point at the top.
  ctx.fillStyle = DRUID.hood;
  ctx.beginPath();
  ctx.moveTo(cx + 6, 52);
  ctx.bezierCurveTo(cx + 120, 70, cx + 136, 210, cx + 118, 330);
  ctx.lineTo(cx - 118, 330);
  ctx.bezierCurveTo(cx - 136, 200, cx - 96, 66, cx + 6, 52);
  ctx.fill();
  // Robe: shoulders and chest, a shaded fold down the middle.
  shoulders(ctx, cx, h, 70, 300, DRUID.robe);
  ctx.fillStyle = DRUID.robeDark;
  ctx.beginPath();
  ctx.moveTo(cx - 12, 340);
  ctx.lineTo(cx - 30, h);
  ctx.lineTo(cx + 30, h);
  ctx.lineTo(cx + 12, 340);
  ctx.closePath();
  ctx.fill();
  ellipse(ctx, cx - 120, 352, 50, 26, DRUID.robeLight, -0.35);
  ellipse(ctx, cx + 120, 352, 50, 26, DRUID.robeLight, 0.35);
  // Face, the upper part (his eyes) lost in the hood's shadow.
  ellipse(ctx, cx, 226, 62, 78, DRUID.skin);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, 226, 62, 78, 0, 0, Math.PI * 2);
  ctx.clip();
  ellipse(ctx, cx, 168, 90, 52, DRUID.hoodShadow);
  ctx.restore();
  ellipse(ctx, cx, 228, 9, 14, DRUID.skinShade); // nose, just below the shadow
  // Hood rim, framing the face.
  ctx.strokeStyle = DRUID.hoodRim;
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.ellipse(cx, 232, 78, 104, 0, Math.PI * 1.02, Math.PI * 1.98);
  ctx.stroke();
  // Beard: from the cheeks down over the chest, with a few strands.
  ctx.fillStyle = DRUID.beard;
  ctx.beginPath();
  ctx.moveTo(cx - 60, 236);
  ctx.bezierCurveTo(cx - 76, 320, cx - 46, 400, cx, 440);
  ctx.bezierCurveTo(cx + 46, 400, cx + 76, 320, cx + 60, 236);
  ctx.bezierCurveTo(cx + 40, 270, cx - 40, 270, cx - 60, 236);
  ctx.fill();
  ctx.strokeStyle = DRUID.beardShade;
  ctx.lineWidth = 3;
  for (const dx of [-30, -12, 8, 26]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx, 300);
    ctx.quadraticCurveTo(cx + dx * 1.1, 360, cx + dx * 0.4, 410);
    ctx.stroke();
  }
  // Moustache over a hint of a mouth.
  ellipse(ctx, cx, 268, 12, 4, DRUID.skinShade);
  ellipse(ctx, cx - 20, 258, 24, 9, DRUID.beard, 0.25);
  ellipse(ctx, cx + 20, 258, 24, 9, DRUID.beard, -0.25);
  // Staff, leaning over his right shoulder (the viewer's left), his hand round it.
  const x0 = 34, y0 = h, x1 = 120, y1 = 34;
  ctx.lineCap = 'round';
  ctx.strokeStyle = DRUID.staff;
  ctx.lineWidth = 15;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = DRUID.staffDark;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x0 + 5, y0);
  ctx.lineTo(x1 + 5, y1 + 2);
  ctx.stroke();
  ellipse(ctx, x1 + 2, y1 - 12, 13, 17, DRUID.gem, 0.19);
  ellipse(ctx, x1 - 2, y1 - 17, 4, 6, 'rgba(255, 255, 255, 0.55)', 0.19);
  ellipse(ctx, x0 + (x1 - x0) * 0.2, y0 + (y1 - y0) * 0.2, 17, 14, DRUID.skin, 0.4);
  ellipse(ctx, x0 + (x1 - x0) * 0.2 + 4, y0 + (y1 - y0) * 0.2 + 3, 9, 6, DRUID.skinShade, 0.4);
}

// Diaena: a young woman with long auburn hair under a hooded green-grey cloak; calm and alert.
function drawDiaenaBust(ctx, w, h) {
  const cx = w / 2 - 6;
  // Hood, behind the head.
  ctx.fillStyle = DIAENA.cloakDark;
  ctx.beginPath();
  ctx.moveTo(cx, 58);
  ctx.bezierCurveTo(cx + 116, 66, cx + 128, 210, cx + 112, 330);
  ctx.lineTo(cx - 112, 330);
  ctx.bezierCurveTo(cx - 128, 210, cx - 116, 66, cx, 58);
  ctx.fill();
  // Hair, falling long behind the shoulders.
  ctx.fillStyle = DIAENA.hairDark;
  ctx.beginPath();
  ctx.moveTo(cx - 70, 130);
  ctx.bezierCurveTo(cx - 112, 220, cx - 108, 340, cx - 118, 430);
  ctx.lineTo(cx + 118, 430);
  ctx.bezierCurveTo(cx + 108, 340, cx + 112, 220, cx + 70, 130);
  ctx.closePath();
  ctx.fill();
  // Cloak: shoulders and chest, with its clasp at the throat.
  shoulders(ctx, cx, h, 54, 312, DIAENA.cloak);
  ctx.fillStyle = DIAENA.cloakDark;
  ctx.beginPath();
  ctx.moveTo(cx - 8, 330);
  ctx.lineTo(cx - 40, h);
  ctx.lineTo(cx + 40, h);
  ctx.lineTo(cx + 8, 330);
  ctx.closePath();
  ctx.fill();
  ellipse(ctx, cx - 112, 362, 48, 24, DIAENA.cloakLight, -0.35);
  ellipse(ctx, cx + 112, 362, 48, 24, DIAENA.cloakLight, 0.35);
  // Neck.
  ctx.fillStyle = DIAENA.skinShade;
  ctx.fillRect(cx - 20, 250, 40, 70);
  // Long locks over the front of the shoulders.
  for (const side of [-1, 1]) {
    ctx.fillStyle = DIAENA.hair;
    ctx.beginPath();
    ctx.moveTo(cx + side * 46, 170);
    ctx.bezierCurveTo(cx + side * 80, 250, cx + side * 66, 340, cx + side * 92, 452);
    ctx.lineTo(cx + side * 124, 440);
    ctx.bezierCurveTo(cx + side * 104, 330, cx + side * 104, 220, cx + side * 68, 140);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = DIAENA.hairLight;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + side * 70, 190);
    ctx.bezierCurveTo(cx + side * 92, 260, cx + side * 84, 350, cx + side * 104, 430);
    ctx.stroke();
  }
  ellipse(ctx, cx, 322, 11, 11, DIAENA.clasp);
  ellipse(ctx, cx, 322, 5, 5, DIAENA.cloakDark);
  // Face.
  ellipse(ctx, cx, 206, 50, 64, DIAENA.skin);
  ellipse(ctx, cx - 28, 226, 13, 8, DIAENA.blush);
  ellipse(ctx, cx + 28, 226, 13, 8, DIAENA.blush);
  // Eyes, open and steady, under straight, slightly raised brows.
  for (const side of [-1, 1]) {
    const ex = cx + side * 20;
    ellipse(ctx, ex, 204, 10, 5.5, '#f2ece2');
    ellipse(ctx, ex + side * 0.5, 204, 4.8, 5, DIAENA.eye);
    ellipse(ctx, ex, 204, 2.2, 2.4, '#1c1712');
    ellipse(ctx, ex - 1.5, 202.5, 1.2, 1.2, 'rgba(255, 255, 255, 0.85)');
    ctx.strokeStyle = DIAENA.lid;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(ex, 205, 10.5, 6.5, 0, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    ctx.strokeStyle = DIAENA.hairDark;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(ex - side * 11, 191);
    ctx.quadraticCurveTo(ex, 186, ex + side * 12, 190);
    ctx.stroke();
  }
  // Nose and a calm, closed mouth.
  ctx.strokeStyle = DIAENA.skinShade;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx + 2, 210);
  ctx.quadraticCurveTo(cx + 7, 226, cx - 3, 230);
  ctx.stroke();
  ctx.strokeStyle = DIAENA.lips;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 11, 246);
  ctx.quadraticCurveTo(cx, 249, cx + 11, 246);
  ctx.stroke();
  // Hair over the brow, parted a little off-centre, framing the face.
  ctx.fillStyle = DIAENA.hair;
  ctx.beginPath();
  ctx.moveTo(cx - 54, 214);
  ctx.bezierCurveTo(cx - 60, 150, cx - 30, 130, cx + 8, 134);
  ctx.bezierCurveTo(cx - 14, 150, cx - 34, 172, cx - 44, 230);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 54, 214);
  ctx.bezierCurveTo(cx + 60, 150, cx + 34, 130, cx + 4, 134);
  ctx.bezierCurveTo(cx + 22, 152, cx + 38, 176, cx + 44, 230);
  ctx.closePath();
  ctx.fill();
  // Hood rim over the hair.
  ctx.strokeStyle = DIAENA.cloak;
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.ellipse(cx, 214, 76, 100, 0, Math.PI * 1.04, Math.PI * 1.96);
  ctx.stroke();
}

// Anyone else: a plain head-and-shoulders silhouette with the character's name across the chest.
function drawSilhouette(ctx, w, h, name) {
  const cx = w / 2;
  shoulders(ctx, cx, h, 60, 320, SILHOUETTE.body);
  ctx.fillStyle = SILHOUETTE.body;
  ctx.fillRect(cx - 26, 260, 52, 70);
  ellipse(ctx, cx, 214, 66, 82, SILHOUETTE.body);
  ctx.strokeStyle = SILHOUETTE.edge;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(cx, 214, 66, 82, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = SILHOUETTE.text;
  ctx.font = 'italic 30px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, cx, 410, w - 60);
}
