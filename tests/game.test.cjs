const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Run the real game with a minimal browser surface and deterministic random source.
// Expose internals only in this test context; the shipped game has no debug API.
function boot(saved, blocked = false) {
  const elements = new Map();
  const drawnText = [];
  const textStyles = [];
  const drawing = new Proxy({ globalAlpha: 1 }, { get: (target, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} })
    : key === 'measureText' ? text => ({ width: text.length * 6 }) : key === 'fillText' ? (...args) => {
      drawnText.push(args); textStyles.push({ text: args[0], fillStyle: target.fillStyle, alpha: target.globalAlpha });
    } : target[key] ?? (() => {}) });
  function element() {
    return { children: [], events: {}, style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {} },
      replaceChildren() { this.children = []; }, append(child) { this.children.push(child); },
      addEventListener(type, handler) { this.events[type] = handler; }, setAttribute(key, value) { this[key] = value; },
      getContext() { return drawing; }, getBoundingClientRect() { return { width: 720, height: 610 }; } };
  }
  let stored = saved;
  let seed = 321;
  const math = Object.create(Math);
  math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const context = vm.createContext({ Math: math, performance: { now: () => 0 }, devicePixelRatio: 2,
    window: { matchMedia: () => ({ matches: false }), addEventListener() {} },
    document: { hidden: false, querySelector(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); }, createElement: element, addEventListener() {} },
    localStorage: { getItem() { if (blocked) throw Error('Storage blocked'); return stored ?? null; }, setItem(_, value) { if (blocked) throw Error('Storage blocked'); stored = value; } },
    setTimeout() {}, clearTimeout() {}, requestAnimationFrame() {} });
  const source = fs.readFileSync(require.resolve('../game.js'), 'utf8').replace('start(); requestAnimationFrame(frame);',
    'start(); globalThis.game = { get state() { return state; }, get memory() { return memory; }, selectOffer, randomGenome, chooseParent, rememberChoices, update, resize, draw, start, renderOffers, emotionFor, drawEmojiFace, EMOJI, RADICALS, RADICAL_COLORS, MAX_LEVEL, affinity, damageMultiplier, radicalLabel, radicalGlyph, radicalColor, decayLineages, drawOfferPreviews, previewEmotion };');
  vm.runInContext(source, context);
  return { game: context.game, elements, context, drawnText, textStyles, stored: () => stored };
}

test('waits for first recruitment, then spends one spark and remembers only what was planted', () => {
  const { game } = boot();
  game.update(30);
  assert.equal(game.state.enemies.length, 0);
  const chosen = game.state.offers[0];
  game.selectOffer(chosen);
  assert.equal(game.state.sparks, 2);
  assert.equal(game.state.friends.length, 1);
  // Only the planted candidate is enrolled. The two rejects are not stored as
  // lineages of their own - storing them crowded newcomers out of the pool.
  assert.equal(game.memory.lineages.length, 1);
  assert.equal(game.memory.lineages[0].id, chosen.id);
  assert.equal(game.memory.lineages[0].fitness, 1.6);
  game.selectOffer(chosen); // A stale tray click must not spend again.
  assert.equal(game.state.sparks, 2);
  game.update(3);
  assert.equal(game.state.enemies.length, 1);
});

test('chosen lineage is sampled more often and children inherit bounded small mutations', () => {
  const { game } = boot();
  const chosen = game.state.offers[0];
  game.selectOffer(chosen);
  const counts = new Map();
  for (let i = 0; i < 4000; i++) { const parent = game.chooseParent(); if (parent) counts.set(parent.id, (counts.get(parent.id) || 0) + 1); }
  for (const rejected of game.memory.lineages.filter(item => item.id !== chosen.id)) assert.ok(counts.get(chosen.id) > counts.get(rejected.id) * 3);
  for (let i = 0; i < 100; i++) {
    const child = game.randomGenome(chosen.genome);
    for (const key of Object.keys(child)) {
      assert.ok(Number.isFinite(child[key]));
      assert.ok(Math.abs(child[key] - chosen.genome[key]) <= .120001);
    }
  }
});

