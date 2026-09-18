// DOM side: the hand of cards along the bottom, and the evolution panel.
// Each card draws its own live portrait so you are judging the animation and
// the face, not a stat block — which is the whole point, since your judgement
// is the selection pressure.

import { EMOJI_BY_ID } from './data.js';
import { drawFace } from './faces.js';
import { HAND_SIZE, compost } from './game.js';
import * as G from './genetics.js';
import { clamp } from './rng.js';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

export function buildHand(root, game, onSelect) {
  root.innerHTML = '';
  const cards = [];
  for (let i = 0; i < HAND_SIZE; i += 1) {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <canvas class="card-art" width="132" height="112"></canvas>
      <div class="card-name"></div>
      <div class="card-gen"></div>
      <div class="card-stats"></div>
      <div class="card-foot">
        <span class="card-cost"></span>
        <button class="card-bin" title="Compost — tells evolution you dislike this one">🗑</button>
      </div>`;
    el.addEventListener('click', (ev) => {
      if (ev.target.closest('.card-bin')) return;
      onSelect(i);
    });
    el.querySelector('.card-bin').addEventListener('click', (ev) => {
      ev.stopPropagation();
      compost(game, i);
    });
    root.appendChild(el);
    cards.push({
      el,
      ctx: el.querySelector('.card-art').getContext('2d'),
      name: el.querySelector('.card-name'),
      gen: el.querySelector('.card-gen'),
      stats: el.querySelector('.card-stats'),
      cost: el.querySelector('.card-cost'),
    });
  }
  return cards;
}

const BARS = [
  ['HP',  (s) => s.maxHp / 220,  '#7bffb0'],
  ['ATK', (s) => s.damage / 34,  '#ff9ec4'],
  ['DEF', (s) => s.armour / 0.55, '#8ee7ff'],
  ['SPD', (s) => s.fireRate / 2.4, '#ffd7a8'],
  ['RNG', (s) => s.range / 9.5,  '#c8a8ff'],
];

export function updateHand(cards, game, t) {
  for (let i = 0; i < cards.length; i += 1) {
    const ui = cards[i];
    const card = game.hand[i];
    if (!card) { ui.el.style.visibility = 'hidden'; continue; }
    ui.el.style.visibility = 'visible';
    ui.el.classList.toggle('selected', game.selected === i);
    ui.el.classList.toggle('poor', game.qi < card.stats.cost);

    const species = EMOJI_BY_ID.get(card.speciesId);
    ui.name.textContent = species ? species.name : card.speciesId;
    ui.gen.textContent = card.generation > 0
      ? `gen ${card.generation}${card.parentId ? ' · inherited' : ''}`
      : 'gen 0 · newcomer';
    ui.cost.textContent = `氣 ${card.stats.cost}`;

    if (ui.stats.childElementCount !== BARS.length) {
      ui.stats.innerHTML = BARS.map(([label]) =>
        `<div class="bar"><span>${label}</span><i></i></div>`).join('');
    }
    BARS.forEach(([, getter, color], k) => {
      const fill = ui.stats.children[k].querySelector('i');
      fill.style.width = `${clamp(getter(card.stats), 0, 1) * 100}%`;
      fill.style.background = color;
    });

    drawCardArt(ui.ctx, card, t, i);
  }
}

// The portrait animates with the individual's own genes, so you can see the
// bob, the sway and the blink before you commit 氣 to it.
function drawCardArt(ctx, card, t, seed) {
  const g = card.genome;
  ctx.clearRect(0, 0, 132, 112);
  const size = 54 * g.scale;
  const phase = seed * 0.37;
  const bob = Math.sin(t * g.bobSpd * 2 + phase * 9) * g.bob * 0.6;
  const sway = Math.sin(t * g.bobSpd * 1.3 + phase * 5) * g.sway;
  const sq = 1 + Math.sin(t * g.bobSpd * 4 + phase * 3) * g.squash;

  ctx.save();
  ctx.translate(66, 60 + bob);
  ctx.rotate(sway);
  ctx.scale(1 / sq, sq);
  ctx.font = `${Math.round(size)}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.speciesId, 0, 0);
  drawFace(ctx, size, g, {
    mood: 'cute',
    t,
    phase,
    lookX: Math.sin(t * 0.8 + phase * 3) * 0.6,
    lookY: 0.15,
  });
  ctx.restore();
}

// --- evolution panel -------------------------------------------------------

export function renderEvolution(el, pool) {
  const favourites = G.favouriteSpecies(pool, 8);
  const top = G.topLineages(pool, 8);
  const d = G.drift(pool);

  const bar = (v) => `<i style="width:${clamp(v, 0, 1) * 100}%"></i>`;

  el.innerHTML = `
    <h3>Gene pool</h3>
    <p class="muted">${pool.picks} picks · ${d.lineages} living lineages · deepest generation ${pool.generation}</p>

    <h4>Drift from random</h4>
    <div class="drift">
      <div class="bar"><span>combat</span>${bar(d.combat)}</div>
      <div class="bar"><span>motion</span>${bar(d.anim)}</div>
      <div class="bar"><span>face</span>${bar(d.face)}</div>
    </div>
    <p class="muted small">How far your roster has wandered from a fresh random
    genome. It only moves because of what you plant and what you compost.</p>

    <h4>Species you favour</h4>
    <div class="fav">${favourites.length
      ? favourites.map((f) => `<span class="chip" title="${f.picked} picks">${f.id}<b>${f.affinity.toFixed(1)}</b></span>`).join('')
      : '<span class="muted small">Nothing yet — plant something.</span>'}</div>

    <h4>Strongest lineages</h4>
    <ol class="lines">${top.length
      ? top.map((l) => `<li><span class="g">${l.speciesId}</span>
          gen ${l.generation} · fitness ${l.fitness.toFixed(2)} · ${l.kills || 0} kills</li>`).join('')
      : '<li class="muted small">No lineages have been bred yet.</li>'}</ol>`;
}
