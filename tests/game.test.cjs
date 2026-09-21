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
    'start(); globalThis.game = { get state() { return state; }, get memory() { return memory; }, selectOffer, randomGenome, chooseParent, rememberChoices, update, resize, draw, start, renderOffers, emotionFor, drawEmojiFace, EMOJI, RADICALS, RADICAL_FAMILIES, RADICAL_FAMILY, radicalFamily, MAX_LEVEL, affinity, damageMultiplier, radicalLabel, radicalGlyph, radicalColor, decayLineages, drawOfferPreviews, previewEmotion, roleOf, ROLES, growFriend, GROW_COSTS, MAX_TIER, HIT_FLASH, faceFit, drawShot };');
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

test('Nectar sinks to the bottom centre and banks itself without being chased', () => {
  const { game } = boot(); game.selectOffer(game.state.offers[0]);
  const friend = game.state.friends[0]; friend.nectarTimer = .01;
  game.update(.02);
  assert.equal(game.state.nectarDrops.length, 1);
  assert.equal(game.state.nectar, 0);
  const drop = game.state.nectarDrops[0];
  const startX = drop.x, startY = drop.y;

  // It hovers over the friend first, so you can see where it came from.
  game.update(.2);
  assert.equal(game.state.nectarDrops.length, 1, 'it should linger briefly before leaving');
  assert.ok(Math.abs(drop.x - startX) < 1, 'and not set off sideways yet');

  // Then it sinks toward the bottom centre on its own. Step in real frames rather
  // than one big dt: the hover has to elapse first, and the trip is then short
  // enough that a single large step would bank it before we could look.
  const centre = 791 / 2;   // the harness canvas is 791 wide
  for (let i = 0; i < 22; i++) game.update(1 / 60);
  assert.equal(game.state.nectarDrops.length, 1, 'still in flight');
  assert.ok(drop.y > startY, 'it must travel downward');
  assert.ok(Math.abs(drop.x - centre) < Math.abs(startX - centre),
    'and move toward the centre');

  // And banks itself, with no tap anywhere.
  const sparks = game.state.sparks;
  for (let i = 0; i < 300 && game.state.nectarDrops.length; i++) game.update(1 / 60);
  assert.equal(game.state.nectarDrops.length, 0, 'it must collect itself');
  assert.equal(game.state.nectar, 1);
  assert.equal(game.state.sparks, sparks + 1);
});

test('a tap on the field can only ever mean "grow this friend"', () => {
  const { game, elements } = boot();
  game.state.sparks = 8;
  game.selectOffer(game.state.offers[0]);
  const friend = game.state.friends[0];
  // A drop drifting over the friend must not steal the tap any more.
  game.state.nectarDrops.push({ x: friend.x, y: friend.y, baseY: friend.y, age: 0, speed: 0, color: '#fff' });
  const nectar = game.state.nectar;
  elements.get('#arena').events.pointerdown({ clientX: friend.x, clientY: friend.y });
  assert.equal(friend.tier, 2, 'the tap must grow the friend');
  assert.equal(game.state.nectar, nectar, 'and must not pocket the drop instead');
});

