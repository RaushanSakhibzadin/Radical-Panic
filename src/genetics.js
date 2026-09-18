// ---------------------------------------------------------------------------
// The evolving half of the game.
//
// Every emoji you can plant is an INDIVIDUAL, not a type. It carries a genome:
// combat numbers, animation numbers, and face numbers, all in one flat object.
// When the game offers you a card it takes a parent genome out of that
// species' gene pool and mutates it slightly, so no two are ever identical.
//
// Selection is you. Planting a card says "I liked this one" and its parent's
// fitness goes up, so that lineage gets drafted more often and its mutations
// become the new normal. Composting a card, or leaving it in your hand all
// round, says the opposite and the lineage fades. A small secondary bonus is
// paid at the end of a wave to individuals who actually performed, so the game
// is not purely a beauty contest — see FIELD_CREDIT below to turn that off.
//
// Everything persists to localStorage, so your roster in wave 1 of your tenth
// session is descended from what you enjoyed in your first.
// ---------------------------------------------------------------------------

import { EMOJI, EMOJI_BY_ID } from './data.js';
import { clamp, gauss, pick, uid, weighted } from './rng.js';

export const GENOME_VERSION = 1;

// How much a wave's kill count is allowed to matter, relative to one pick by
// the player (which is worth PICK_REWARD). Set to 0 for pure player-taste
// selection.
export const FIELD_CREDIT = 0.35;

const PICK_REWARD = 1.0;
const COMPOST_PENALTY = -0.75;
const STALE_PENALTY = -0.2;   // still in hand when the wave ended
const DECAY = 0.985;          // per wave, applied to every stored fitness
const PRUNE_BELOW = 0.12;
const POOL_PER_SPECIES = 8;
const NOVELTY_CHANCE = 0.18;  // draft a brand-new random genome anyway

// --- Trait table -----------------------------------------------------------
// min/max are hard walls; sigma is how far one generation can drift. Combat
// traits mutate slower than cosmetic ones — you should be able to breed a
// distinctive look long before you breed a broken stat line.
const T = (min, max, sigma, group) => ({ min, max, sigma, group });

export const TRAITS = {
  // combat
  hp:      T(45, 220, 9,     'combat'),
  atk:     T(4, 34, 1.4,     'combat'),
  def:     T(0, 0.55, 0.035, 'combat'),
  spd:     T(0.45, 2.4, 0.09, 'combat'),
  rng:     T(2.2, 9.5, 0.3,  'combat'),
  // body animation
  bob:     T(0, 9, 0.9,      'anim'),   // vertical bounce, px
  bobSpd:  T(0.4, 4.2, 0.35, 'anim'),   // bounce rate
  sway:    T(-0.32, 0.32, 0.05, 'anim'), // rotation amplitude, rad
  squash:  T(0, 0.28, 0.035, 'anim'),   // squash & stretch
  spin:    T(-0.9, 0.9, 0.12, 'anim'),  // idle lean
  scale:   T(0.78, 1.28, 0.05, 'anim'), // overall size
  // face
  eyeGap:  T(0.11, 0.34, 0.022, 'face'),
  eyeSize: T(0.07, 0.25, 0.018, 'face'),
  eyeY:    T(-0.16, 0.16, 0.022, 'face'),
  pupil:   T(0.24, 0.78, 0.055, 'face'),
  browA:   T(-0.85, 0.85, 0.1,  'face'),
  browY:   T(0.1, 0.42, 0.03,  'face'),
  browW:   T(0, 1, 0.08,       'face'),  // 0 = no brows at all
  mouth:   T(0, 1, 0.08,       'face'),  // 0 = tiny, 1 = wide
  mouthY:  T(0.14, 0.42, 0.028, 'face'),
  blink:   T(0.06, 0.55, 0.05, 'face'),  // blinks per second-ish
  tilt:    T(-0.3, 0.3, 0.045, 'face'),  // head tilt of the drawn face
  squint:  T(0, 1, 0.08,       'face'),
};

export const TRAIT_KEYS = Object.keys(TRAITS);

function randomValue(key) {
  const t = TRAITS[key];
  // Start near the middle of the legal range rather than uniformly across it,
  // so a fresh species is unremarkable and has somewhere to evolve towards.
  const mid = (t.min + t.max) / 2;
  const span = (t.max - t.min) / 2;
  return clamp(gauss(mid, span * 0.42), t.min, t.max);
}