test('defence reduces contact damage, HP depletion frees the same placement slot', () => {
  function damage(defence) {
    const { game } = boot(); game.selectOffer(game.state.offers[0]);
    const friend = game.state.friends[0]; friend.genome.defence = defence; friend.cooldown = 100;
    game.state.enemies.push({ x: friend.x, y: friend.y, hp: 1000, maxHp: 1000, phase: 0, hit: 0, speed: 20, drift: 0 });
    const before = friend.hp; game.update(.1);
    return before - friend.hp;
  }
  assert.ok(damage(.9) < damage(.1));
  const { game } = boot(); game.selectOffer(game.state.offers[0]); game.selectOffer(game.state.offers[0]);
  const first = game.state.friends[0]; first.hp = .001;
  game.state.enemies.push({ x: first.x, y: first.y, hp: 1000, maxHp: 1000, phase: 0, hit: 0, speed: 20, drift: 0 });
  game.update(.1);
  assert.equal(game.state.friends.length, 1);
  game.selectOffer(game.state.offers[0]);
  assert.equal(game.state.friends.length, 2);
  assert.equal(new Set(game.state.friends.map(friend => friend.slot)).size, 2);
  assert.notEqual(game.state.friends[0].slot, game.state.friends[1].slot);
});

test('reload preserves preferences; corrupt or blocked storage keeps the game playable', () => {
  const original = boot(); original.game.selectOffer(original.game.state.offers[0]);
  const reloaded = boot(original.stored());
  assert.equal(reloaded.game.memory.lineages.length, 1);
  // GEN is lineage depth now: planting a founder puts you at generation 1.
  assert.equal(reloaded.game.state.generation, 1);
  assert.equal(reloaded.game.memory.lineages[0].depth, 0);
  for (const input of ['{broken', '{}', JSON.stringify({ lineages: [{ emoji: '<script>' }], generation: -2 })]) {
    const { game } = boot(input); game.selectOffer(game.state.offers[0]); assert.equal(game.state.friends.length, 1);
  }
  const blocked = boot(null, true); blocked.game.selectOffer(blocked.game.state.offers[0]);
  assert.match(blocked.elements.get('#memory-status').textContent, /session only/);
});

test('pause, background tabs, game over and replay keep state coherent', () => {
  const { game, context, elements } = boot(); game.selectOffer(game.state.offers[0]);
  elements.get('#pause').events.click(); game.update(5); assert.equal(game.state.time, 0);
  elements.get('#pause').events.click(); context.document.hidden = true; game.update(5); assert.equal(game.state.time, 0);
  context.document.hidden = false;
  game.state.health = 1;
  game.state.enemies.push({ x: 24, y: 610, hp: 100, maxHp: 100, phase: 0, hit: 0, speed: 20, drift: 0 });
  game.update(.1); assert.equal(game.state.over, true); assert.equal(game.state.health, 0);
  const sparks = game.state.sparks; elements.get('#reroll').events.click(); assert.equal(game.state.sparks, sparks);
  game.start(); assert.equal(game.state.health, 10); assert.equal(game.state.over, false); assert.equal(game.memory.lineages.length, 1);
});

test('retina scaling uses logical coordinates and attackers are Kangxi radicals', () => {
  const { game, elements } = boot(); game.selectOffer(game.state.offers[0]);
  const canvas = elements.get('#arena'); assert.equal(canvas.width, 1440);
  const oldX = game.state.friends[0].x;
  canvas.getBoundingClientRect = () => ({ width: 360, height: 440 }); game.resize();
  assert.equal(canvas.width, 720); assert.equal(game.state.friends[0].x, oldX / 2);
  game.draw();
  assert.ok(game.RADICALS.every(char => char.codePointAt(0) >= 0x2F00 && char.codePointAt(0) <= 0x2FD5));
  assert.equal(new Set(game.EMOJI).size, game.EMOJI.length);
});

