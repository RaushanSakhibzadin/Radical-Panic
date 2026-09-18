// Wiring: input, the frame loop, and the buttons around the board.

import * as Game from './game.js';
import { COLS, ROWS, colAtX, rowAtY } from './game.js';
import { draw, setupCanvas, HEIGHT, WIDTH } from './render.js';
import { exportPool, importPool, loadPool, resetPool, savePool } from './storage.js';
import { buildHand, renderEvolution, updateHand } from './ui.js';

const canvas = document.getElementById('board');
const ctx = setupCanvas(canvas);

let pool = loadPool();
let game = Game.createGame(pool);
let hover = null;

const handEl = document.getElementById('hand');
const evoEl = document.getElementById('evolution');
let handUI = buildHand(handEl, game, select);

function select(i) {
  game.selected = game.selected === i ? null : i;
}

// --- input -----------------------------------------------------------------

function pointerCell(ev) {
  const rect = canvas.getBoundingClientRect();
  const x = (ev.clientX - rect.left) * (WIDTH / rect.width);
  const y = (ev.clientY - rect.top) * (HEIGHT / rect.height);
  const row = rowAtY(y);
  const col = colAtX(x);
  const valid = row >= 0 && row < ROWS && col >= 0 && col < COLS;
  return { row, col, valid };
}

canvas.addEventListener('pointermove', (ev) => {
  const cell = pointerCell(ev);
  const card = game.hand[game.selected];
  cell.ok = Boolean(card) && cell.valid
    && !Game.occupied(game, cell.row, cell.col)
    && game.qi >= card.stats.cost;
  hover = cell;
});
canvas.addEventListener('pointerleave', () => { hover = null; });

canvas.addEventListener('pointerdown', (ev) => {
  if (game.state === 'over') return;
  if (game.state === 'briefing') Game.startWave(game);
  const cell = pointerCell(ev);
  if (!cell.valid) return;
  if (game.selected === null) {
    Game.say(game, 'Pick a card below first.');
    return;
  }
  if (Game.plant(game, game.selected, cell.row, cell.col)) {
    savePool(pool);
    renderEvolution(evoEl, pool);
  }
});

window.addEventListener('keydown', (ev) => {
  if (ev.key >= '1' && ev.key <= '4') select(Number(ev.key) - 1);
  if (ev.key === ' ') {
    ev.preventDefault();
    if (game.state === 'briefing') Game.startWave(game);
    else if (game.state === 'breather') { game.breather = 0.01; }
  }
  if (ev.key === 'r' || ev.key === 'R') restart();
  if (ev.key === 'x' || ev.key === 'X') {
    if (game.selected !== null) { Game.compost(game, game.selected); savePool(pool); renderEvolution(evoEl, pool); }
  }
});

function restart() {
  game = Game.createGame(pool);
  handUI = buildHand(handEl, game, select);
  renderEvolution(evoEl, pool);
}

// --- buttons ---------------------------------------------------------------

document.getElementById('btn-restart').addEventListener('click', restart);

document.getElementById('btn-export').addEventListener('click', () => exportPool(pool));

document.getElementById('btn-import').addEventListener('click', () => {
  document.getElementById('file-import').click();
});
document.getElementById('file-import').addEventListener('change', async (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  try {
    pool = await importPool(file);
    savePool(pool);
    restart();
    Game.say(game, 'Gene pool imported.');
  } catch (err) {
    Game.say(game, 'That file was not a gene pool.');
    console.warn(err);
  }
  ev.target.value = '';
});

document.getElementById('btn-wipe').addEventListener('click', () => {
  if (!window.confirm('Delete your evolved gene pool? Every lineage you have bred is lost.')) return;
  pool = resetPool();
  restart();
});

document.getElementById('btn-help').addEventListener('click', () => {
  document.getElementById('help').classList.toggle('open');
});
document.getElementById('help-close').addEventListener('click', () => {
  document.getElementById('help').classList.remove('open');
});

// --- loop ------------------------------------------------------------------

let last = performance.now();
let sinceSave = 0;

function frame(now) {
  // Clamp dt so a backgrounded tab does not resolve six waves at once.
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const before = game.wave;
  Game.update(game, dt);
  if (game.wave !== before) renderEvolution(evoEl, pool);

  sinceSave += dt;
  if (sinceSave > 5) { sinceSave = 0; savePool(pool); }

  draw(ctx, game, hover);
  updateHand(handUI, game, game.time);
  requestAnimationFrame(frame);
}

renderEvolution(evoEl, pool);
Game.say(game, '選一個 — pick a card, then click the field. SPACE to start.', 6);
requestAnimationFrame(frame);
