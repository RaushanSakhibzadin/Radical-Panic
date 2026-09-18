// Canvas drawing. Reads the game, writes pixels, owns no state of its own.

import { ELEMENTS } from './data.js';
import { drawFace, moodFor } from './faces.js';
import {
  CELL_H, CELL_W, COLS, FIELD_X, FIELD_Y, HOME_X, ROWS, cellY,
} from './game.js';
import { clamp } from './rng.js';

export const WIDTH = FIELD_X + COLS * CELL_W + 26;   // 950
export const HEIGHT = FIELD_Y + ROWS * CELL_H + 22;  // 596

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","EmojiOne Color",sans-serif';
const HAN_FONT = '"Noto Serif SC","Songti SC","SimSun","Source Han Serif SC","Hiragino Sans GB",serif';

export function setupCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = WIDTH * dpr;
  canvas.height = HEIGHT * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function draw(ctx, game, hover) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground(ctx, game);
  drawGrid(ctx, game, hover);
  drawHome(ctx, game);
  for (const d of game.defenders) drawDefender(ctx, game, d);
  for (const a of game.attackers) drawAttacker(ctx, game, a);
  for (const s of game.shots) drawShot(ctx, s);
  for (const p of game.puffs) drawPuff(ctx, p);
  drawTopBar(ctx, game);
  drawMessage(ctx, game);
  if (game.state === 'over') drawGameOver(ctx, game);
}

function drawBackground(ctx, game) {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#1b1230');
  sky.addColorStop(0.55, '#2a1b40');
  sky.addColorStop(1, '#3b2450');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Faint 米-grid paper, the sheet Chinese characters are practised on.
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = '#ffd6a5';
  ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 38) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
  }
  for (let y = 0; y < HEIGHT; y += 38) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
  }
  ctx.restore();
}

function drawGrid(ctx, game, hover) {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const x = FIELD_X + c * CELL_W;
      const y = FIELD_Y + r * CELL_H;
      const dark = (r + c) % 2 === 0;
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.022)';
      ctx.fillRect(x + 2, y + 2, CELL_W - 4, CELL_H - 4);
    }
  }
  if (hover && hover.valid) {
    const x = FIELD_X + hover.col * CELL_W;
    const y = FIELD_Y + hover.row * CELL_H;
    ctx.strokeStyle = hover.ok ? 'rgba(126,255,180,0.9)' : 'rgba(255,120,120,0.9)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(x + 3, y + 3, CELL_W - 6, CELL_H - 6);
    ctx.setLineDash([]);
  }
}

function drawHome(ctx, game) {
  // The bowls you are defending. 🥣 has no eyes either — it is one of us.
  ctx.save();
  ctx.font = `30px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 3; i += 1) {
    ctx.globalAlpha = i < game.lives ? 1 : 0.18;
    ctx.fillText('🥣', HOME_X - 26, FIELD_Y + 70 + i * 62);
  }
  ctx.restore();

  const grad = ctx.createLinearGradient(HOME_X - 6, 0, HOME_X + 16, 0);
  grad.addColorStop(0, 'rgba(255,120,120,0.5)');
  grad.addColorStop(1, 'rgba(255,120,120,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(HOME_X - 6, FIELD_Y, 22, ROWS * CELL_H);
}

function drawDefender(ctx, game, d) {
  const g = d.genome;
  const t = game.time;
  const size = 52 * g.scale;
  const hpFrac = clamp(d.hp / d.maxHp, 0, 1);

  // Inherited idle animation. Every term here is a gene.
  const bob = Math.sin(t * g.bobSpd * 2 + d.phase * 9) * g.bob;
  const sway = Math.sin(t * g.bobSpd * 1.3 + d.phase * 5) * g.sway;
  const sq = 1 + Math.sin(t * g.bobSpd * 4 + d.phase * 3) * g.squash;
  const lean = Math.sin(t * 0.7 + d.phase * 6) * g.spin * 0.35;

  ctx.save();
  ctx.translate(d.x, d.y + bob);
  ctx.rotate(sway + lean);
  ctx.scale(1 / sq, sq);

  if (d.hitFlash > 0) {
    ctx.shadowColor = '#ff4d6d';
    ctx.shadowBlur = 22 * (d.hitFlash / 0.28);
  }
  if (d.chill > 0) {
    ctx.shadowColor = '#7fd4ff';
    ctx.shadowBlur = 16;
  }

  ctx.font = `${Math.round(size)}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(d.card.speciesId, 0, 0);
  ctx.shadowBlur = 0;

  // Eyes track the nearest radical, which is most of the charm for free.
  const look = d.target ? clamp((d.target.x - d.x) / (CELL_W * 3), -1, 1) : Math.sin(t * 0.6 + d.phase * 4) * 0.5;
  const mood = moodFor(hpFrac, d.threat || 0, d.hitFlash);
  drawFace(ctx, size, g, { mood, t, phase: d.phase, lookX: look, lookY: 0.1 });
  ctx.restore();

  if (hpFrac < 0.999) {
    drawBar(ctx, d.x - 22, d.y + 30, 44, 5, hpFrac, '#7bffb0');
  }
}