test('shuffling cannot spend the final spark before the first recruitment', () => {
  const { game, elements } = boot();
  for (let i = 0; i < 10; i++) elements.get('#reroll').events.click();
  assert.equal(game.state.sparks, 1);
  assert.equal(elements.get('#reroll').disabled, true);
  game.selectOffer(game.state.offers[0]);
  assert.equal(game.state.started, true);
  assert.equal(game.state.friends.length, 1);
});

test('garden holds one row of sixteen friends and rejects extra recruits before and after mobile resize', () => {
  const { game, elements } = boot(); game.state.sparks = 20;
  for (let i = 0; i < 17; i++) game.selectOffer(game.state.offers[0]);
  assert.equal(game.state.friends.length, 16);
  assert.equal(game.state.sparks, 4);
  assert.ok(elements.get('#choices').children.every(button => button.disabled));
  function checkRows(height) {
    const rows = [...new Set(game.state.friends.map(friend => friend.y))].sort((a, b) => a - b);
    assert.equal(rows.length, 1);
    assert.equal(new Set(game.state.friends.map(friend => friend.x)).size, 16);
    assert.ok(Math.abs(rows[0] / height - .83) < .000001);
  }
  checkRows(610);
  elements.get('#arena').getBoundingClientRect = () => ({ width: 368, height: 440 }); game.resize();
  checkRows(440);
});

test('shovel mode removes a planted friend and frees its exact slot without refunding a spark', () => {
  const { game, elements } = boot(); game.selectOffer(game.state.offers[0]); game.selectOffer(game.state.offers[0]);
  const planted = game.state.friends[0]; const slot = planted.slot; const sparks = game.state.sparks;
  elements.get('#shovel').events.click();
  assert.equal(game.state.shovelMode, true);
  elements.get('#arena').events.pointerdown({ clientX: planted.x, clientY: planted.y });
  assert.equal(game.state.shovelMode, false);
  assert.equal(game.state.friends.some(friend => friend.slot === slot), false);
  assert.equal(game.state.sparks, sparks);
  game.selectOffer(game.state.offers[0]);
  assert.equal(game.state.friends.length, 2);
  assert.equal(new Set(game.state.friends.map(friend => friend.slot)).size, 2);
});

test('new friends choose available planting slots in a random order', () => {
  const { game } = boot(); game.state.sparks = 8;
  for (let i = 0; i < 7; i++) game.selectOffer(game.state.offers[0]);
  const slots = game.state.friends.map(friend => friend.slot);
  assert.equal(new Set(slots).size, 7);
  assert.notDeepEqual(slots.slice(0, 4), [0, 1, 2, 3]);
});

test('planted friends generate clickable Nectar that returns one Spark', () => {
  const { game, elements } = boot(); game.selectOffer(game.state.offers[0]);
  const friend = game.state.friends[0]; friend.nectarTimer = .01;
  game.update(.02);
  assert.equal(game.state.nectarDrops.length, 1);
  assert.equal(game.state.nectar, 0);
  const drop = game.state.nectarDrops[0];
  elements.get('#arena').events.pointerdown({ clientX: drop.x, clientY: drop.y });
  assert.equal(game.state.nectarDrops.length, 0);
  assert.equal(game.state.nectar, 1);
  assert.equal(game.state.sparks, 3);
});