test('radicals use meaning colours and remain visible across every radical type', () => {
  const { game, elements, drawnText } = boot();
  game.RADICALS.forEach((char, index) => game.state.enemies.push({
    char, x: 60 + (index % 8) * 80, y: 60 + Math.floor(index / 8) * 70, size: 40, hp: 10, maxHp: 10, phase: 0, hit: 0 }));
  game.draw();
  assert.equal(game.RADICALS.length, 214);
  assert.equal(new Set(game.RADICALS).size, 214);
  // Colour carries meaning rather than being a per-radical fingerprint, so members
  // of a family deliberately share a hue. What must hold is that the meaning is
  // right - the old scheme gave 赤 "red" a purple and 黑 "black" a yellow.
  const hueOf = radical => Number(game.radicalColor(radical).match(/hsl\((\d+(?:\.\d+)?)/)[1]);
  const byName = new Map(game.RADICALS.map(r => [game.radicalLabel(r), r]));
  const near = (hue, target, slack = 22) => Math.min(Math.abs(hue - target), 360 - Math.abs(hue - target)) <= slack;

  assert.ok(near(hueOf(byName.get('red')), 0), 'red must be red');
  assert.ok(near(hueOf(byName.get('yellow')), 45), 'yellow must be yellow');
  assert.ok(near(hueOf(byName.get('blue')), 200, 30), 'blue must be blue');
  assert.ok(near(hueOf(byName.get('gold')), 45), 'gold must be gold, not steel');
  // Black is dark and white is light, whatever their hue.
  const lightOf = radical => Number(game.radicalColor(radical).match(/([\d.]+)%\)$/)[1]);
  assert.ok(lightOf(byName.get('black')) < 32, 'black must be dark');
  assert.ok(lightOf(byName.get('white')) > 68, 'white must be light');

  // Things that mean the same sort of thing look alike.
  for (const group of [['water', 'rain', 'river'], ['tree', 'bamboo', 'grass'], ['horse', 'bird', 'fish']]) {
    const hues = group.map(n => hueOf(byName.get(n)));
    assert.ok(hues.every(h => near(h, hues[0], 8)), `${group} should share a hue, got ${hues}`);
  }
  // Fire and water must not be confusable.
  assert.ok(!near(hueOf(byName.get('fire')), hueOf(byName.get('water')), 60));
  // And there is still real variety on screen.
  assert.ok(new Set(game.RADICALS.map(game.radicalColor)).size > 60);
  assert.ok(new Set(game.RADICALS.map(r => game.radicalFamily(r).name)).size >= 20);
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
    const friend = game.state.friends[0];
    // Range is multiplied by the role, so pin the plain shooter to test the gene.
    friend.role = 'sprout'; friend.genome.range = rangeGene; friend.cooldown = 0;
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
  game.selectOffer(offer); const friend = game.state.friends[0];
  friend.role = 'sprout';   // damage is multiplied by the role; test the counter, not the job
  friend.cooldown = 0;
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
  // The garden is unplanted the moment the level is won, so there is no friend
  // left on the field; the celebration's own character is what wears the grin.
  assert.equal(game.state.friends.length, 0);
  assert.equal(game.emotionFor({ genome: {}, hp: 1, maxHp: 1, attackFace: 0, hurtFace: 0 }), 'joy');
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
  assert.ok(game.RADICALS.every(r => /^hsl\(/.test(game.radicalColor(r))), 'each radical needs a colour');
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

test('winning a level unplants the garden immediately, not after the celebration', () => {
  const { game, elements } = boot();
  game.state.sparks = 8;
  game.selectOffer(game.state.offers[0]);
  game.selectOffer(game.state.offers[0]);
  game.state.projectiles.push({ x: 0, y: 0, target: null, speed: 1, damage: 1, multiplier: 1, color: '#fff' });
  game.state.nectarDrops.push({ x: 0, y: 0, baseY: 0, age: 0, life: 12, color: '#fff' });
  assert.equal(game.state.friends.length, 2);

  game.state.spawnLeft = 0; game.state.enemies.length = 0;
  game.update(.01);

  // Mid-celebration: the level is still on screen, but the garden is already gone.
  assert.equal(game.state.celebrating, true);
  assert.equal(game.state.wave, 1, 'still showing the level that was just won');
  assert.equal(game.state.friends.length, 0, 'the garden unplants on the win');
  assert.equal(game.state.projectiles.length, 0);
  assert.equal(game.state.nectarDrops.length, 0);
  assert.equal(game.state.shovelMode, false);
  // The celebration still names the level it belongs to.
  assert.equal(elements.get('#victory-caption').textContent, 'Level 1 won!');
});

test('the tray is locked while the victory character is on screen', () => {
  const { game, elements } = boot();
  game.state.sparks = 8;
  game.selectOffer(game.state.offers[0]);
  game.state.spawnLeft = 0; game.state.enemies.length = 0;
  game.update(.01);
  assert.equal(game.state.celebrating, true);
  assert.equal(game.state.friends.length, 0);

  // Recruiting between levels used to plant into the level that had just been won.
  const sparks = game.state.sparks;
  game.selectOffer(game.state.offers[0]);
  assert.equal(game.state.friends.length, 0, 'nothing may be planted mid-celebration');
  assert.equal(game.state.sparks, sparks, 'and no spark may be spent');

  // The cards and the shuffle button say so, rather than silently doing nothing.
  assert.ok(elements.get('#choices').children.every(button => button.disabled));
  assert.equal(elements.get('#reroll').disabled, true);
  const shuffled = game.state.offers.map(offer => offer.id);
  elements.get('#reroll').events.click();
  assert.deepEqual(game.state.offers.map(offer => offer.id), shuffled, 'shuffle is locked too');

  // Once the celebration is over the tray reopens and the level waits to be planted.
  game.update(3.3);
  assert.equal(game.state.wave, 2);
  assert.equal(game.state.celebrating, false);
  assert.equal(game.state.started, false);
  assert.ok(elements.get('#choices').children.some(button => !button.disabled));
  game.selectOffer(game.state.offers[0]);
  assert.equal(game.state.friends.length, 1);
  assert.equal(game.state.started, true);
});
test('the shovel digs up the friend nearest the tap, not the first one in the list', () => {
  const { game, elements } = boot();
  game.state.sparks = 30;
  for (let i = 0; i < 12; i++) game.selectOffer(game.state.offers[0]);
  const planted = game.state.friends.slice();
  const reach = Math.max(24, 791 / 24);

  // Find a tap where two friends are both in reach but the nearer one is NOT the
  // one that comes first in state.friends - the case the old findIndex got wrong.
  let scenario = null;
  for (let i = 0; i < planted.length && !scenario; i++) {
    for (let j = i + 1; j < planted.length; j++) {
      const gap = Math.abs(planted[i].x - planted[j].x);
      if (gap >= reach * 2 || gap === 0) continue;
      // Tap just off the midpoint, towards the one later in the array.
      const x = (planted[i].x + planted[j].x) / 2 + Math.sign(planted[j].x - planted[i].x) * 2;
      const near = Math.abs(planted[i].x - x) < Math.abs(planted[j].x - x) ? planted[i] : planted[j];
      if (near === planted[j]) { scenario = { x, y: planted[j].y, near }; break; }
    }
  }
  assert.ok(scenario, 'expected an overlapping pair to test');

  elements.get('#shovel').events.click();
  elements.get('#arena').events.pointerdown({ clientX: scenario.x, clientY: scenario.y });
  const dug = planted.find(friend => !game.state.friends.includes(friend));
  assert.equal(dug, scenario.near, 'the nearest friend must be the one dug up');
});

test('an armed shovel never traps the player when the last friend dies', () => {
  const { game, elements } = boot();
  game.selectOffer(game.state.offers[0]);
  const friend = game.state.friends[0];
  elements.get('#shovel').events.click();
  assert.equal(game.state.shovelMode, true);

  // The last friend is eaten while the shovel is still out.
  game.state.enemies.push({ char: '\u2F55', x: friend.x, y: friend.y, hp: 9999, maxHp: 9999,
    phase: 0, hit: 0, speed: 20, drift: 0, size: 40 });
  friend.hp = .001;
  game.update(.1);

  assert.equal(game.state.friends.length, 0);
  assert.equal(game.state.shovelMode, false, 'the shovel must not stay armed over an empty garden');
  assert.equal(elements.get('#shovel').disabled, true, 'and the button must not look clickable');

  // Nectar banks itself regardless of what the shovel is doing, and the tap is
  // free again for its real job rather than being swallowed for the rest of the run.
  game.state.nectarDrops.push({ x: 300, y: 300, baseY: 300, age: 0, speed: 0, color: '#fff' });
  const sparks = game.state.sparks;
  for (let i = 0; i < 300 && game.state.nectarDrops.length; i++) game.update(1 / 60);
  assert.equal(game.state.nectarDrops.length, 0, 'Nectar must still be banked');
  assert.equal(game.state.sparks, sparks + 1);
  game.state.sparks = 8;
  game.selectOffer(game.state.offers[0]);
  const replanted = game.state.friends[0];
  elements.get('#arena').events.pointerdown({ clientX: replanted.x, clientY: replanted.y });
  assert.equal(replanted.tier, 2, 'taps work normally again');
});

test('the shovel can always be put away, even with nothing left to dig', () => {
  const { game, elements } = boot();
  game.selectOffer(game.state.offers[0]);
  elements.get('#shovel').events.click();
  assert.equal(game.state.shovelMode, true);
  game.state.friends.length = 0;          // the garden empties by any route
  elements.get('#shovel').events.click();
  assert.equal(game.state.shovelMode, false, 'putting the shovel away must never be blocked');
  // ...but it cannot be armed again with no garden to dig in.
  elements.get('#shovel').events.click();
  assert.equal(game.state.shovelMode, false);
});

test('a friend\'s job comes from a gene, so it is inherited and can mutate', () => {
  const { game } = boot();
  // Every job must be reachable from a fresh founder, not just in theory.
  const seen = new Set();
  for (let i = 0; i < 4000; i++) seen.add(game.roleOf(game.randomGenome()));
  assert.deepEqual([...seen].sort(), ['bulwark', 'frost', 'grower', 'lobber', 'sprout']);

  // A child keeps its parent's job: the role gene steps by at most .07 a
  // generation, which cannot cross a band from the middle of one. That is
  // deliberate - a job should be a stable trait, not a coin flip at every birth.
  const parent = { ...game.randomGenome(), role: .40 };   // mid-band grower
  assert.equal(game.roleOf(parent), 'grower');
  let same = 0;
  for (let i = 0; i < 400; i++) if (game.roleOf(game.randomGenome(parent)) === 'grower') same += 1;
  assert.equal(same, 400, 'a job must be stable across a single generation');

  // Over a lineage, though, it drifts - that is what makes the job selectable
  // rather than fixed at founding.
  let genome = { ...game.randomGenome(), role: .40 };
  const rolesSeen = new Set();
  for (let generation = 0; generation < 400; generation++) {
    genome = game.randomGenome(genome);
    rolesSeen.add(game.roleOf(genome));
  }
  assert.ok(rolesSeen.size > 1, `a job must be able to drift over generations, saw ${[...rolesSeen]}`);
});

test('each job actually behaves differently, not just scores differently', () => {
  function plant(role) {
    const { game } = boot();
    game.selectOffer(game.state.offers[0]);
    const friend = game.state.friends[0];
    friend.role = role;
    friend.maxHp = friend.hp = (35 + friend.genome.life * 80) * game.ROLES[role].hp;
    return { game, friend };
  }

  // Bulwark soaks: far more health from the same genome than a Sprout.
  const wall = plant('bulwark'), shot = plant('sprout');
  wall.friend.genome.life = shot.friend.genome.life;
  const hpOf = f => (35 + f.genome.life * 80);
  assert.ok(game_hp('bulwark', hpOf(wall.friend)) > game_hp('sprout', hpOf(shot.friend)) * 2);
  function game_hp(role, base) { return base * wall.game.ROLES[role].hp; }

  // Grower makes Nectar far faster than it fights.
  const grow = plant('grower');
  grow.friend.nectarTimer = .01;
  grow.game.update(.02);
  assert.equal(grow.game.state.nectarDrops.length, 1);
  assert.ok(grow.friend.nectarTimer < (5.5 - grow.friend.genome.speed * 2),
    'a Grower must refill its Nectar sooner than a plain friend');

  // Frost chills what it hits, so radicals crawl.
  const cold = plant('frost');
  cold.friend.cooldown = 0;
  const target = { char: '\u2F55', x: cold.friend.x, y: cold.friend.y - 60, hp: 9999, maxHp: 9999,
    phase: 0, hit: 0, speed: 60, drift: 0, size: 40 };
  cold.game.state.enemies.push(target);
  for (let i = 0; i < 90; i++) cold.game.update(1 / 60);
  assert.ok(target.chill > 0, 'a Frost shot must chill its target');

  // Lobber reaches over the front rank for the furthest radical in range.
  const lob = plant('lobber');
  lob.friend.cooldown = 0; lob.friend.genome.range = .95;
  const near = { char: '\u2F55', x: lob.friend.x, y: lob.friend.y - 60, hp: 9999, maxHp: 9999, phase: 0, hit: 0, speed: 0, drift: 0, size: 40 };
  const far = { char: '\u2F55', x: lob.friend.x, y: lob.friend.y - 260, hp: 9999, maxHp: 9999, phase: 0, hit: 0, speed: 0, drift: 0, size: 40 };
  lob.game.state.enemies.push(near, far);
  lob.game.update(.01);
  assert.equal(lob.game.state.projectiles.length, 1);
  assert.equal(lob.game.state.projectiles[0].target, far, 'a Lobber must aim past the front rank');
  assert.ok(lob.game.state.projectiles[0].splash > 0, 'and it must splash');
});

test('growing a friend costs sparks, makes it stronger, and tops out', () => {
  const { game } = boot();
  game.state.sparks = 12;
  game.selectOffer(game.state.offers[0]);
  const friend = game.state.friends[0];
  assert.equal(friend.tier, 1);

  const hp1 = friend.maxHp, sparks1 = game.state.sparks;
  friend.hp = 1;                                    // growing should mend it too
  assert.equal(game.growFriend(friend), true);
  assert.equal(friend.tier, 2);
  assert.equal(game.state.sparks, sparks1 - game.GROW_COSTS[1]);
  assert.ok(friend.maxHp > hp1, 'a grown friend must be tougher');
  assert.equal(friend.hp, friend.maxHp, 'and growing mends it');

  assert.equal(game.growFriend(friend), true);
  assert.equal(friend.tier, game.MAX_TIER);
  assert.equal(game.growFriend(friend), false, 'tier 3 is the ceiling');
  assert.equal(friend.tier, game.MAX_TIER);
});

test('growing is refused without the sparks, and counts as a vote for that lineage', () => {
  const { game } = boot();
  game.selectOffer(game.state.offers[0]);
  const friend = game.state.friends[0];
  const before = game.memory.lineages.find(item => item.id === friend.id).fitness;

  game.state.sparks = 0;
  assert.equal(game.growFriend(friend), false, 'no sparks, no growth');
  assert.equal(friend.tier, 1);

  game.state.sparks = 5;
  assert.equal(game.growFriend(friend), true);
  const after = game.memory.lineages.find(item => item.id === friend.id).fitness;
  assert.ok(after > before, 'investing sparks in a lineage should raise its fitness');
});

test('a radical keeps its own colour when hit or chilled - it only blinks', () => {
  const char = '\u2F55';                       // fire
  const own = (() => { const { game } = boot(); return game.radicalColor(char); })();

  function paint(mutate) {
    const { game, textStyles } = boot();
    const enemy = { char, x: 120, y: 120, size: 40, hp: 10, maxHp: 10, phase: 0, hit: 0, chill: 0 };
    mutate(enemy, game);
    game.state.enemies.push(enemy);
    textStyles.length = 0;
    game.draw();
    return textStyles.filter(item => item.text === game.radicalGlyph(char));
  }

  // Untouched: one draw, in its own colour.
  const calm = paint(() => {});
  assert.equal(calm.length, 1);
  assert.equal(calm[0].fillStyle, own);
  assert.equal(calm[0].alpha, 1);

  // Chilled for the full 2.6s: still its own colour, opaque. It used to be repainted
  // icy blue for the whole duration.
  const cold = paint(enemy => { enemy.chill = 2.6; });
  assert.equal(cold.length, 1);
  assert.equal(cold[0].fillStyle, own, 'a chilled radical must keep its colour');
  assert.equal(cold[0].alpha, 1);

  // Hit: the real colour is laid down first, with a translucent white blink over it.
  const hit = paint((enemy, game) => { enemy.hit = game.HIT_FLASH; });
  assert.equal(hit.length, 2, 'the blink is drawn on top, not instead');
  assert.equal(hit[0].fillStyle, own, 'the real colour is still painted');
  assert.equal(hit[0].alpha, 1);
  assert.equal(hit[1].fillStyle, '#ffffff');
  assert.ok(hit[1].alpha > 0 && hit[1].alpha < 1, 'the blink is translucent');

  // ...and it fades, so the real colour comes back rather than hanging around.
  const fading = paint((enemy, game) => { enemy.hit = game.HIT_FLASH * .25; });
  assert.ok(fading[1].alpha < hit[1].alpha, 'the blink must fade out');
});

test('measuring a glyph never paints on a context it cannot read back', () => {
  const { game, textStyles } = boot();
  // The harness's canvas double has no working getImageData. The measurement must
  // detect that and bail BEFORE drawing, or its probe stroke is indistinguishable
  // from a real one - which is exactly how it first showed up, as a planted emoji
  // appearing to be drawn three times instead of twice.
  textStyles.length = 0;
  const fit = game.faceFit('\uD83C\uDF4E');
  assert.equal(textStyles.length, 0, 'the probe must not draw when it cannot measure');
  assert.equal(fit, 1, 'and it must fall back to the unscaled face');

  // Whatever it returns is a usable scale, never zero or negative.
  for (const emoji of game.EMOJI.slice(0, 20)) {
    const value = game.faceFit(emoji);
    assert.ok(Number.isFinite(value) && value > 0 && value <= 1, `${emoji} -> ${value}`);
  }
});

test('a shot is a mini copy of its firer, with no face on it', () => {
  const { game } = boot();
  game.selectOffer(game.state.offers[0]);
  const friend = game.state.friends[0];
  friend.role = 'sprout'; friend.cooldown = 0;
  game.state.enemies.push({ char: '\u2F55', x: friend.x, y: friend.y - 60, hp: 9999, maxHp: 9999,
    phase: 0, hit: 0, speed: 0, drift: 0, size: 40 });
  game.update(.01);
  assert.equal(game.state.projectiles.length, 1);
  const shot = game.state.projectiles[0];
  assert.equal(shot.emoji, friend.emoji, 'the shot carries the firer\'s emoji');

  // Record everything drawShot does.
  const calls = [];
  const pen = new Proxy({}, {
    get: (_, key) => key === 'fillStyle' || key === 'font' || key === 'globalAlpha'
      ? undefined
      : (...args) => calls.push([String(key), ...args]),
    set: (target, key, value) => { calls.push(['SET ' + String(key), value]); return true; }
  });
  game.drawShot(shot, pen);

  const texts = calls.filter(([k]) => k === 'fillText').map(([, text]) => text);
  assert.deepEqual(texts, [friend.emoji], 'it draws the emoji, once, and nothing else');
  // The face routine paints the eye whites white; a shot must never do that.
  const fills = calls.filter(([k]) => k === 'SET fillStyle').map(([, v]) => v);
  assert.ok(!fills.includes('white'), 'no eye whites - a shot has no face');
  assert.ok(!fills.includes('#ff879b'), 'and no mouth');
  // No eye or mouth geometry either.
  assert.equal(calls.filter(([k]) => k === 'quadraticCurveTo').length, 0, 'no mouth curve');
  assert.ok(calls.filter(([k]) => k === 'ellipse').length === 0, 'no eye ellipses');
});
