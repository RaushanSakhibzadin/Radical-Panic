// ---------------------------------------------------------------------------
// World state and simulation. Pure-ish: it never touches the DOM or the
// canvas, it only advances numbers. Rendering reads from it, the UI calls into
// it. Keeping it this way is what let the genetics be tested from node.
// ---------------------------------------------------------------------------

import { ELEMENTS, RADICALS, elementMultiplier } from './data.js';
import * as G from './genetics.js';
import { clamp, rand, randInt, uid, weighted } from './rng.js';

export const COLS = 9;
export const ROWS = 5;
export const CELL_W = 92;
export const CELL_H = 100;
export const FIELD_X = 96;       // left edge of column 0
export const FIELD_Y = 74;       // top edge of row 0
export const HOME_X = FIELD_X - 34;

export const HAND_SIZE = 4;
export const START_QI = 175;
export const START_LIVES = 3;

export function cellX(col) { return FIELD_X + col * CELL_W + CELL_W / 2; }
export function cellY(row) { return FIELD_Y + row * CELL_H + CELL_H / 2; }
export function colAtX(x) { return Math.floor((x - FIELD_X) / CELL_W); }
export function rowAtY(y) { return Math.floor((y - FIELD_Y) / CELL_H); }

export function createGame(pool) {
  const game = {
    pool,
    state: 'briefing',        // briefing | wave | breather | over
    time: 0,
    wave: 0,
    qi: START_QI,
    lives: START_LIVES,
    defenders: [],
    attackers: [],
    shots: [],
    puffs: [],                // transient visual effects
    hand: [],
    selected: null,           // index into hand
    queue: [],                // attackers left to spawn this wave
    spawnTimer: 0,
    breather: 0,
    kills: 0,
    planted: 0,
    best: 0,
    message: '',
    messageUntil: 0,
    unlocked: 18,             // roster grows as you survive waves
  };
  refillHand(game);
  return game;
}

export function say(game, text, seconds = 2.6) {
  game.message = text;
  game.messageUntil = game.time + seconds;
}

// --- the hand --------------------------------------------------------------

export function refillHand(game) {
  while (game.hand.length < HAND_SIZE) {
    const card = G.draft(game.pool, game.unlocked);
    card.drawnWave = game.wave;
    card.stats = G.stats(card.genome);
    game.hand.push(card);
  }
}

// Planting is the positive selection signal. Everything about how the roster
// looks and plays five hours from now comes from this one call.
export function plant(game, handIndex, row, col) {
  const card = game.hand[handIndex];
  if (!card) return false;
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
  if (occupied(game, row, col)) { say(game, 'Something is already standing there.'); return false; }
  if (game.qi < card.stats.cost) { say(game, `Not enough 氣 — need ${card.stats.cost}.`); return false; }

  game.qi -= card.stats.cost;
  const line = G.reward(game.pool, card);
  game.defenders.push(makeDefender(card, line, row, col, game.time));
  game.hand.splice(handIndex, 1);
  game.selected = null;
  game.planted += 1;
  refillHand(game);
  return true;
}

// Composting is the explicit negative signal, and the strongest one available.
export function compost(game, handIndex) {
  const card = game.hand[handIndex];
  if (!card) return false;
  G.punish(game.pool, card);
  game.qi += Math.round(card.stats.cost * 0.35);
  game.hand.splice(handIndex, 1);
  if (game.selected === handIndex) game.selected = null;
  refillHand(game);
  say(game, 'Composted. That lineage will be offered less often.');
  return true;
}

function makeDefender(card, line, row, col, now) {
  const s = G.stats(card.genome);
  return {
    id: uid(),
    card,
    line,
    genome: card.genome,
    stats: s,
    row,
    col,
    x: cellX(col),
    y: cellY(row),
    hp: s.maxHp,
    maxHp: s.maxHp,
    cooldown: rand(0, 0.4),
    phase: rand(0, 1),
    bornAt: now,
    kills: 0,
    hitFlash: 0,
    chill: 0,
    alive: true,
  };
}

export function occupied(game, row, col) {
  return game.defenders.some((d) => d.alive && d.row === row && d.col === col);
}

export function defenderAt(game, row, col) {
  return game.defenders.find((d) => d.alive && d.row === row && d.col === col) || null;
}

// --- waves -----------------------------------------------------------------

export function startWave(game) {
  game.wave += 1;
  game.state = 'wave';
  game.queue = buildWave(game.wave);
  game.spawnTimer = 1.2;
  game.unlocked = Math.min(75, 18 + game.wave * 3);
  say(game, `第 ${game.wave} 波 — wave ${game.wave}`, 2.2);
}