test('radicals use meaning colours and remain visible across every radical type', () => {
  const { game, elements, drawnText } = boot();
  game.RADICALS.forEach((char, index) => game.state.enemies.push({
    char, x: 60 + (index % 8) * 80, y: 60 + Math.floor(index / 8) * 70, size: 40, hp: 10, maxHp: 10, phase: 0, hit: 0 }));
  game.draw();
  assert.equal(game.RADICALS.length, 214);
  assert.equal(new Set(game.RADICALS).size, 214);
  // Every radical is visually distinct now, not just the fourteen hand-coloured ones.
  assert.equal(new Set(game.RADICALS.map(game.radicalColor)).size, 214);
  assert.ok(elements.get('#arena'));
  assert.ok(drawnText.some(([text]) => text === 'WATER'));
  assert.ok(drawnText.some(([text]) => text === 'FIRE'));
});

test('campaign ends cleanly after the 300th level win', () => {
  const { game, elements } = boot(); game.selectOffer(game.state.offers[0]);
  game.state.wave = game.MAX_LEVEL; game.state.spawnLeft = 0; game.state.enemies.length = 0;
  game.update(.01);
  assert.equal(game.state.wavePause > 0, true);
  game.update(3.3);
  assert.equal(game.state.complete, true);
  assert.equal(game.state.over, true);
  assert.equal(elements.get('#victory-caption').textContent, 'All 300 levels won!');
});

test('planted emoji use opaque ink even after fading particles were drawn', () => {
  const { game, textStyles } = boot(); game.selectOffer(game.state.offers[0]);
  const emoji = game.state.friends[0].emoji;
  game.state.particles.push({ x: 10, y: 10, size: 3, life: .1, color: '#ffffff' });
  game.draw(); game.draw();
  const specimens = textStyles.filter(item => item.text === emoji);
  assert.equal(specimens.length, 2);
  assert.ok(specimens.every(item => item.alpha === 1 && item.fillStyle === '#17221c'));
});

test('friends shoot past the old maximum range while inherited range still limits targeting', () => {
  function firesAt(distance, rangeGene) {
    const { game } = boot(); game.selectOffer(game.state.offers[0]);
    const friend = game.state.friends[0]; friend.genome.range = rangeGene; friend.cooldown = 0;
    game.state.enemies.push({ char: '⽕', x: friend.x, y: friend.y - distance, hp: 1000, maxHp: 1000, phase: 0, hit: 0, speed: 0, drift: 0 });
    game.update(.01);
    return game.state.projectiles.length > 0;
  }
  assert.equal(firesAt(285, .08), true);
  assert.equal(firesAt(420, .08), false);
  assert.equal(firesAt(420, .95), true);
  assert.equal(firesAt(510, .95), false);
});

test('semantic counters apply to real projectiles: water rapidly defeats fire, neutral matchups stay normal', () => {
  const { game } = boot();
  assert.equal(game.affinity('💧'), 'water');
  assert.equal(game.damageMultiplier('💧', '⽕'), 2.5);
  assert.equal(game.damageMultiplier('🔥', '⽊'), 2.5);
  assert.equal(game.damageMultiplier('🌱', '⽔'), 2.5);
  assert.equal(game.damageMultiplier('🍋', '⽕'), 1);
  assert.equal(game.damageMultiplier('💧', '⼈'), 1);
  const offer = game.state.offers[0]; offer.emoji = '💧'; offer.genome.power = .5;
  game.selectOffer(offer); const friend = game.state.friends[0]; friend.cooldown = 0;
  const fire = { char: '⽕', x: friend.x, y: friend.y - 20, hp: 25, maxHp: 25, phase: 0, hit: 0, speed: 0, drift: 0 };
  game.state.enemies.push(fire); game.update(.01);
  assert.equal(game.state.enemies.includes(fire), false);
  assert.ok(game.state.particles.some(particle => particle.text === '2.5×!'));
});