function drawAttacker(ctx, game, a) {
  const el = ELEMENTS[a.element];
  const y = cellY(a.row);
  const t = game.time;
  const wob = Math.sin(t * 6 + a.phase * 9) * (a.chewing ? 3.2 : 1.6);
  const size = Math.round(30 + a.radical.mass * 12);

  ctx.save();
  ctx.translate(a.x, y + wob);
  ctx.rotate(Math.sin(t * 3 + a.phase * 5) * 0.08);

  // Elemental aura, so a lane full of 火 reads instantly as a fire lane.
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.72, 0, Math.PI * 2);
  const glow = ctx.createRadialGradient(0, 0, size * 0.1, 0, 0, size * 0.72);
  glow.addColorStop(0, `${el.glow}aa`);
  glow.addColorStop(1, `${el.glow}00`);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.font = `700 ${size}px ${HAN_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = el.glow;
  ctx.shadowBlur = a.hitFlash > 0 ? 26 : 12;
  ctx.fillStyle = a.hitFlash > 0 ? '#ffffff' : el.color;
  ctx.fillText(a.radical.glyph, 0, 0);
  ctx.restore();

  drawBar(ctx, a.x - 20, y - size * 0.62, 40, 4, clamp(a.hp / a.maxHp, 0, 1), el.color);
}

function drawShot(ctx, s) {
  const el = ELEMENTS[s.element];
  ctx.save();
  ctx.beginPath();
  ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = el.color;
  ctx.shadowColor = el.glow;
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.restore();
}

function drawPuff(ctx, p) {
  const k = p.life / p.max;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.translate(p.x, p.y);
  ctx.scale(0.6 + (1 - k) * 0.9, 0.6 + (1 - k) * 0.9);
  ctx.font = `26px ${EMOJI_FONT}, ${HAN_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = p.color;
  ctx.fillText(p.glyph, 0, 0);
  ctx.restore();
}

function drawBar(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * frac, h);
}

function drawTopBar(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 0, WIDTH, FIELD_Y - 8);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `700 26px ${HAN_FONT}`;
  ctx.fillStyle = '#ffd7a8';
  ctx.fillText('偏旁大恐慌', 16, 32);
  ctx.font = '600 13px ui-sans-serif,system-ui,sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('RADICAL PANIC', 16, 52);

  const items = [
    ['氣', Math.floor(game.qi), '#8ee7ff'],
    ['波', game.wave, '#ffd7a8'],
    ['殺', game.kills, '#ff9ec4'],
    ['碗', game.lives, '#9dffb8'],
  ];
  let x = 200;
  for (const [label, value, color] of items) {
    ctx.font = `600 15px ${HAN_FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(label, x, 34);
    ctx.font = '700 22px ui-sans-serif,system-ui,sans-serif';
    ctx.fillStyle = color;
    ctx.fillText(String(value), x + 22, 34);
    x += 92;
  }

  if (game.state === 'breather') {
    ctx.textAlign = 'right';
    ctx.font = '600 15px ui-sans-serif,system-ui,sans-serif';
    ctx.fillStyle = '#ffd7a8';
    ctx.fillText(`next wave in ${Math.ceil(game.breather)}s`, WIDTH - 16, 34);
  } else if (game.state === 'briefing') {
    ctx.textAlign = 'right';
    ctx.font = '600 15px ui-sans-serif,system-ui,sans-serif';
    ctx.fillStyle = '#9dffb8';
    ctx.fillText('press SPACE to begin', WIDTH - 16, 34);
  }
  ctx.restore();
}

function drawMessage(ctx, game) {
  if (game.time > game.messageUntil || !game.message) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `600 18px ${HAN_FONT}, ui-sans-serif, system-ui, sans-serif`;
  const w = ctx.measureText(game.message).width + 28;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(WIDTH / 2 - w / 2, HEIGHT - 52, w, 32);
  ctx.fillStyle = '#ffe9c9';
  ctx.fillText(game.message, WIDTH / 2, HEIGHT - 31);
  ctx.restore();
}

function drawGameOver(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(12,6,20,0.78)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd7a8';
  ctx.font = `700 54px ${HAN_FONT}`;
  ctx.fillText('全部吃光了', WIDTH / 2, HEIGHT / 2 - 40);
  ctx.fillStyle = '#fff';
  ctx.font = '600 20px ui-sans-serif,system-ui,sans-serif';
  ctx.fillText(`The radicals ate everything on wave ${game.wave}.`, WIDTH / 2, HEIGHT / 2 + 4);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '400 16px ui-sans-serif,system-ui,sans-serif';
  ctx.fillText('Your gene pool survives. Press R to send the descendants back in.',
    WIDTH / 2, HEIGHT / 2 + 36);
  ctx.restore();
}