// A species' `bias` from data.js shifts the combat traits of its founder only.
function applyBias(genome, bias) {
  for (const [key, amount] of Object.entries(bias)) {
    const t = TRAITS[key];
    if (!t) continue;
    genome[key] = clamp(genome[key] + amount * (t.max - t.min) * 0.5, t.min, t.max);
  }
  return genome;
}

export function randomGenome(speciesId) {
  const species = EMOJI_BY_ID.get(speciesId);
  const g = { species: speciesId };
  for (const key of TRAIT_KEYS) g[key] = randomValue(key);
  return applyBias(g, species ? species.bias : {});
}

// One generation of drift. `strength` lets an event (a whole round survived,
// a "shake things up" button) widen the mutation without touching the table.
export function mutate(parent, strength = 1) {
  const child = { species: parent.species };
  for (const key of TRAIT_KEYS) {
    const t = TRAITS[key];
    child[key] = clamp(parent[key] + gauss(0, t.sigma * strength), t.min, t.max);
  }
  // Rare jolt: one trait re-rolls completely. Keeps a pool from converging on
  // a single boring local optimum after a few hundred picks.
  if (Math.random() < 0.05) {
    const key = pick(TRAIT_KEYS);
    child[key] = randomValue(key);
  }
  return child;
}

// Derived, read-only numbers the game actually uses.
export function stats(genome) {
  return {
    maxHp: Math.round(genome.hp),
    damage: genome.atk,
    armour: genome.def,
    fireRate: genome.spd,       // shots per second
    range: genome.rng,          // in grid cells
    cost: cost(genome),
  };
}

// Cost is derived from the genome, so a lineage that evolves into a monster
// also evolves into an expensive one. That is the brake on runaway selection.
export function cost(genome) {
  const raw =
    genome.hp * 0.16 +
    genome.atk * 2.1 +
    genome.def * 42 +
    genome.spd * 16 +
    genome.rng * 3.4;
  // Tuned so an opening hand is roughly three plantings deep, and a genuinely
  // over-evolved individual prices itself out of the early waves.
  return Math.max(15, Math.round(raw / 9.5) * 5);
}

// A crude "how strong is this individual" number, only used for UI bars.
export function power(genome) {
  return genome.hp * 0.1 + genome.atk * genome.spd * 2 + genome.rng * 2 + genome.def * 30;
}

// ---------------------------------------------------------------------------
// The gene pool
// ---------------------------------------------------------------------------

export function emptyPool() {
  return {
    version: GENOME_VERSION,
    species: {},     // speciesId -> { affinity, seen, picked, lines: [line] }
    generation: 0,
    picks: 0,
    createdAt: Date.now(),
  };
}

function speciesEntry(pool, speciesId) {
  let entry = pool.species[speciesId];
  if (!entry) {
    entry = { affinity: 0, seen: 0, picked: 0, lines: [] };
    pool.species[speciesId] = entry;
  }
  return entry;
}

// Exploration floor: every species keeps a small chance of showing up even if
// you have never picked it, otherwise the first ten minutes of play would
// permanently bury two thirds of the roster.
const BASE_SPECIES_WEIGHT = 0.55;

export function speciesWeight(pool, speciesId) {
  const entry = pool.species[speciesId];
  if (!entry) return BASE_SPECIES_WEIGHT;
  return BASE_SPECIES_WEIGHT + Math.max(0, entry.affinity);
}

// Draw one card: choose a species you tend to like, then a lineage inside it
// you tend to like, then mutate. `unlocked` limits the roster early on.
export function draft(pool, unlocked = EMOJI.length) {
  const roster = EMOJI.slice(0, clamp(unlocked, 4, EMOJI.length));
  const species = weighted(roster, (e) => speciesWeight(pool, e.id));
  const entry = speciesEntry(pool, species.id);
  entry.seen += 1;

  const lines = entry.lines;
  let parent = null;
  if (lines.length && Math.random() > NOVELTY_CHANCE) {
    const line = weighted(lines, (l) => l.fitness);
    parent = line.genome;
    return {
      id: uid(),
      speciesId: species.id,
      parentId: line.id,
      generation: line.generation + 1,
      genome: mutate(parent),
    };
  }

  return {
    id: uid(),
    speciesId: species.id,
    parentId: null,
    generation: 0,
    genome: randomGenome(species.id),
  };
}