test('each attacker has a readable English label that stays inside a mobile canvas', () => {
  const { game, elements, drawnText } = boot();
  elements.get('#arena').getBoundingClientRect = () => ({ width: 298, height: 440 }); game.resize();
  game.RADICALS.forEach((char, index) => game.state.enemies.push({
    char, x: 5, y: 40 + index * 30, size: 40, hp: 10, maxHp: 10, phase: 0, hit: 0 }));
  game.draw();
  const labels = drawnText.filter(([text]) => /^[A-Z][A-Z ]*$/.test(text));
  assert.equal(labels.length, game.RADICALS.length);
  assert.ok(labels.some(([text]) => text === 'FIRE'));
  assert.ok(labels.some(([text]) => text === 'WATER'));
  // Still clamped inside a narrow canvas...
  for (const [text, x] of labels) { assert.ok(x >= text.length * 3); assert.ok(x <= 298 - text.length * 3); }
  // ...and no two labels are printed on top of each other any more.
  const placed = labels.map(([text, x, y]) => ({ w: text.length * 6 + 8, x, y }));
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
    const a = placed[i], b = placed[j];
    assert.ok(Math.abs(a.y - b.y) >= 13 || Math.abs(a.x - b.x) >= (a.w + b.w) / 2,
      `labels overlap at ${a.x},${a.y}`);
  }
});

test('giant celebration plays only on a level win, pauses safely, and ends before the next level', () => {
  const { game, elements, context } = boot();
  const victory = elements.get('#victory');
  game.selectOffer(game.state.offers[0]);
  assert.equal(victory.hidden, true, 'Recruitment must not trigger a giant animation');
  game.state.spawnLeft = 0;
  game.state.enemies.push({ char: '⽕', x: 350, y: 0, hp: 1000, phase: 0, speed: 0, drift: 0 });
  game.update(.01);
  assert.equal(victory.hidden, true, 'The last enemy must be defeated first');
  game.state.enemies.length = 0;
  game.update(.01);
  assert.equal(victory.hidden, false);
  assert.equal(elements.get('#victory-caption').textContent, 'Level 1 won!');
  assert.equal(game.state.celebrating, true);
  assert.equal(game.emotionFor(game.state.friends[0]), 'joy');
  game.state.paused = true; game.update(5);
  assert.equal(game.state.wave, 1);
  game.state.paused = false; context.document.hidden = true; game.update(5);
  assert.equal(game.state.wave, 1);
  context.document.hidden = false; game.update(3.3);
  assert.equal(victory.hidden, true);
  assert.equal(game.state.celebrating, false);
  assert.equal(game.state.wave, 2);
  // The new level waits for a fresh draft rather than carrying the garden over.
  assert.match(elements.get('#garden-label').textContent, /Level 2 · choose your garden/);
  // Level 2 starts empty and does not run until it is planted, so clearing it
  // requires a garden first.
  game.selectOffer(game.state.offers[0]);
  game.state.spawnLeft = 0; game.state.enemies.length = 0; game.update(.01);
  assert.equal(elements.get('#victory-caption').textContent, 'Level 2 won!');
  game.start();
  assert.equal(victory.hidden, true);
  assert.equal(game.state.wave, 1);
  game.selectOffer(game.state.offers[0]); game.state.health = 1;
  game.state.enemies.push({ char: '⽕', x: 24, y: 610, hp: 100, phase: 0, speed: 0, drift: 0 });
  game.update(.01);
  assert.equal(game.state.over, true);
  assert.equal(victory.hidden, true, 'Losing must not trigger a victory animation');
});

