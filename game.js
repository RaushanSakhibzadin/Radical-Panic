(() => {
  "use strict";

  const canvas = document.querySelector("#arena");
  const ctx = canvas.getContext("2d");
  const ui = {
    wave: document.querySelector("#wave"), health: document.querySelector("#garden-health"), sparks: document.querySelector("#sparks"), nectar: document.querySelector("#nectar"),
    best: document.querySelector("#best-wave"), choices: document.querySelector("#choices"), generation: document.querySelector("#generation"),
    reroll: document.querySelector("#reroll"), shovel: document.querySelector("#shovel"), forget: document.querySelector("#forget"), sound: document.querySelector("#sound-toggle"),
    message: document.querySelector("#message"), gameOver: document.querySelector("#game-over"), finalWave: document.querySelector("#final-wave"),
    playAgain: document.querySelector("#play-again"), pause: document.querySelector("#pause"), memoryStatus: document.querySelector("#memory-status"),
    gardenLabel: document.querySelector("#garden-label"), victory: document.querySelector("#victory"),
    victoryEmoji: document.querySelector("#victory-emoji"), victoryCaption: document.querySelector("#victory-caption")
  };

  const EMOJI = ["🌵", "🍄", "🌸", "🍀", "🌙", "⭐", "☁️", "🔥", "💧", "🍋", "🥑", "🪨", "🌷", "🌻", "🌼", "🌱", "🌿", "🍁", "🍂", "🍃", "🌾", "🌳", "🌲", "🌴", "🌰", "🍇", "🍈", "🍉", "🍊", "🍌", "🍍", "🥭", "🍎", "🍏", "🍐", "🍑", "🍒", "🍓", "🫐", "🥝", "🍅", "🥥", "🍆", "🥔", "🥕", "🌽", "🫑", "🥒", "🥬", "🥦", "🧄", "🧅", "🥜", "🍞", "🥐", "🥖", "🥨", "🥯", "🥞", "🧇", "🧀", "🍕", "🍿", "🍙", "🍚", "🍡", "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🧁", "🍫", "🍬", "🍭", "🧊", "🧶", "🧵", "🧩", "🪁", "🫧", "❄️", "🌈"];
  // The complete Kangxi Radicals block: U+2F00 through U+2FD5, all 214 radicals.
  const RADICALS = Array.from({ length: 214 }, (_, index) => String.fromCodePoint(0x2F00 + index));
  // Semantic advantages, not arbitrary colour matchups. Unlisted emoji and
  // abstract radicals are neutral; this is a game rule, not language instruction.
  const AFFINITIES = {
    water: { label: "Water", emoji: ["💧", "🌊", "🌧️", "☔"] },
    fire: { label: "Fire", emoji: ["🔥", "🕯️"] },
    cold: { label: "Cold", emoji: ["🧊", "❄️", "🍦", "🍧", "🍨"] },
    plant: { label: "Plant", emoji: ["🌵", "🌸", "🍀", "🌷", "🌻", "🌼", "🌱", "🌿", "🌾", "🌳", "🌲", "🌴", "🥬", "🥦"] },
    shade: { label: "Shade", emoji: ["☁️"] },
    light: { label: "Light", emoji: ["☀️", "⭐"] }
  };
  EMOJI.push("🌊", "🌧️", "☔", "🕯️", "☀️");
  const RADICAL_INFO = {
    "⼈": { name: "person", counters: [] }, "⼝": { name: "mouth", counters: [] },
    "⼭": { name: "mountain", counters: ["water"] }, "⽕": { name: "fire", counters: ["water", "cold"] },
    "⽔": { name: "water", counters: ["plant", "cold"] }, "⽊": { name: "tree", counters: ["fire"] },
    "⼼": { name: "heart", counters: [] }, "⼿": { name: "hand", counters: [] },
    "⽇": { name: "sun", counters: ["shade"] }, "⽉": { name: "moon", counters: ["light"] },
    "⼟": { name: "earth", counters: ["plant"] }, "⽥": { name: "field", counters: ["cold"] },
    "⼒": { name: "strength", counters: [] }, "⾨": { name: "gate", counters: [] }
  };
  const RADICAL_COLORS = {
    "⽔": "#2f80c9", "⽕": "#ed6a3a", "⽊": "#4d9143", "⼭": "#7650a8", "⼟": "#a06a3b",
    "⽇": "#e2a51c", "⽉": "#5864ad", "⽥": "#7c9b42", "⼼": "#d14d72", "⼿": "#c17b37",
    "⼈": "#55706b", "⼝": "#9b4e74", "⼒": "#8a4f9e", "⾨": "#53606b"
  };
  const affinity = emoji => Object.entries(AFFINITIES).find(([, group]) => group.emoji.includes(emoji))?.[0] || "neutral";
  const counters = emoji => RADICALS.filter(radical => (RADICAL_INFO[radical]?.counters || []).includes(affinity(emoji)));
  const damageMultiplier = (emoji, radical) => RADICAL_INFO[radical]?.counters.includes(affinity(emoji)) ? 2.5 : 1;
  const radicalLabel = radical => RADICAL_INFO[radical]?.name || `radical ${String(RADICALS.indexOf(radical) + 1).padStart(3, "0")}`;
  const NAMES = ["Wobble", "Pip", "Sprig", "Mochi", "Bumble", "Peep", "Noodle", "Midge", "Tumble", "Bean", "Doodle", "Fizz"];
  const COLORS = ["#ffd47e", "#ffad91", "#a8d9a1", "#9bcaf2", "#d8b7ec", "#f6acc5"];
  const STORAGE_KEY = "radical-rascals-evolution-v1";
  const GARDEN_ROWS = 1, GARDEN_COLUMNS = 16, GARDEN_TOP = .72, GARDEN_BOTTOM = .94;
  const GARDEN_CAPACITY = GARDEN_ROWS * GARDEN_COLUMNS;
  const SPARK_CAP = 12;
  const MAX_LEVEL = 300;
  const VICTORY_DURATION = 3.2;
  const GENES = ["power", "defence", "speed", "life", "range", "wobble", "bounce", "eyeSize", "eyeGap"];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const random = (min, max) => min + Math.random() * (max - min);
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const id = () => Math.random().toString(36).slice(2, 9);

  let storageAvailable = true;
  let memory = loadMemory();
  let state;
  let width = 720, height = 610;
  let lastTime = performance.now();
  let audioContext = null;
  let muted = false;
  let messageTimer;

  function freshState() {
    return {
      wave: 1, health: 10, sparks: 3, nectar: 0, shovelMode: false, generation: memory.generation || 1, score: 0,
      friends: [], enemies: [], particles: [], projectiles: [], nectarDrops: [], offers: [],
      spawnLeft: 5, spawnTimer: 2, wavePause: 0, celebrating: false, complete: false, over: false, started: false, paused: false, time: 0
    };
  }

  function loadMemory() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !Array.isArray(saved.lineages)) return { lineages: [], generation: 1, bestWave: 0 };
      const lineages = saved.lineages.filter(item => item && EMOJI.includes(item.emoji) && NAMES.includes(item.name) && COLORS.includes(item.color)
        && typeof item.id === "string" && Number.isFinite(item.fitness) && item.genome
        && GENES.every(key => key === "defence" || Number.isFinite(item.genome[key])) && Number.isFinite(item.genome.tilt))
        .slice(0, 60).map(item => ({ ...item, fitness: clamp(item.fitness, .15, 8), genome: {
          ...Object.fromEntries(GENES.map(key => [key, clamp(item.genome[key] ?? .5, .08, .95)])), tilt: clamp(item.genome.tilt, -.28, .28)
        } }));
      return { lineages, generation: Number.isSafeInteger(saved.generation) && saved.generation > 0 ? saved.generation : 1,
        bestWave: Number.isSafeInteger(saved.bestWave) && saved.bestWave >= 0 ? saved.bestWave : 0 };
    } catch (_) {
      storageAvailable = false;
      return { lineages: [], generation: 1, bestWave: 0 };
    }
  }

  function saveMemory() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memory)); storageAvailable = true; }
    catch (_) { storageAvailable = false; }
    ui.memoryStatus.textContent = storageAvailable ? "Choices stay in this browser." : "Memory lasts for this session only.";
  }

  function randomGenome(parent) {
    const base = parent || Object.fromEntries(GENES.map(key => [key, random(.15, .85)]));
    const mutate = (value, amount = .12) => clamp(value + random(-amount, amount), .08, .95);
    return {
      power: mutate(base.power), defence: mutate(base.defence), speed: mutate(base.speed), life: mutate(base.life), range: mutate(base.range),
      wobble: mutate(base.wobble), bounce: mutate(base.bounce), eyeSize: mutate(base.eyeSize),
      eyeGap: mutate(base.eyeGap), tilt: clamp((base.tilt || 0) + random(-.08, .08), -.28, .28)
    };
  }

  function chooseParent() {
    if (!memory.lineages.length || Math.random() < .23) return null;
    const total = memory.lineages.reduce((sum, item) => sum + Math.max(.15, item.fitness), 0);
    let roll = Math.random() * total;
    for (const item of memory.lineages) {
      roll -= Math.max(.15, item.fitness);
      if (roll <= 0) return item;
    }
    return memory.lineages[0];
  }

  function makeOffer() {
    const parent = chooseParent();
    return {
      id: id(), emoji: parent ? parent.emoji : pick(EMOJI),
      name: parent ? parent.name : pick(NAMES),
      color: parent?.color || pick(COLORS), genome: randomGenome(parent?.genome), parentId: parent?.id || null
    };
  }

  function refillOffers() {
    state.offers = [makeOffer(), makeOffer(), makeOffer()];
    renderOffers();
  }

  function renderOffers() {
    ui.choices.replaceChildren();
    state.offers.forEach((offer, index) => {
      const button = document.createElement("button");
      button.className = "choice";
      button.type = "button";
      button.disabled = state.over || state.sparks < 1 || state.friends.length >= GARDEN_CAPACITY;
      button.style.setProperty("--specimen-bg", offer.color);
      button.style.setProperty("--tilt", `${offer.genome.tilt}rad`);
      button.style.setProperty("--eye-size", `${7 + offer.genome.eyeSize * 6}px`);
      button.style.setProperty("--eye-gap", `${2 + offer.genome.eyeGap * 7}px`);
      button.style.setProperty("--bounce", `${offer.genome.bounce * -7}px`);
      button.style.setProperty("--wobble", `${offer.genome.wobble * .15}rad`);
      button.style.setProperty("--tempo", `${2 * Math.PI / (2.5 + offer.genome.speed * 3)}s`);
      const advantages = counters(offer.emoji);
      const mood = previewEmotion(offer);
      const matchup = advantages.length ? `2.5× vs ${advantages.join(" ")}` : "Steady vs all radicals";
      button.setAttribute("aria-label", `${offer.name}, ${offer.emoji}. Attack ${Math.round(4 + offer.genome.power * 12)}, defence ${Math.round(offer.genome.defence * 65)}%, HP ${Math.round(35 + offer.genome.life * 80)}, speed ${(1 / (1.15 - offer.genome.speed * .72)).toFixed(1)} attacks per second. ${advantages.length ? `2.5 times damage against ${advantages.map(char => RADICAL_INFO[char].name).join(', ')}.` : 'Normal damage against all radicals.'} Recruit for 1 spark.`);
      button.innerHTML = `
        <span class="specimen" data-emotion="${mood}"><span>${offer.emoji}</span><span class="mini-eyes"><i></i><i></i></span><span class="mini-mouth"></span></span>
        <span class="choice-copy"><strong>${offer.name}</strong><small>mutation ${String(state.generation).padStart(2, "0")}.${index + 1}</small>
          <span class="bars"><span class="bar" title="Attack"><i style="width:${offer.genome.power * 100}%"></i></span><span class="bar" title="Speed"><i style="width:${offer.genome.speed * 100}%"></i></span><span class="bar" title="HP"><i style="width:${offer.genome.life * 100}%"></i></span><span class="bar" title="Defence"><i style="width:${offer.genome.defence * 100}%"></i></span></span>
          <span class="matchup">${matchup}</span>
        </span><span class="pick-arrow">↗</span>`;
      button.addEventListener("click", () => selectOffer(offer));
      ui.choices.append(button);
    });
  }

  function selectOffer(offer) {
    if (state.sparks < 1 || state.over || state.friends.length >= GARDEN_CAPACITY || !state.offers.includes(offer)) return;
    state.sparks--;
    state.started = true;
    state.generation++;
    memory.generation = state.generation;
    rememberChoices(offer);
    addFriend(offer);
    refillOffers();
    updateUI();
    tone(480, .07, "sine");
    announce(`${offer.name} joined the garden!`);
  }

  function rememberChoices(selected) {
    const adjustments = new Map();
    for (const other of state.offers) {
      const chosen = other === selected;
      if (other.parentId) adjustments.set(other.parentId, (adjustments.get(other.parentId) || 0) + (chosen ? .45 : -.08));
      memory.lineages.push({ ...other, fitness: chosen ? 1.6 : .25 });
    }
    for (const item of memory.lineages) item.fitness = clamp(item.fitness + (adjustments.get(item.id) || 0), .15, 8);
    if (memory.lineages.length > 60) memory.lineages.sort((a, b) => b.fitness - a.fitness).length = 60;
    saveMemory();
  }

  function addFriend(offer) {
    const g = offer.genome;
    const columns = GARDEN_COLUMNS;
    const freeSlots = Array.from({ length: GARDEN_CAPACITY }, (_, i) => i).filter(i => !state.friends.some(f => f.slot === i));
    const slot = pick(freeSlots);
    const col = slot % columns;
    const row = Math.floor(slot / columns);
    state.friends.push({
      ...offer, slot, x: slotX(slot), y: height * (GARDEN_TOP + (row + .5) * (GARDEN_BOTTOM - GARDEN_TOP) / GARDEN_ROWS),
      hp: 35 + g.life * 80, maxHp: 35 + g.life * 80, cooldown: random(0, .7), age: random(0, 10), blink: random(1, 4), attackFace: 0, hurtFace: 0, nectarTimer: random(3.5, 6.5)
    });
  }

  function slotX(slot) {
    return width * (.08 + slot * (.84 / Math.max(1, GARDEN_COLUMNS - 1)));
  }

  function spawnEnemy() {
    const difficulty = 1 + state.wave * .09;
    const hp = (18 + state.wave * 7) * random(.85, 1.2);
    state.enemies.push({
      char: pick(RADICALS), x: random(42, width - 42), y: -35,
      hp, maxHp: hp, speed: random(19, 33) * difficulty, size: random(27, 43),
      drift: random(-.8, .8), phase: random(0, Math.PI * 2), hit: 0, counterHit: 0
    });
  }

  function update(dt) {
    if (state.over || state.paused || !state.started || document.hidden) return;
    state.time += dt;
    if (state.wavePause > 0) {
      state.wavePause -= dt;
      if (state.wavePause <= 0) {
        if (state.wave >= MAX_LEVEL) {
          state.complete = true; state.over = true;
          ui.victoryCaption.textContent = `All ${MAX_LEVEL} levels won!`;
          updateUI();
          announce(`All ${MAX_LEVEL} levels complete!`);
          return;
        }
        state.celebrating = false; ui.victory.hidden = true;
        state.wave++;
        state.spawnLeft = 4 + state.wave * 2;
        state.spawnTimer = .4;
        updateUI();
        announce(`Level ${state.wave} is rustling…`);
      }
    } else if (state.spawnLeft > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnEnemy(); state.spawnLeft--; state.spawnTimer = Math.max(.35, 1.18 - state.wave * .035);
      }
    } else if (!state.enemies.length) {
      state.wavePause = VICTORY_DURATION;
      celebrateLevel();
      state.sparks = Math.min(SPARK_CAP, state.sparks + 2);
      memory.bestWave = Math.max(memory.bestWave || 0, state.wave);
      saveMemory(); updateUI(); renderOffers();
      announce("Garden safe — +2 sparks");
      tone(660, .09); setTimeout(() => tone(830, .12), 90);
    }

    for (const friend of state.friends) {
      friend.age += dt;
      friend.nectarTimer -= dt;
      if (friend.nectarTimer <= 0) {
        state.nectarDrops.push({ x: friend.x, y: friend.y - 48, baseY: friend.y - 48, age: 0, life: 12, color: friend.color });
        friend.nectarTimer = 5.5 - friend.genome.speed * 2;
        burst(friend.x, friend.y - 42, "#f4b942", 4);
      }
      friend.attackFace = Math.max(0, (friend.attackFace || 0) - dt);
      friend.hurtFace = Math.max(0, (friend.hurtFace || 0) - dt);
      friend.cooldown -= dt;
      friend.blink -= dt;
      if (friend.blink < -.12) friend.blink = random(1.4, 4.8);
      const range = 280 + friend.genome.range * 220;
      let target = null, targetDist = Infinity;
      for (const enemy of state.enemies) {
        const distance = Math.hypot(enemy.x - friend.x, enemy.y - friend.y);
        if (distance < range && distance < targetDist) { target = enemy; targetDist = distance; }
      }
      if (target && friend.cooldown <= 0) {
        friend.attackFace = .3;
        const travel = 145 + friend.genome.speed * 190;
        const multiplier = damageMultiplier(friend.emoji, target.char);
        state.projectiles.push({ x: friend.x, y: friend.y - 12, target, speed: travel, damage: (4 + friend.genome.power * 12) * multiplier, multiplier, color: friend.color });
        friend.cooldown = 1.15 - friend.genome.speed * .72;
        tone(270 + friend.genome.power * 100, .025, "triangle", .018);
      }
    }

    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const shot = state.projectiles[i];
      if (!state.enemies.includes(shot.target)) { state.projectiles.splice(i, 1); continue; }
      const dx = shot.target.x - shot.x, dy = shot.target.y - shot.y, distance = Math.hypot(dx, dy);
      if (distance < Math.max(10, shot.speed * dt)) {
        shot.target.hp -= shot.damage; shot.target.hit = .12; burst(shot.x, shot.y, shot.color, 4); state.projectiles.splice(i, 1);
        if (shot.multiplier > 1) {
          shot.target.counterHit = .7;
          state.particles.push({ x: shot.x, y: shot.y - 20, vx: 0, vy: -25, life: .8, text: "2.5×!", color: "#b9431e" });
        }
        if (shot.target.hp <= 0) defeatEnemy(shot.target);
      } else { shot.x += dx / distance * shot.speed * dt; shot.y += dy / distance * shot.speed * dt; }
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      enemy.phase += dt * 2; enemy.hit -= dt; enemy.counterHit = Math.max(0, (enemy.counterHit || 0) - dt);
      const defender = state.friends.find(friend => Math.hypot(friend.x - enemy.x, friend.y - enemy.y) < 42);
      if (defender) {
        defender.hurtFace = .4;
        defender.hp -= (10 + state.wave * 2) * (1 - defender.genome.defence * .65) * dt;
        if (defender.hp <= 0) {
          state.friends.splice(state.friends.indexOf(defender), 1);
          burst(defender.x, defender.y, defender.color, 12); renderOffers(); announce(`${defender.name} needs a nap. Recruit a new friend!`);
        }
      } else {
        enemy.y += enemy.speed * dt; enemy.x = clamp(enemy.x + Math.sin(enemy.phase) * enemy.drift * 9 * dt, 24, width - 24);
      }
      if (enemy.y > height * GARDEN_BOTTOM) {
        state.enemies.splice(i, 1); state.health--; burst(enemy.x, height - 25, "#ff6d4a", 9); tone(95, .14, "sawtooth", .035); updateUI();
        if (state.health <= 0) { endGame(); break; }
      }
    }
    for (let i = state.nectarDrops.length - 1; i >= 0; i--) {
      const drop = state.nectarDrops[i];
      drop.age += dt; drop.life -= dt; drop.y = drop.baseY + Math.sin(drop.age * 3) * 6;
      if (drop.life <= 0) state.nectarDrops.splice(i, 1);
    }
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  function defeatEnemy(enemy) {
    const index = state.enemies.indexOf(enemy);
    if (index < 0) return;
    state.enemies.splice(index, 1); state.score++;
    if (state.score % 7 === 0) { state.sparks = Math.min(SPARK_CAP, state.sparks + 1); announce("A wild spark appeared!"); updateUI(); renderOffers(); }
    burst(enemy.x, enemy.y, "#17221c", 8);
  }

  function burst(x, y, color, amount) {
    for (let i = 0; i < amount; i++) state.particles.push({ x, y, color, vx: random(-70, 70), vy: random(-90, 15), life: random(.3, .7), size: random(2, 5) });
  }

  function draw() {
    const w = width, h = height;
    ctx.clearRect(0, 0, w, h);
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#f2c9b1"); gradient.addColorStop(GARDEN_TOP - .01, "#f5e6c8"); gradient.addColorStop(GARDEN_TOP, "#dbe9d2"); gradient.addColorStop(1, "#a9c99f");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    // One planting rail, with sixteen visible slots. No extra boundary/grid lines.
    const plantingY = h * (GARDEN_TOP + GARDEN_BOTTOM) / 2;
    ctx.strokeStyle = "#71966a"; ctx.lineWidth = 2; ctx.setLineDash([5, 7]);
    ctx.beginPath(); ctx.moveTo(w * .07, plantingY + 27); ctx.lineTo(w * .93, plantingY + 27); ctx.stroke(); ctx.setLineDash([]);
    for (let slot = 0; slot < GARDEN_CAPACITY; slot++) {
      if (state.friends.some(friend => friend.slot === slot)) continue;
      const x = slotX(slot);
      ctx.fillStyle = "#ffffff70"; ctx.beginPath(); ctx.ellipse(x, plantingY + 27, 23, 7, 0, 0, Math.PI * 2); ctx.fill();
    }

    for (const drop of state.nectarDrops) drawNectar(drop);
    for (const friend of state.friends) drawFriend(friend);
    for (const enemy of state.enemies) drawEnemy(enemy);
    for (const shot of state.projectiles) {
      ctx.fillStyle = shot.color; ctx.beginPath(); ctx.arc(shot.x, shot.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#17221c"; ctx.stroke();
    }
    for (const p of state.particles) {
      ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.fillStyle = p.color;
      if (p.text) { ctx.font = 'bold 16px "Fredoka", sans-serif'; ctx.textAlign = "center"; ctx.fillText(p.text, p.x, p.y); }
      else ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawFriend(friend) {
    const g = friend.genome;
    const bounce = reducedMotion.matches ? 0 : Math.sin(friend.age * (2.5 + g.speed * 3)) * g.bounce * 7;
    const wobble = (reducedMotion.matches ? 0 : Math.sin(friend.age * 2 + friend.x) * g.wobble * .15) + g.tilt;
    ctx.save(); ctx.translate(friend.x, friend.y + bounce); ctx.rotate(wobble);
    const emojiScale = clamp(width / 21 / 48, .4, .78); ctx.scale(emojiScale, emojiScale);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(23,34,28,.15)"; ctx.beginPath(); ctx.ellipse(0, 28 - bounce, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
    drawEmojiFace(ctx, friend, emotionFor(friend), friend.blink < 0);
    ctx.restore();
    ctx.fillStyle = "rgba(23,34,28,.2)"; ctx.fillRect(friend.x - 20, friend.y + 37, 40, 3);
    ctx.fillStyle = "#71b36a"; ctx.fillRect(friend.x - 20, friend.y + 37, 40 * clamp(friend.hp / friend.maxHp, 0, 1), 3);
  }

  function drawNectar(drop) {
    ctx.save(); ctx.translate(drop.x, drop.y); ctx.globalAlpha = clamp(drop.life, 0, 1);
    ctx.fillStyle = "#f4b942"; ctx.strokeStyle = "#17221c"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.bezierCurveTo(10, -2, 8, 8, 0, 11); ctx.bezierCurveTo(-8, 8, -10, -2, 0, -10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff7c2"; ctx.beginPath(); ctx.arc(-3, -3, 2, 0, Math.PI * 2); ctx.fill();
    ctx.font = '500 8px "DM Mono", monospace'; ctx.textAlign = "center"; ctx.fillStyle = "#17221c"; ctx.fillText("+1", 0, 22);
    ctx.restore(); ctx.globalAlpha = 1;
  }

  function collectNectar(event) {
    if (!state || state.over) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width, scaleY = height / rect.height;
    const x = (event.clientX - (rect.left || 0)) * scaleX, y = (event.clientY - (rect.top || 0)) * scaleY;
    if (state.shovelMode) {
      const index = state.friends.findIndex(friend => Math.hypot(friend.x - x, friend.y - y) < Math.max(24, width / 24));
      if (index >= 0) {
        const [removed] = state.friends.splice(index, 1);
        burst(removed.x, removed.y, "#d18b55", 12); state.shovelMode = false;
        updateUI(); renderOffers(); tone(180, .08, "triangle"); announce(`${removed.name} was dug up`);
      }
      return;
    }
    const index = state.nectarDrops.findIndex(drop => Math.hypot(drop.x - x, drop.y - y) < 34);
    if (index < 0) return;
    state.nectarDrops.splice(index, 1); state.nectar++; state.sparks = Math.min(SPARK_CAP, state.sparks + 1);
    updateUI(); renderOffers(); tone(720, .07, "sine"); announce("Nectar collected — +1 spark");
  }

  function previewEmotion(friend) {
    return friend.genome.power > .65 ? "determined" : friend.genome.bounce > .55 ? "happy" : "curious";
  }

  function emotionFor(friend) {
    if (state.celebrating) return "joy";
    if (friend.hurtFace > 0) return "hurt";
    if (friend.hp < friend.maxHp * .35) return "scared";
    if (friend.attackFace > 0) return "determined";
    if (state.enemies.some(enemy => Math.hypot(friend.x - enemy.x, friend.y - enemy.y) < 110)) return "scared";
    return previewEmotion(friend);
  }

  // Shared by planted defenders and the giant victory character; every emoji gets a full face.
  function drawEmojiFace(pen, friend, emotion, blink = false) {
    const g = friend.genome, scared = emotion === "scared", hurt = emotion === "hurt", joy = emotion === "joy";
    pen.save(); pen.globalAlpha = 1;
    pen.fillStyle = "#17221c";
    pen.font = '48px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    pen.textAlign = "center"; pen.textBaseline = "middle"; pen.fillText(friend.emoji, 0, 0);
    const eyeSize = (5 + g.eyeSize * 5) * (scared ? 1.15 : 1), gap = 4 + g.eyeGap * 9;
    pen.lineCap = "round";
    for (const side of [-1, 1]) {
      pen.fillStyle = "white"; pen.strokeStyle = "#17221c"; pen.lineWidth = 1.3; pen.beginPath();
      pen.ellipse(side * gap, -8, eyeSize, blink || hurt ? 1 : eyeSize * 1.18, 0, 0, Math.PI * 2); pen.fill(); pen.stroke();
      if (!blink && !hurt) {
        pen.fillStyle = "#17221c"; pen.beginPath();
        if (joy) pen.arc(side * gap, -5, 3, Math.PI, Math.PI * 2);
        else pen.arc(side * gap, -6, scared ? 1.6 : 2.2, 0, Math.PI * 2);
        if (joy) pen.stroke(); else pen.fill();
      }
      const browY = -12 - eyeSize * 1.18;
      pen.beginPath(); pen.moveTo(side * gap - 4, browY + (emotion === "determined" ? -side * 2 : 0));
      pen.lineTo(side * gap + 4, browY + (emotion === "determined" ? side * 2 : scared ? -side * 2 : 0)); pen.stroke();
      if (joy || emotion === "happy") {
        pen.fillStyle = "#f78999"; pen.beginPath(); pen.ellipse(side * (gap + 5), 3, 4, 2, 0, 0, Math.PI * 2); pen.fill();
      }
    }
    pen.strokeStyle = "#17221c"; pen.fillStyle = "#17221c"; pen.lineWidth = 1.5; pen.beginPath();
    if (scared || emotion === "curious") {
      pen.ellipse(0, 9, scared ? 4 : 2.5, scared ? 6 : 3.5, 0, 0, Math.PI * 2); pen.fill();
    } else if (hurt) {
      pen.moveTo(-6, 11); pen.quadraticCurveTo(0, 3, 6, 11); pen.stroke();
    } else if (emotion === "determined") {
      pen.fillStyle = "white"; pen.rect(-6, 7, 12, 5); pen.fill(); pen.stroke();
    } else {
      pen.moveTo(-7, 6); pen.lineTo(7, 6); pen.quadraticCurveTo(0, joy ? 25 : 20, -7, 6); pen.fill(); pen.stroke();
      pen.fillStyle = "#ff879b"; pen.beginPath(); pen.ellipse(0, joy ? 13 : 11, 3, 2, 0, 0, Math.PI * 2); pen.fill();
    }
    pen.restore();
  }

  function celebrateLevel() {
    state.celebrating = true;
    const champion = state.friends.length ? pick(state.friends) : state.offers[0];
    const pen = ui.victoryEmoji.getContext("2d");
    pen.clearRect(0, 0, 600, 600);
    pen.save(); pen.translate(300, 300);
    pen.fillStyle = champion.color; pen.beginPath(); pen.arc(0, 0, 235, 0, Math.PI * 2); pen.fill();
    pen.scale(8, 8); drawEmojiFace(pen, champion, "joy"); pen.restore();
    ui.victoryCaption.textContent = `Level ${state.wave} won!`;
    ui.victory.hidden = false;
  }

  function drawEnemy(enemy) {
    ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(reducedMotion.matches ? 0 : Math.sin(enemy.phase) * .1);
    if (enemy.hit > 0) { ctx.shadowColor = "white"; ctx.shadowBlur = 16; }
    ctx.font = `700 ${enemy.size}px "Fredoka", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = enemy.hit > 0 ? "#ff6d4a" : (RADICAL_COLORS[enemy.char] || "#53606b"); ctx.fillText(enemy.char, 0, 0); ctx.restore();
    ctx.font = '500 9px "DM Mono", monospace'; ctx.textAlign = "center"; ctx.textBaseline = "top";
    const label = radicalLabel(enemy.char).toUpperCase();
    const labelWidth = ctx.measureText(label).width + 8;
    const labelX = clamp(enemy.x, labelWidth / 2 + 2, width - labelWidth / 2 - 2);
    ctx.fillStyle = "rgba(255,253,247,.85)"; ctx.fillRect(labelX - labelWidth / 2, enemy.y + enemy.size * .52, labelWidth, 13);
    ctx.fillStyle = "#17221c"; ctx.fillText(label, labelX, enemy.y + enemy.size * .52 + 2);
    ctx.fillStyle = "rgba(23,34,28,.17)"; ctx.fillRect(enemy.x - 15, enemy.y - enemy.size * .7, 30, 2);
    ctx.fillStyle = "#ff6d4a"; ctx.fillRect(enemy.x - 15, enemy.y - enemy.size * .7, 30 * clamp(enemy.hp / enemy.maxHp, 0, 1), 2);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const oldW = width, oldH = height;
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state) {
      const sx = width / oldW, sy = height / oldH;
      for (const entity of [...state.friends, ...state.enemies, ...state.projectiles, ...state.particles, ...state.nectarDrops]) { entity.x *= sx; entity.y *= sy; if (entity.baseY) entity.baseY *= sy; }
    }
  }

  function updateUI() {
    ui.wave.textContent = state.wave; ui.health.textContent = state.health; ui.sparks.textContent = state.sparks; ui.nectar.textContent = state.nectar;
    ui.best.textContent = memory.bestWave || 0; ui.generation.textContent = String(state.generation).padStart(2, "0");
    ui.reroll.disabled = state.sparks < 1 || state.over || (!state.started && state.sparks === 1);
    ui.shovel.disabled = state.over || state.friends.length === 0;
    ui.shovel.setAttribute("aria-pressed", String(state.shovelMode));
    ui.pause.disabled = state.over || !state.started;
    ui.pause.textContent = state.paused ? "Resume" : "Pause";
    ui.pause.setAttribute("aria-pressed", String(state.paused));
    ui.victory.classList.toggle("is-paused", state.paused || document.hidden);
    ui.gardenLabel.textContent = `Level ${state.wave} · one planting line`;
    ui.memoryStatus.textContent = storageAvailable ? "Choices stay in this browser." : "Memory lasts for this session only.";
  }

  function announce(text) {
    clearTimeout(messageTimer); ui.message.textContent = text; ui.message.classList.add("show");
    messageTimer = setTimeout(() => ui.message.classList.remove("show"), 1700);
  }

  function endGame() {
    state.over = true; memory.bestWave = Math.max(memory.bestWave || 0, state.wave); saveMemory();
    ui.finalWave.textContent = state.wave; ui.gameOver.hidden = false; updateUI(); renderOffers();
  }

  function tone(frequency, duration, type = "sine", volume = .03) {
    if (muted) return;
    try {
      audioContext ||= new AudioContext(); if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
      const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain();
      oscillator.type = type; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration); oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
    } catch (_) { /* Sound is optional. */ }
  }

  function start() {
    state = freshState(); ui.gameOver.hidden = true; ui.victory.hidden = true; refillOffers(); updateUI(); resize();
    announce("Choose your first friend");
  }

  ui.reroll.addEventListener("click", () => { if (state.sparks < 1 || state.over || (!state.started && state.sparks === 1)) return; state.sparks--; rememberChoices(null); refillOffers(); updateUI(); tone(350, .05); });
  ui.shovel.addEventListener("click", () => { if (state.over || state.friends.length === 0) return; state.shovelMode = !state.shovelMode; updateUI(); announce(state.shovelMode ? "Pick a friend to dig up" : "Shovel put away"); });
  ui.pause.addEventListener("click", () => { if (state.over || !state.started) return; state.paused = !state.paused; updateUI(); announce(state.paused ? "Garden paused" : "Here come the radicals!"); });
  ui.forget.addEventListener("click", () => { memory = { lineages: [], generation: 1, bestWave: 0 }; saveMemory(); start(); announce("Evolutionary memory cleared"); });
  ui.sound.addEventListener("click", () => { muted = !muted; ui.sound.classList.toggle("muted", muted); ui.sound.setAttribute("aria-label", muted ? "Turn sound on" : "Turn sound off"); if (!muted) tone(520, .06); });
  ui.playAgain.addEventListener("click", start);
  canvas.addEventListener("pointerdown", collectNectar);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { lastTime = performance.now(); updateUI(); });

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, .035); lastTime = now; update(dt); draw(); requestAnimationFrame(frame);
  }

  start(); requestAnimationFrame(frame);
})();