function findLine(pool, speciesId, lineId) {
  const entry = pool.species[speciesId];
  if (!entry || !lineId) return null;
  return entry.lines.find((l) => l.id === lineId) || null;
}

function trimPool(entry) {
  entry.lines = entry.lines
    .filter((l) => l.fitness > PRUNE_BELOW)
    .sort((a, b) => b.fitness - a.fitness)
    .slice(0, POOL_PER_SPECIES);
}

// The player planted this card. Reward the parent lineage and enrol the child
// as a lineage of its own, so its mutation becomes something future children
// can inherit.
export function reward(pool, card, amount = PICK_REWARD) {
  const entry = speciesEntry(pool, card.speciesId);
  entry.affinity += amount;
  entry.picked += 1;
  pool.picks += 1;

  const parent = findLine(pool, card.speciesId, card.parentId);
  if (parent) parent.fitness += amount;

  let line = findLine(pool, card.speciesId, card.id);
  if (!line) {
    line = {
      id: card.id,
      genome: card.genome,
      fitness: amount,
      generation: card.generation,
      born: Date.now(),
      kills: 0,
    };
    entry.lines.push(line);
    pool.generation = Math.max(pool.generation, card.generation);
  } else {
    line.fitness += amount;
  }
  trimPool(entry);
  return line;
}

// The player composted it, or never used it. Punish the lineage it came from.
export function punish(pool, card, amount = COMPOST_PENALTY) {
  const entry = speciesEntry(pool, card.speciesId);
  entry.affinity = Math.max(-2, entry.affinity + amount * 0.6);
  const parent = findLine(pool, card.speciesId, card.parentId);
  if (parent) {
    parent.fitness += amount;
    trimPool(entry);
  }
}

export function stale(pool, card) {
  punish(pool, card, STALE_PENALTY);
}

// Secondary pressure: individuals that actually did work on the field earn a
// little fitness for their own lineage. Scaled by FIELD_CREDIT.
export function creditField(pool, card, kills, survived) {
  if (FIELD_CREDIT <= 0) return;
  const score = kills * 0.25 + (survived ? 0.4 : 0);
  if (score <= 0) return;
  const line = findLine(pool, card.speciesId, card.id);
  if (line) {
    line.fitness += score * FIELD_CREDIT;
    line.kills += kills;
    trimPool(pool.species[card.speciesId]);
  }
}

// Called once per wave. Old fitness fades, so a lineage you loved twenty waves
// ago and never plant any more eventually leaves the pool.
export function decay(pool) {
  for (const entry of Object.values(pool.species)) {
    entry.affinity *= DECAY;
    for (const line of entry.lines) line.fitness *= DECAY;
    trimPool(entry);
  }
}

// --- Reporting -------------------------------------------------------------

export function topLineages(pool, limit = 12) {
  const out = [];
  for (const [speciesId, entry] of Object.entries(pool.species)) {
    for (const line of entry.lines) {
      out.push({ speciesId, ...line, affinity: entry.affinity });
    }
  }
  return out.sort((a, b) => b.fitness - a.fitness).slice(0, limit);
}

export function favouriteSpecies(pool, limit = 6) {
  return Object.entries(pool.species)
    .map(([id, e]) => ({ id, ...e }))
    .filter((e) => e.picked > 0)
    .sort((a, b) => b.affinity - a.affinity)
    .slice(0, limit);
}

// How far the pool has drifted from a fresh random genome, per trait group.
// Shown in the Evolution panel so the drift is legible rather than mystical.
export function drift(pool) {
  const groups = { combat: [], anim: [], face: [] };
  let n = 0;
  for (const entry of Object.values(pool.species)) {
    for (const line of entry.lines) {
      n += 1;
      for (const key of TRAIT_KEYS) {
        const t = TRAITS[key];
        const mid = (t.min + t.max) / 2;
        const norm = Math.abs(line.genome[key] - mid) / ((t.max - t.min) / 2);
        groups[t.group].push(norm);
      }
    }
  }
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  return {
    lineages: n,
    combat: avg(groups.combat),
    anim: avg(groups.anim),
    face: avg(groups.face),
  };
}