test('all emoji have preview faces and react to attacks, nearby enemies, and low HP', () => {
  const { game, elements } = boot();
  const offer = game.state.offers[0];
  for (const emoji of game.EMOJI) {
    offer.emoji = emoji; game.renderOffers();
    const card = elements.get('#choices').children[0];
    // The preview is a canvas painted by drawEmojiFace, not a separate CSS drawing.
    const specimen = card.children.find(child => child.className === 'specimen');
    assert.ok(specimen, `${emoji} needs a specimen`);
    assert.ok(specimen.children.some(child => child.className === 'specimen-art'),
      `${emoji} preview must be a canvas`);
    assert.match(String(specimen['data-emotion']), /^(happy|curious|determined)$/);
    for (const mood of ['happy', 'curious', 'determined', 'scared', 'hurt', 'joy']) {
      let mouthCurves = 0;
      const pen = new Proxy({}, { get: (_, key) => ['ellipse', 'rect', 'quadraticCurveTo'].includes(key) ? () => mouthCurves++ : () => {} });
      game.drawEmojiFace(pen, offer, mood);
      assert.ok(mouthCurves >= 3, `${emoji} needs eyes and a mouth for ${mood}`);
    }
  }
  game.selectOffer(offer); const friend = game.state.friends[0];
  friend.attackFace = .3; assert.equal(game.emotionFor(friend), 'determined');
  friend.attackFace = 0; friend.hurtFace = .4; assert.equal(game.emotionFor(friend), 'hurt');
  friend.hurtFace = 0; friend.hp = 1; assert.equal(game.emotionFor(friend), 'scared');
  friend.hp = friend.maxHp;
  game.state.enemies.push({ x: friend.x, y: friend.y - 80 });
  assert.equal(game.emotionFor(friend), 'scared');
});

test('every radical has an English name and a widely-supported CJK glyph, never a number', () => {
  const { game } = boot();
  assert.equal(game.RADICALS.length, 214);
  for (const radical of game.RADICALS) {
    const label = game.radicalLabel(radical);
    assert.match(label, /^[a-z][a-z ]*$/, `${radical} must have a word for a name`);
    assert.doesNotMatch(label, /\d/, `${radical} must not fall back to a number`);
    // Drawn as the ordinary CJK ideograph, not the U+2F00 compatibility character.
    const glyph = game.radicalGlyph(radical);
    assert.equal(glyph.length, 1);
    assert.ok(glyph.codePointAt(0) < 0x2F00 || glyph.codePointAt(0) > 0x2FD5, `${radical} should draw as CJK`);
  }
  assert.equal(game.radicalLabel('\u2F55'), 'fire');
  assert.equal(game.radicalGlyph('\u2F55'), '\u706b');
  assert.equal(new Set(game.RADICALS.map(game.radicalColor)).size, 214, 'each radical needs its own colour');
});

test('a consistent player breeds their preference without collapsing the pool to one species', () => {
  const { game } = boot();
  for (let i = 0; i < 1200; i++) {
    game.state.sparks = 50; game.state.friends.length = 0;
    game.selectOffer([...game.state.offers].sort((a, b) => b.genome.bounce - a.genome.bounce)[0]);
    if (i % 6 === 0) game.decayLineages();
  }
  const pool = game.memory.lineages;
  const offeredBounce = game.state.offers.reduce((sum, o) => sum + o.genome.bounce, 0) / 3;
  // Selection still works: the preferred gene is driven towards its ceiling.
  assert.ok(offeredBounce > .8, `preference should be bred in, got ${offeredBounce}`);
  // ...but the pool must not become a monoculture, which is what used to happen.
  assert.ok(pool.length > 1);
  assert.ok(new Set(pool.map(item => item.emoji)).size >= 10,
    `expected many species to survive, got ${new Set(pool.map(item => item.emoji)).size}`);
  // No emoji may hoard the pool.
  const counts = new Map();
  for (const item of pool) counts.set(item.emoji, (counts.get(item.emoji) || 0) + 1);
  assert.ok(Math.max(...counts.values()) <= 4);
});

test('a hidden or unlaid-out canvas never destroys the garden', () => {
  const { game, elements } = boot();
  game.selectOffer(game.state.offers[0]);
  const before = game.state.friends[0].x;
  // A zero-sized layout pass used to scale every position by width/0 -> NaN,
  // losing the whole garden for the rest of the run.
  elements.get('#arena').getBoundingClientRect = () => ({ width: 0, height: 0 });
  game.resize();
  assert.equal(game.state.friends[0].x, before, 'positions must survive a 0x0 layout');
  elements.get('#arena').getBoundingClientRect = () => ({ width: 360, height: 440 });
  game.resize();
  assert.ok(Number.isFinite(game.state.friends[0].x));
  assert.equal(game.state.friends[0].x, before / 2);
  game.draw();
});

