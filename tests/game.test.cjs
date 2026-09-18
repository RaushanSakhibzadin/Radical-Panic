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
      addEventListener(type, handler) { this.events[type] = handler; }, setAttribute() {},
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
    'start(); globalThis.game = { get state() { return state; }, get memory() { return memory; }, selectOffer, randomGenome, chooseParent, rememberChoices, update, resize, draw, start, EMOJI, RADICALS, affinity, damageMultiplier };');
  vm.runInContext(source, context);
  return { game: context.game, elements, context, drawnText, textStyles, stored: () => stored };
}

test('waits for first recruitment, then spends one spark and remembers all visible candidates', () => {
  const { game } = boot();
  game.update(30);
  assert.equal(game.state.enemies.length, 0);
  const chosen = game.state.offers[0];
  game.selectOffer(chosen);
  assert.equal(game.state.sparks, 2);
  assert.equal(game.state.friends.length, 1);
  assert.equal(game.memory.lineages.length, 3);
  assert.equal(game.memory.lineages.find(item => item.id === chosen.id).fitness, 1.6);
  assert.equal(game.memory.lineages.filter(item => item.fitness === .25).length, 2);
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
  assert.equal(game.state.friends[1].slot, first.slot);
  assert.notEqual(game.state.friends[0].slot, game.state.friends[1].slot);
});

test('reload preserves preferences; corrupt or blocked storage keeps the game playable', () => {
  const original = boot(); original.game.selectOffer(original.game.state.offers[0]);
  const reloaded = boot(original.stored());
  assert.equal(reloaded.game.memory.lineages.length, 3);
  assert.equal(reloaded.game.state.generation, 2);
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
  game.start(); assert.equal(game.state.health, 10); assert.equal(game.state.over, false); assert.equal(game.memory.lineages.length, 3);
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

test('garden holds one row of four friends and rejects extra recruits before and after mobile resize', () => {
  const { game, elements } = boot(); game.state.sparks = 20;
  for (let i = 0; i < 5; i++) game.selectOffer(game.state.offers[0]);
  assert.equal(game.state.friends.length, 4);
  assert.equal(game.state.sparks, 16);
  assert.ok(elements.get('#choices').children.every(button => button.disabled));
  function checkRows(height) {
    const rows = [...new Set(game.state.friends.map(friend => friend.y))].sort((a, b) => a - b);
    assert.equal(rows.length, 1);
    assert.equal(new Set(game.state.friends.map(friend => friend.x)).size, 4);
    assert.ok(Math.abs(rows[0] / height - .83) < .000001);
  }
  checkRows(610);
  elements.get('#arena').getBoundingClientRect = () => ({ width: 368, height: 440 }); game.resize();
  checkRows(440);
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
  for (const char of game.RADICALS) game.state.enemies.push({ char, x: 5, y: 100, size: 40, hp: 10, maxHp: 10, phase: 0, hit: 0 });
  game.draw();
  const labels = drawnText.filter(([text]) => /^[A-Z]+$/.test(text));
  assert.equal(labels.length, game.RADICALS.length);
  assert.ok(labels.some(([text]) => text === 'FIRE'));
  assert.ok(labels.some(([text]) => text === 'WATER'));
  for (const [text, x, y] of labels) { assert.ok(x >= text.length * 3); assert.ok(x <= 298 - text.length * 3); assert.ok(y > 100); }
});