function buildWave(n) {
  // Budget grows superlinearly but slowly; tiers unlock over time.
  const budget = Math.round(45 + n * 26 + n * n * 3.4);
  const maxTier = n < 4 ? 1 : n < 9 ? 2 : 3;
  const roster = RADICALS.filter((r) => r.tier <= maxTier);
  const out = [];
  let spent = 0;
  let guard = 0;
  while (spent < budget && guard++ < 400) {
    const r = weighted(roster, (x) => (x.tier === maxTier ? 1.4 : 1) / x.tier);
    const priceOf = 14 * r.tier * r.mass;
    out.push(makeAttacker(r, n));
    spent += priceOf;
  }
  // Shuffle lanes so waves do not arrive as a neat wall.
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeAttacker(r, wave) {
  const scale = 1 + wave * 0.17;
  const hp = Math.round((26 + r.mass * 30) * scale * rand(0.9, 1.15));
  return {
    id: uid(),
    radical: r,
    element: r.element,
    row: randInt(0, ROWS - 1),
    x: FIELD_X + COLS * CELL_W + rand(16, 150),
    hp,
    maxHp: hp,
    speed: (r.swift ? 30 : 20) / (0.6 + r.mass * 0.5) * rand(0.9, 1.1),
    damage: (4.2 + r.mass * 3.9) * scale * (r.pierce ? 1.35 : 1),
    armour: r.armour || 0,
    phase: rand(0, 1),
    chewing: null,
    chill: 0,
    hitFlash: 0,
    bounty: Math.round(7 + r.tier * 6 + r.mass * 4),
  };
}

// --- simulation ------------------------------------------------------------

const CHEW_RATE = 1.6;   // bites per second

export function update(game, dt) {
  game.time += dt;
  if (game.state === 'over') return;

  // 氣 regenerates on its own — no sun-clicking chore, the interesting choice
  // is which card to spend it on.
  if (game.state === 'wave' || game.state === 'breather') {
    game.qi = Math.min(999, game.qi + (11 + game.wave * 0.7) * dt);
  }

  if (game.state === 'wave') {
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0 && game.queue.length) {
      const batch = Math.min(game.queue.length, 1 + Math.floor(game.wave / 6));
      for (let i = 0; i < batch; i += 1) game.attackers.push(game.queue.shift());
      game.spawnTimer = clamp(2.4 - game.wave * 0.07, 0.55, 2.4) * rand(0.7, 1.3);
    }
  }

  updateDefenders(game, dt);
  updateAttackers(game, dt);
  updateShots(game, dt);
  updatePuffs(game, dt);

  if (game.state === 'wave' && !game.queue.length && !game.attackers.length) {
    endWave(game);
  }
  if (game.state === 'breather') {
    game.breather -= dt;
    if (game.breather <= 0) startWave(game);
  }
}

function nearestAttackerInLane(game, row, fromX, rangePx) {
  let best = null;
  for (const a of game.attackers) {
    if (a.row !== row) continue;
    if (a.x < fromX - CELL_W * 0.4) continue;
    if (a.x > fromX + rangePx) continue;
    if (!best || a.x < best.x) best = a;
  }
  return best;
}

function updateDefenders(game, dt) {
  for (const d of game.defenders) {
    if (!d.alive) continue;
    d.hitFlash = Math.max(0, d.hitFlash - dt);
    d.chill = Math.max(0, d.chill - dt);

    const rangePx = d.stats.range * CELL_W;
    const target = nearestAttackerInLane(game, d.row, d.x, rangePx);
    d.target = target;
    // Threat drives the face: something two cells away is scary, something
    // nine cells away is not.
    d.threat = target ? clamp(1 - (target.x - d.x) / (CELL_W * 4), 0, 1) : 0;

    const rate = d.stats.fireRate * (d.chill > 0 ? 0.55 : 1);
    d.cooldown -= dt * rate;
    if (target && d.cooldown <= 0) {
      d.cooldown = 1;
      game.shots.push({
        x: d.x + 14, y: d.y - 6, row: d.row,
        vx: 420 + d.stats.fireRate * 40,
        damage: d.stats.damage,
        element: guessElement(d.genome),
        owner: d,
        life: 3,
      });
    }
  }
  game.defenders = game.defenders.filter((d) => d.alive || d.hp > -999);
}