test('the card preview is painted by the same routine as the arena, from the same genome', () => {
  const { game } = boot();
  const offer = game.state.offers[0];
  game.renderOffers();
  // Record every drawing call the preview makes...
  const calls = [];
  const spy = new Proxy({}, { get: (_, key) => (...args) => calls.push([String(key), ...args]) });
  offer.art.getContext = () => spy;
  game.drawOfferPreviews(0);
  assert.ok(calls.length > 0, 'the preview must actually draw');
  assert.ok(calls.some(([key, text]) => key === 'fillText' && text === offer.emoji),
    'the preview draws the emoji body');

  // ...and compare against drawing the same offer straight through drawEmojiFace.
  const direct = [];
  const directSpy = new Proxy({}, { get: (_, key) => (...args) => direct.push(String(key)) });
  game.drawEmojiFace(directSpy, offer, game.previewEmotion(offer));
  const previewOps = calls.map(([key]) => key);
  for (const op of new Set(direct)) {
    assert.ok(previewOps.includes(op), `preview is missing ${op} that the arena draws`);
  }
});

test('the tray always offers a real choice, never the same lineage three times', () => {
  const { game } = boot();
  for (let round = 0; round < 60; round++) {
    game.state.sparks = 50; game.state.friends.length = 0;
    const species = new Set(game.state.offers.map(offer => offer.emoji));
    assert.equal(species.size, 3, `round ${round} offered ${species.size} distinct emoji`);
    // Keep picking the same favourite; the tray must still show alternatives.
    game.selectOffer(game.state.offers[0]);
  }
});

test('every level starts with an empty garden and waits for you to plant it', () => {
  const { game } = boot();
  game.state.sparks = 8;
  game.selectOffer(game.state.offers[0]);
  game.selectOffer(game.state.offers[0]);
  assert.equal(game.state.friends.length, 2);
  assert.equal(game.state.started, true);

  // Clear the level.
  game.state.spawnLeft = 0; game.state.enemies.length = 0;
  game.update(.01);
  assert.equal(game.state.celebrating, true);
  game.update(3.3);

  assert.equal(game.state.wave, 2);
  assert.equal(game.state.friends.length, 0, 'the garden must not carry over');
  assert.equal(game.state.started, false, 'the level must wait for a fresh draft');
  assert.equal(game.state.shovelMode, false);

  // Nothing may spawn, and no time may pass, while the player is still choosing.
  const frozenAt = game.state.time;
  game.update(30);
  assert.equal(game.state.enemies.length, 0, 'no radical may arrive before you plant');
  assert.equal(game.state.time, frozenAt, 'the level clock must not run while drafting');

  // Planting starts the level.
  game.selectOffer(game.state.offers[0]);
  assert.equal(game.state.started, true);
  game.update(3);
  assert.ok(game.state.enemies.length > 0, 'the wave starts once the garden is planted');
});

test('the spark allowance keeps pace with the level so a wiped garden is replantable', () => {
  const { game } = boot();
  for (let level = 1; level < 14; level++) {
    game.state.sparks = 0;                       // spend everything every level
    game.state.friends.length = 0;
    game.state.started = true;
    game.state.spawnLeft = 0; game.state.enemies.length = 0;
    game.update(.01); game.update(3.3);
    assert.equal(game.state.wave, level + 1);
    assert.ok(game.state.sparks >= Math.min(16, 2 + game.state.wave),
      `level ${game.state.wave} granted only ${game.state.sparks} sparks`);
    assert.ok(game.state.sparks <= 16);
  }
});