// Defenders have no element of their own in the roster, so derive one from the
// genome: the trait that dominates decides what colour it shoots. A lineage
// bred for raw attack literally starts throwing fire.
function guessElement(g) {
  const score = {
    fire: g.atk / 34,
    water: g.spd / 2.4,
    wood: g.hp / 220,
    metal: g.def / 0.55,
    earth: g.rng / 9.5,
  };
  return Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];
}

function updateAttackers(game, dt) {
  for (const a of game.attackers) {
    a.hitFlash = Math.max(0, a.hitFlash - dt);
    a.chill = Math.max(0, a.chill - dt);

    const col = colAtX(a.x - CELL_W * 0.22);
    const blocker = col >= 0 && col < COLS ? defenderAt(game, a.row, col) : null;

    if (blocker) {
      a.chewing = blocker.id;
      a.chewTimer = (a.chewTimer || 0) + dt;
      if (a.chewTimer >= 1 / CHEW_RATE) {
        a.chewTimer = 0;
        const mult = elementMultiplier(a.element, guessElement(blocker.genome));
        const dmg = a.damage * mult * (1 - blocker.stats.armour);
        blocker.hp -= dmg;
        blocker.hitFlash = 0.28;
        if (a.radical.chill) blocker.chill = 1.8;
        if (blocker.hp <= 0) {
          blocker.alive = false;
          puff(game, blocker.x, blocker.y, '💔', ELEMENTS[a.element].color);
          // An individual that died still fought; creditField decides whether
          // that counts for anything (see FIELD_CREDIT).
          G.creditField(game.pool, blocker.card, blocker.kills, false);
        }
      }
    } else {
      a.chewing = null;
      a.chewTimer = 0;
      a.x -= a.speed * dt * (a.chill > 0 ? 0.45 : 1);
    }

    if (a.x < HOME_X) {
      a.dead = true;
      game.lives -= 1;
      puff(game, HOME_X, a.y || cellY(a.row), '🥣', '#ff5252');
      say(game, `${a.radical.glyph} got through!`, 2);
      if (game.lives <= 0) gameOver(game);
    }
  }
  game.attackers = game.attackers.filter((a) => !a.dead && a.hp > 0);
  game.defenders = game.defenders.filter((d) => d.alive);
}

function updateShots(game, dt) {
  for (const s of game.shots) {
    s.x += s.vx * dt;
    s.life -= dt;
    for (const a of game.attackers) {
      if (a.row !== s.row || a.dead) continue;
      if (Math.abs(a.x - s.x) > 26) continue;
      const mult = elementMultiplier(s.element, a.element);
      a.hp -= s.damage * mult * (1 - a.armour);
      a.hitFlash = 0.2;
      s.life = 0;
      if (a.hp <= 0) {
        a.dead = true;
        game.kills += 1;
        game.qi += a.bounty;
        if (s.owner) {
          s.owner.kills += 1;
          if (s.owner.line) s.owner.line.kills = (s.owner.line.kills || 0) + 1;
        }
        puff(game, a.x, cellY(a.row), a.radical.glyph, ELEMENTS[a.element].color);
      }
      break;
    }
    if (s.x > FIELD_X + COLS * CELL_W + 60) s.life = 0;
  }
  game.shots = game.shots.filter((s) => s.life > 0);
}

function puff(game, x, y, glyph, color) {
  game.puffs.push({ x, y, glyph, color, life: 0.8, max: 0.8, vy: -46, vx: rand(-20, 20) });
}

function updatePuffs(game, dt) {
  for (const p of game.puffs) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 60 * dt;
  }
  game.puffs = game.puffs.filter((p) => p.life > 0);
}

// --- end of wave: this is where selection is actually applied --------------

function endWave(game) {
  game.state = 'breather';
  game.breather = 9;
  game.best = Math.max(game.best, game.wave);

  // Survivors earn their small performance credit.
  for (const d of game.defenders) {
    G.creditField(game.pool, d.card, d.kills, true);
  }
  // Cards you were offered a whole wave ago and never used are a mild "no".
  for (const card of game.hand) {
    if (card.drawnWave < game.wave) G.stale(game.pool, card);
    card.drawnWave = game.wave;
  }
  // Everything fades a little, so old favourites must keep being re-picked.
  G.decay(game.pool);

  say(game, `Wave ${game.wave} held. 九秒 to plant — next wave incoming.`, 4);
}

function gameOver(game) {
  game.state = 'over';
  game.best = Math.max(game.best, game.wave);
  say(game, '全部吃光了 — they ate everything.', 99);
}

export function restart(game) {
  const pool = game.pool;
  const fresh = createGame(pool);
  fresh.best = game.best;
  return fresh;
}
