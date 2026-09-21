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

  const EMOJI = ["🌵", "🌸", "🍀", "⭐", "☁️", "🔥", "💧", "🍋", "🥑", "🪨", "🌷", "🌼", "🌱", "🍂", "🌾", "🌳", "🌲", "🌴", "🌰", "🍇", "🍊", "🥭", "🍎", "🍏", "🍐", "🍓", "🫐", "🥝", "🍅", "🥔", "🥕", "🫑", "🥬", "🥦", "🧄", "🧅", "🥜", "🍞", "🥐", "🥖", "🥨", "🥯", "🥞", "🧇", "🧀", "🍕", "🍿", "🍙", "🍚", "🍡", "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🧁", "🍫", "🍬", "🧊", "🧶", "🧵", "🪁", "🫧", "🌊", "🌧️", "☀️", "🫓", "🥙", "🧆", "🥗", "🍲", "🥣", "🍛", "🍜", "🥟", "🥠", "🍥", "🥮", "🧈", "🧂", "🥫", "🫖", "☕", "🧃", "🥤", "🧱", "🔔", "💎", "🎁", "🎈", "🪴", "🌺", "🪻", "🌶️", "⚽", "🏀", "🏐", "🪀", "🎲"];
  // Every Kangxi radical, in Unicode order: radical 1 is index 0, radical 214 is index 213.
  // Each entry is the ordinary CJK ideograph (far better font coverage than the
  // U+2F00 compatibility block) followed by its English name. Generated from the
  // Unicode character database - see docs/RADICALS.md for the two deliberate overrides.
  const RADICAL_TABLE = (
    "一one|丨line|丶dot|丿slash|乙second|亅hook|二two|亠lid|人person|儿legs|入enter|八eight|冂down box|冖cover" +
    "|冫ice|几table|凵open box|刀knife|力power|勹wrap|匕spoon|匚right open box|匸hiding enclosure|十ten" +
    "|卜divination|卩seal|厂cliff|厶private|又again|口mouth|囗enclosure|土earth|士scholar|夂go|夊go slowly" +
    "|夕evening|大big|女woman|子child|宀roof|寸inch|小small|尢lame|尸corpse|屮sprout|山mountain|巛river|工work" +
    "|己oneself|巾turban|干dry|幺short thread|广dotted cliff|廴long stride|廾two hands|弋shoot|弓bow|彐snout" +
    "|彡bristle|彳step|心heart|戈halberd|戶door|手hand|支branch|攴rap|文script|斗dipper|斤axe|方square|无not" +
    "|日sun|曰say|月moon|木tree|欠lack|止stop|歹death|殳weapon|毋do not|比compare|毛fur|氏clan|气steam|水water" +
    "|火fire|爪claw|父father|爻double x|爿half tree trunk|片slice|牙fang|牛cow|犬dog|玄profound|玉jade|瓜melon" +
    "|瓦tile|甘sweet|生life|用use|田field|疋bolt of cloth|疒sickness|癶dotted tent|白white|皮skin|皿dish|目eye" +
    "|矛spear|矢arrow|石stone|示spirit|禸track|禾grain|穴cave|立stand|竹bamboo|米rice|糸silk|缶jar|网net|羊sheep" +
    "|羽feather|老old|而and|耒plow|耳ear|聿brush|肉meat|臣minister|自self|至arrive|臼mortar|舌tongue|舛oppose" +
    "|舟boat|艮stopping|色color|艸grass|虍tiger|虫insect|血blood|行walk enclosure|衣clothes|襾west|見see" +
    "|角horn|言speech|谷valley|豆bean|豕pig|豸badger|貝shell|赤red|走run|足foot|身body|車cart|辛bitter|辰morning" +
    "|辵walk|邑city|酉wine|釆distinguish|里village|金gold|長long|門gate|阜mound|隶capture|隹short tailed bird" +
    "|雨rain|靑blue|非wrong|面face|革leather|韋tanned leather|韭leek|音sound|頁leaf|風wind|飛fly|食eat|首head" +
    "|香fragrant|馬horse|骨bone|高tall|髟hair|鬥fight|鬯sacrificial wine|鬲cauldron|鬼ghost|魚fish|鳥bird" +
    "|鹵salt|鹿deer|麥wheat|麻hemp|黃yellow|黍millet|黑black|黹embroidery|黽frog|鼎tripod|鼓drum|鼠rat|鼻nose" +
    "|齊even|齒tooth|龍dragon|龜turtle|龠flute"
  ).split("|");
  // Identity stays on the Kangxi block so saved games and the counter rules keep
  // working; only what we DRAW comes from the table above.
  const RADICALS = Array.from({ length: 214 }, (_, index) => String.fromCodePoint(0x2F00 + index));
  const RADICAL_INDEX = new Map(RADICALS.map((char, index) => [char, index]));
  // Semantic advantages, not arbitrary colour matchups. Unlisted emoji and
  // abstract radicals are neutral; this is a game rule, not language instruction.
  const AFFINITIES = {
    water: { label: "Water", emoji: ["💧", "🌊", "🌧️"] },
    fire: { label: "Fire", emoji: ["🔥", "🌶️"] },
    cold: { label: "Cold", emoji: ["🧊", "🍦", "🍧", "🍨"] },
    plant: { label: "Plant", emoji: ["🌵", "🌸", "🍀", "🌷", "🌼", "🌱", "🌾", "🌳", "🌲", "🌴", "🥬", "🥦", "🪴", "🌺", "🪻", "🥗"] },
    shade: { label: "Shade", emoji: ["☁️"] },
    light: { label: "Light", emoji: ["☀️", "⭐"] }
  };
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
  // Every radical has a real English name. Before, only the fourteen hand-written
  // entries in RADICAL_INFO did, and the other two hundred showed as "RADICAL 087".
  const radicalLabel = radical => {
    const index = RADICAL_INDEX.get(radical);
    return index === undefined ? "radical" : RADICAL_TABLE[index].slice(1);
  };
  // Draw the ordinary CJK ideograph rather than the U+2F00 compatibility character.
  // Both mean the same radical, but 水 is in every CJK font and ⽔ is in far fewer,
  // so the compatibility codepoint renders as tofu on a lot of machines.
  const radicalGlyph = radical => {
    const index = RADICAL_INDEX.get(radical);
    return index === undefined ? radical : RADICAL_TABLE[index][0];
  };
  // Radicals whose meaning drives the counter rules keep their meaning colour; the
  // rest get a stable, evenly spread hue so two attackers on screen never look alike.
  const radicalColor = radical => {
    if (RADICAL_COLORS[radical]) return RADICAL_COLORS[radical];
    const index = RADICAL_INDEX.get(radical);
    if (index === undefined) return "#53606b";
    return `hsl(${(index * 137.508) % 360}deg 34% 42%)`;
  };
  const NAMES = ["Wobble", "Pip", "Sprig", "Mochi", "Bumble", "Peep", "Noodle", "Midge", "Tumble", "Bean", "Doodle", "Fizz"];
  const COLORS = ["#ffd47e", "#ffad91", "#a8d9a1", "#9bcaf2", "#d8b7ec", "#f6acc5"];
  const STORAGE_KEY = "radical-rascals-evolution-v1";
  const GARDEN_ROWS = 1, GARDEN_COLUMNS = 16, GARDEN_TOP = .72, GARDEN_BOTTOM = .94;
  const GARDEN_CAPACITY = GARDEN_ROWS * GARDEN_COLUMNS;
  const SPARK_CAP = 16;   // one per garden slot, so a full garden is reachable
  // Sparks you are guaranteed at the start of a level. The garden is wiped between
  // levels, so this has to keep pace with how big a wave is about to arrive.
  const levelSparks = wave => Math.min(SPARK_CAP, 2 + wave);
  const POOL_LIMIT = 60;            // total lineages remembered
  const LINEAGES_PER_EMOJI = 4;     // so >= POOL_LIMIT / 4 species always coexist
  const PICK_FITNESS = 1.6;         // fitness a freshly planted lineage enters with
  const FITNESS_CAP = 8, FITNESS_FLOOR = .15;
  const FITNESS_DECAY = .97;        // applied to every lineage per cleared wave
  const NECTAR_POP = .45;           // it hovers this long so you see where it came from
  const NECTAR_SPEED = 210, NECTAR_ACCEL = 900;
  const nectarTarget = () => ({ x: width / 2, y: height - 16 });   // bottom centre of the field
  const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  const HIT_FLASH = .12;            // how long a damage blink lasts, in seconds
  const GROW_FITNESS = .5;          // spending sparks on a lineage is a loud preference
  const NOVELTY_CHANCE = .23;       // chance of drafting an entirely new lineage
  const MAX_LEVEL = 300;
  const PREVIEW_SIZE = 96, PREVIEW_SCALE = 1.15;
  const HAN_FONT = '"Noto Sans SC", "Noto Sans CJK SC", "Source Han Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", "Heiti SC", sans-serif';
  const VICTORY_DURATION = 3.2;
  const GENES = ["power", "defence", "speed", "life", "range", "wobble", "bounce", "eyeSize", "eyeGap", "role"];
  // Genes added after a save format shipped. Old saves simply do not have them, so
  // they are defaulted rather than causing the lineage to be thrown away.
  const OPTIONAL_GENES = new Set(["defence", "role"]);

  // What a friend DOES, not just how big its numbers are. The role is carried by a
  // gene, so it mutates and is inherited like everything else: a lineage you keep
  // planting drifts towards the job you keep picking it for, and a mutation can
  // turn a shooter's child into a wall.
  const ROLES = {
    sprout:  { label: "Sprout",  blurb: "steady shot",      hp: 1,    dmg: 1,   rate: 1,   range: 1,   nectar: 1,  accent: "#7cc96b" },
    grower:  { label: "Grower",  blurb: "rich in Nectar",   hp: 1.1,  dmg: .35, rate: .7,  range: .6,  nectar: 3,  accent: "#f4b942" },
    bulwark: { label: "Bulwark", blurb: "soaks the hit",    hp: 3.2,  dmg: .25, rate: .6,  range: .45, nectar: .6, accent: "#9a7b5a" },
    frost:   { label: "Frost",   blurb: "chills radicals",  hp: .9,   dmg: .7,  rate: 1,   range: 1.1, nectar: 1,  accent: "#6fb7e8", chills: true },
    lobber:  { label: "Lobber",  blurb: "splash, hits far", hp: .95,  dmg: 1.2, rate: .65, range: 1.3, nectar: .9, accent: "#c77ad4", lobs: true },
  };
  // Band edges over the role gene, spread across its full legal span (.08-.95) so
  // every job is actually reachable. Sprout takes the widest band, since the plain
  // shooter should be the most common thing you are offered.
  const ROLE_BANDS = [[.32, "sprout"], [.48, "grower"], [.63, "bulwark"], [.79, "frost"], [1, "lobber"]];
  const roleOf = genome => ROLE_BANDS.find(([edge]) => (genome.role ?? .5) < edge)[1];

  // Upgrading, PvZ-style, but paid for in the same sparks you would spend on a new
  // recruit - so every level is a real choice between a wider garden and a
  // stronger one. Tier 1 is what you plant; 3 is the ceiling.
  const GROW_COSTS = [0, 2, 3];
  const MAX_TIER = 3;
  const tierPower = tier => 1 + (tier - 1) * .55;
  const tierRate = tier => 1 + (tier - 1) * .12;
  const baseHp = (genome, tier) => (35 + genome.life * 80) * ROLES[roleOf(genome)].hp * tierPower(tier);
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
  let labelBoxes = [];   // per-frame record of drawn enemy labels, for collision avoidance

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
        && GENES.every(key => OPTIONAL_GENES.has(key) || Number.isFinite(item.genome[key])) && Number.isFinite(item.genome.tilt))
        .slice(0, POOL_LIMIT).map(item => ({ ...item, depth: Number.isSafeInteger(item.depth) && item.depth >= 0 ? item.depth : 0, fitness: clamp(item.fitness, FITNESS_FLOOR, FITNESS_CAP), genome: {
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
    const base = parent || Object.fromEntries(GENES.map(key => [key, key === "role" ? random(.08, .95) : random(.15, .85)]));
    const mutate = (value, amount = .12) => clamp(value + random(-amount, amount), .08, .95);
    return {
      power: mutate(base.power), defence: mutate(base.defence), speed: mutate(base.speed), life: mutate(base.life), range: mutate(base.range),
      wobble: mutate(base.wobble), bounce: mutate(base.bounce), eyeSize: mutate(base.eyeSize),
      eyeGap: mutate(base.eyeGap),
      // A smaller step than the rest: a role should drift across a few generations,
      // not flip every time you plant a child.
      role: mutate(base.role ?? random(.08, .95), .07),
      tilt: clamp((base.tilt || 0) + random(-.08, .08), -.28, .28)
    };
  }

  function chooseParent() {
    if (!memory.lineages.length || Math.random() < NOVELTY_CHANCE) return null;
    const total = memory.lineages.reduce((sum, item) => sum + Math.max(.15, item.fitness), 0);
    let roll = Math.random() * total;
    for (const item of memory.lineages) {
      roll -= Math.max(.15, item.fitness);
      if (roll <= 0) return item;
    }
    return memory.lineages[0];
  }

  // Keep the pool from becoming a monoculture.
  //
  // It used to be a flat list trimmed to the top 60 by fitness. Because a chosen
  // lineage enters at PICK_FITNESS and an established one climbs to FITNESS_CAP,
  // the floor eventually rose above the entry fitness and NO new lineage could
  // ever survive its first trim again - the 23% novelty roll produced an offer
  // that was discarded the instant it was stored. A consistent player ended up
  // with one emoji and one name forever.
  //
  // Two changes fix it. A per-species cap means no single emoji can own more than
  // LINEAGES_PER_EMOJI of the 60 slots, so at least 60/4 = 15 species always
  // coexist and there is always room for a newcomer. And fitness decays each wave,
  // so a favourite you have stopped picking gradually yields its slot instead of
  // holding it forever.
  function trimLineages() {
    const kept = [], perEmoji = new Map();
    for (const item of [...memory.lineages].sort((a, b) => b.fitness - a.fitness)) {
      const used = perEmoji.get(item.emoji) || 0;
      if (used >= LINEAGES_PER_EMOJI) continue;
      perEmoji.set(item.emoji, used + 1);
      kept.push(item);
      if (kept.length >= POOL_LIMIT) break;
    }
    memory.lineages = kept;
  }

  // Called once per cleared wave. Everything fades a little, so yesterday's
  // favourite has to keep being picked to stay in the pool.
  function decayLineages() {
    for (const item of memory.lineages) item.fitness *= FITNESS_DECAY;
    memory.lineages = memory.lineages.filter(item => item.fitness > FITNESS_FLOOR);
    trimLineages();
  }

  // `taken` is the set of emoji already on the tray. Passing it lets the draft
  // guarantee a distinct candidate rather than hoping a retry lands one.
  function makeOffer(taken) {
    const parent = taken && taken.size ? chooseParentAvoiding(taken) : chooseParent();
    if (!parent && taken && taken.size) {
      // Nothing usable in the pool, so found a brand new lineage on an emoji that
      // is not already being offered.
      const fresh = EMOJI.filter(emoji => !taken.has(emoji));
      return {
        id: id(), emoji: fresh.length ? pick(fresh) : pick(EMOJI), name: pick(NAMES),
        color: pick(COLORS), genome: randomGenome(), parentId: null, depth: 0
      };
    }
    return {
      id: id(), emoji: parent ? parent.emoji : pick(EMOJI),
      name: parent ? parent.name : pick(NAMES),
      color: parent?.color || pick(COLORS), genome: randomGenome(parent?.genome), parentId: parent?.id || null,
      // How many ancestors deep this candidate is. "GEN" used to show the number of
      // picks in the run, which is not a generation at all.
      depth: parent ? (parent.depth || 0) + 1 : 0
    };
  }

  // The tray is closed while the victory character is on screen. Recruiting then
  // planted into a level that had already been won, which read as a bug: the big
  // emoji is a curtain between levels, not part of either one.
  const trayLocked = () => state.over || state.celebrating || state.wavePause > 0;

  // Weighted sampling happily returns the same favourite lineage three times, which
  // is a non-choice: the tray is where selection happens, so it has to offer
  // something to select between. Skipping the pool entries whose emoji is already
  // on the tray makes that a guarantee rather than a matter of luck.
  function chooseParentAvoiding(taken) {
    const usable = memory.lineages.filter(item => !taken.has(item.emoji));
    if (!usable.length || Math.random() < NOVELTY_CHANCE) return null;
    const total = usable.reduce((sum, item) => sum + Math.max(.15, item.fitness), 0);
    let roll = Math.random() * total;
    for (const item of usable) {
      roll -= Math.max(.15, item.fitness);
      if (roll <= 0) return item;
    }
    return usable[usable.length - 1];
  }

  function refillOffers() {
    const offers = [];
    const taken = new Set();
    for (let slot = 0; slot < 3; slot++) {
      const candidate = makeOffer(taken);
      taken.add(candidate.emoji);
      offers.push(candidate);
    }
    state.offers = offers;
    renderOffers();
  }

  function renderOffers() {
    ui.choices.replaceChildren();
    state.offers.forEach((offer, index) => {
      const button = document.createElement("button");
      button.className = "choice";
      button.type = "button";
      button.disabled = trayLocked() || state.sparks < 1 || state.friends.length >= GARDEN_CAPACITY;
      button.style.setProperty("--specimen-bg", offer.color);
      button.style.setProperty("--tilt", `${offer.genome.tilt}rad`);
      button.style.setProperty("--eye-size", `${7 + offer.genome.eyeSize * 6}px`);
      button.style.setProperty("--eye-gap", `${2 + offer.genome.eyeGap * 7}px`);
      button.style.setProperty("--bounce", `${offer.genome.bounce * -7}px`);
      button.style.setProperty("--wobble", `${offer.genome.wobble * .15}rad`);
      button.style.setProperty("--tempo", `${2 * Math.PI / (2.5 + offer.genome.speed * 3)}s`);
      const advantages = counters(offer.emoji);
      const mood = previewEmotion(offer);
      const offerRole = ROLES[roleOf(offer.genome)];
      // Sighted players used to get raw glyphs ("2.5x vs the-water-radical") while the
      // aria-label got readable English. Both get English now.
      const matchup = advantages.length
        ? `2.5× vs ${advantages.map(radicalLabel).join(", ")}`
        : "Steady vs all radicals";
      button.setAttribute("aria-label", `${offer.name}, ${offer.emoji}, ${offerRole.label}: ${offerRole.blurb}. Attack ${Math.round(4 + offer.genome.power * 12)}, defence ${Math.round(offer.genome.defence * 65)}%, HP ${Math.round(35 + offer.genome.life * 80)}, speed ${(1 / (1.15 - offer.genome.speed * .72)).toFixed(1)} attacks per second. ${advantages.length ? `2.5 times damage against ${advantages.map(radicalLabel).join(', ')}.` : 'Normal damage against all radicals.'} Recruit for 1 spark.`);
      // The face in the card is painted by drawEmojiFace - the very same routine the
      // arena uses. It used to be a separate CSS drawing with different eye
      // proportions, no eyebrows and a different mouth, which meant you were
      // selecting on a picture that was not what you would get.
      const specimen = document.createElement("span");
      specimen.className = "specimen";
      specimen.setAttribute("data-emotion", mood);
      const art = document.createElement("canvas");
      art.className = "specimen-art";
      art.width = PREVIEW_SIZE; art.height = PREVIEW_SIZE;
      specimen.append(art);
      offer.art = art;

      const copy = document.createElement("span");
      copy.className = "choice-copy";
      copy.innerHTML = `<strong>${offer.name}</strong><small><b class="role" style="color:${offerRole.accent}">${offerRole.label}</b> · ${offerRole.blurb}</small>
          <span class="bars"><span class="bar" title="Attack"><i style="width:${offer.genome.power * 100}%"></i></span><span class="bar" title="Speed"><i style="width:${offer.genome.speed * 100}%"></i></span><span class="bar" title="HP"><i style="width:${offer.genome.life * 100}%"></i></span><span class="bar" title="Defence"><i style="width:${offer.genome.defence * 100}%"></i></span></span>
          <span class="matchup">${matchup}</span>`;

      const arrow = document.createElement("span");
      arrow.className = "pick-arrow";
      arrow.textContent = "↗";

      button.append(specimen);
      button.append(copy);
      button.append(arrow);
      button.addEventListener("click", () => selectOffer(offer));
      ui.choices.append(button);
    });
  }

  function selectOffer(offer) {
    if (trayLocked() || state.sparks < 1 || state.friends.length >= GARDEN_CAPACITY || !state.offers.includes(offer)) return;
    state.sparks--;
    state.started = true;
    state.generation = Math.max(state.generation, (offer.depth || 0) + 1);
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
      // Only what the player actually planted is enrolled as a lineage. Storing the
      // rejected two as well filled the pool with noise that crowded out newcomers;
      // their parents are still penalised through `adjustments` below, which is the
      // whole signal a rejection carries.
      if (chosen) memory.lineages.push({ ...other, fitness: PICK_FITNESS });
    }
    for (const item of memory.lineages) item.fitness = clamp(item.fitness + (adjustments.get(item.id) || 0), FITNESS_FLOOR, FITNESS_CAP);
    trimLineages();
    saveMemory();
  }

  function addFriend(offer) {
    const g = offer.genome;
    const columns = GARDEN_COLUMNS;
    const freeSlots = Array.from({ length: GARDEN_CAPACITY }, (_, i) => i).filter(i => !state.friends.some(f => f.slot === i));
    const slot = pick(freeSlots);
    const col = slot % columns;
    const row = Math.floor(slot / columns);
    const role = roleOf(g);
    const hp = baseHp(g, 1);
    state.friends.push({
      ...offer, slot, role, tier: 1,
      x: slotX(slot), y: height * (GARDEN_TOP + (row + .5) * (GARDEN_BOTTOM - GARDEN_TOP) / GARDEN_ROWS),
      hp, maxHp: hp, cooldown: random(0, .7), age: random(0, 10), blink: random(1, 4),
      attackFace: 0, hurtFace: 0, growFlash: 0,
      nectarTimer: random(3.5, 6.5) / ROLES[role].nectar
    });
  }

  // How large a planted friend is drawn. Nectar uses it too: the drops are fixed
  // size otherwise, and on a phone they ended up bigger than the character that
  // produced them.
  function friendScale() {
    return clamp(width / 21 / 48, .4, .78);
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
        // The garden was unplanted when the previous level was won and the tray was
        // locked throughout the celebration, so the field is empty here by
        // construction. `started` gates the wave the same way it gates level 1:
        // nothing spawns until something is planted, so you always get time to draft.
        state.started = false;
        state.sparks = Math.min(SPARK_CAP, Math.max(state.sparks, levelSparks(state.wave)));
        state.spawnLeft = 4 + state.wave * 2;
        state.spawnTimer = .4;
        updateUI(); renderOffers();
        const scene = BACKDROPS[backdropIndex(state.wave)];
        announce(backdropIndex(state.wave) !== backdropIndex(state.wave - 1)
          ? `${scene.name} — level ${state.wave}`
          : `Level ${state.wave} — plant a new garden`);
      }
    } else if (state.spawnLeft > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnEnemy(); state.spawnLeft--; state.spawnTimer = Math.max(.35, 1.18 - state.wave * .035);
      }
    } else if (!state.enemies.length) {
      state.wavePause = VICTORY_DURATION;
      celebrateLevel();   // picks its champion from the garden, so it runs first
      // The garden is unplanted the instant the level is won, so you watch it clear
      // rather than finding it gone after the celebration. Anything still pointing
      // at a friend goes with it.
      state.friends = [];
      state.projectiles = [];
      state.nectarDrops = [];
      state.shovelMode = false;
      state.sparks = Math.min(SPARK_CAP, state.sparks + 2);
      decayLineages();
      memory.bestWave = Math.max(memory.bestWave || 0, state.wave);
      saveMemory(); updateUI(); renderOffers();
      announce("Garden safe — +2 sparks");
      tone(660, .09); setTimeout(() => tone(830, .12), 90);
    }

    for (const friend of state.friends) {
      friend.age += dt;
      friend.nectarTimer -= dt;
      if (friend.nectarTimer <= 0) {
        state.nectarDrops.push({ x: friend.x, y: friend.y - 48, baseY: friend.y - 48, age: 0, speed: 0, color: friend.color });
        friend.nectarTimer = (5.5 - friend.genome.speed * 2) / (ROLES[friend.role] || ROLES.sprout).nectar;
        burst(friend.x, friend.y - 42, "#f4b942", 4);
      }
      friend.attackFace = Math.max(0, (friend.attackFace || 0) - dt);
      friend.growFlash = Math.max(0, (friend.growFlash || 0) - dt);
      friend.hurtFace = Math.max(0, (friend.hurtFace || 0) - dt);
      friend.cooldown -= dt;
      friend.blink -= dt;
      if (friend.blink < -.12) friend.blink = random(1.4, 4.8);
      const role = ROLES[friend.role] || ROLES.sprout;
      const range = (280 + friend.genome.range * 220) * role.range;
      // A Lobber arcs over the front line to hit the radical that is furthest away;
      // everyone else shoots whatever is closest.
      let target = null, targetDist = role.lobs ? -Infinity : Infinity;
      for (const enemy of state.enemies) {
        const distance = Math.hypot(enemy.x - friend.x, enemy.y - friend.y);
        if (distance >= range) continue;
        if (role.lobs ? distance > targetDist : distance < targetDist) { target = enemy; targetDist = distance; }
      }
      if (target && friend.cooldown <= 0) {
        friend.attackFace = .3;
        const travel = 145 + friend.genome.speed * 190;
        const multiplier = damageMultiplier(friend.emoji, target.char);
        state.projectiles.push({
          x: friend.x, y: friend.y - 12, target, speed: travel,
          damage: (4 + friend.genome.power * 12) * multiplier * role.dmg * tierPower(friend.tier),
          multiplier, color: role.accent || friend.color,
          chills: !!role.chills, splash: role.lobs ? 78 : 0
        });
        friend.cooldown = (1.15 - friend.genome.speed * .72) / (role.rate * tierRate(friend.tier));
        tone(270 + friend.genome.power * 100, .025, "triangle", .018);
      }
    }

    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const shot = state.projectiles[i];
      if (!state.enemies.includes(shot.target)) { state.projectiles.splice(i, 1); continue; }
      const dx = shot.target.x - shot.x, dy = shot.target.y - shot.y, distance = Math.hypot(dx, dy);
      if (distance < Math.max(10, shot.speed * dt)) {
        shot.target.hp -= shot.damage; shot.target.hit = HIT_FLASH; burst(shot.x, shot.y, shot.color, 4); state.projectiles.splice(i, 1);
        if (shot.chills) shot.target.chill = 2.6;
        if (shot.splash) {
          for (const other of state.enemies) {
            if (other === shot.target) continue;
            if (Math.hypot(other.x - shot.x, other.y - shot.y) > shot.splash) continue;
            other.hp -= shot.damage * .5; other.hit = HIT_FLASH;
            if (other.hp <= 0) defeatEnemy(other);
          }
        }
        if (shot.multiplier > 1) {
          shot.target.counterHit = .7;
          state.particles.push({ x: shot.x, y: shot.y - 20, vx: 0, vy: -25, life: .8, text: "2.5×!", color: "#b9431e" });
        }
        if (shot.target.hp <= 0) defeatEnemy(shot.target);
      } else { shot.x += dx / distance * shot.speed * dt; shot.y += dy / distance * shot.speed * dt; }
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      enemy.phase += dt * 2; enemy.hit = Math.max(0, enemy.hit - dt);
      enemy.chill = Math.max(0, (enemy.chill || 0) - dt); enemy.counterHit = Math.max(0, (enemy.counterHit || 0) - dt);
      const defender = state.friends.find(friend => Math.hypot(friend.x - enemy.x, friend.y - enemy.y) < 42);
      if (defender) {
        defender.hurtFace = .4;
        defender.hp -= (10 + state.wave * 2) * (1 - defender.genome.defence * .65) * dt;
        if (defender.hp <= 0) {
          state.friends.splice(state.friends.indexOf(defender), 1);
          // Without updateUI() the shovel button kept its old enabled look after the
          // last friend died, so it invited a click that its own guard then ignored.
          if (!state.friends.length) state.shovelMode = false;
          burst(defender.x, defender.y, defender.color, 12);
          updateUI(); renderOffers(); announce(`${defender.name} needs a nap. Recruit a new friend!`);
        }
      } else {
        const crawl = enemy.chill > 0 ? .42 : 1;
        enemy.y += enemy.speed * dt * crawl;
        enemy.x = clamp(enemy.x + Math.sin(enemy.phase) * enemy.drift * 9 * dt * crawl, 24, width - 24);
      }
      if (enemy.y > height * GARDEN_BOTTOM) {
        state.enemies.splice(i, 1); state.health--; burst(enemy.x, height - 25, "#ff6d4a", 9); tone(95, .14, "sawtooth", .035); updateUI();
        if (state.health <= 0) { endGame(); break; }
      }
    }
    // Nectar collects itself. It bobs briefly over the friend that grew it, so you
    // can see where it came from, then sinks to the bottom centre of the field and
    // banks itself. Chasing drops around the field was busywork that competed
    // with the taps that actually matter - growing a friend and digging one up.
    for (let i = state.nectarDrops.length - 1; i >= 0; i--) {
      const drop = state.nectarDrops[i];
      drop.age += dt;
      if (drop.age < NECTAR_POP) {
        drop.y = drop.baseY + Math.sin(drop.age * 9) * 5;
        continue;
      }
      const home = nectarTarget();
      const dx = home.x - drop.x, dy = home.y - drop.y;
      const distance = Math.hypot(dx, dy) || 1;
      drop.speed = Math.min(NECTAR_SPEED * 4, (drop.speed || NECTAR_SPEED) + NECTAR_ACCEL * dt);
      if (distance <= Math.max(10, drop.speed * dt)) {
        state.nectarDrops.splice(i, 1);
        bankNectar(drop);
        continue;
      }
      drop.x += dx / distance * drop.speed * dt;
      drop.y += dy / distance * drop.speed * dt;
    }
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  function bankNectar(drop) {
    state.nectar += 1;
    state.sparks = Math.min(SPARK_CAP, state.sparks + 1);
    burst(nectarTarget().x, nectarTarget().y, drop ? drop.color : "#f4b942", 5);
    updateUI(); renderOffers(); tone(720, .06, "sine");
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


  // ---------------------------------------------------------------------------
  // Backdrops. Four scenes that rotate every five levels, so a long run travels
  // somewhere instead of staring at one gradient. All drawn in code - the game
  // still ships no image assets.
  //
  // Every sky stays light on purpose. Radicals are mid-tone coloured glyphs and
  // the garden is a row of small faces; a dramatic dark scene would look better
  // in a screenshot and be worse to actually play on.
  // ---------------------------------------------------------------------------
  const BACKDROPS = [
    // `far`/`mid`/`trim` dress the scene itself. `hills` and `grass` cover the
    // ground, and are kept green in every scene whatever the theme colour is: the
    // garden is a row of small plants and it has to read against what is under it.
    { name: "Bamboo Garden", sky: ["#f6dcc0", "#f7ecd2", "#dcead2", "#a9c99f"],
      far: "#c3d8b4", mid: "#8fb583", trim: "#6f9a67",
      hills: ["#c3d8b4", "#8fb583"], grass: "#6f9a67", scene: "bamboo" },
    { name: "Misty Peaks", sky: ["#f7d6d2", "#f3e2df", "#dfe8dd", "#aac6a6"],
      far: "#cdd3e0", mid: "#a8b2c6", trim: "#7d8aa4",
      hills: ["#c9dcc3", "#9bbd95"], grass: "#6f9a67", scene: "peaks" },
    { name: "Rice Terraces", sky: ["#f8e6bd", "#f6eed4", "#dcecd0", "#a6c79c"],
      far: "#cfdfae", mid: "#9dbd7f", trim: "#7ca063",
      hills: ["#cfdfae", "#9dbd7f"], grass: "#7ca063", scene: "terraces" },
    { name: "Blossom Grove", sky: ["#fadfe6", "#f8ecec", "#ddecdd", "#a9cbab"],
      far: "#e6c6d2", mid: "#c79db0", trim: "#a87c90",
      hills: ["#cfe0c6", "#a2c19d"], grass: "#7a9c78", scene: "blossom" },
  ];
  const LEVELS_PER_BACKDROP = 5;
  const backdropIndex = wave => Math.floor((Math.max(1, wave) - 1) / LEVELS_PER_BACKDROP) % BACKDROPS.length;

  // Scenery must not shuffle itself every frame, so its randomness is seeded from
  // the scene rather than drawn fresh.
  function seeded(seed) {
    let value = (seed * 2654435761) >>> 0;
    return () => (value = (value * 1664525 + 1013904223) >>> 0) / 4294967296;
  }

  function paintSky(pen, backdrop, w, h) {
    const sky = pen.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, backdrop.sky[0]);
    sky.addColorStop(GARDEN_TOP - .01, backdrop.sky[1]);
    sky.addColorStop(GARDEN_TOP, backdrop.sky[2]);
    sky.addColorStop(1, backdrop.sky[3]);
    pen.fillStyle = sky;
    pen.fillRect(0, 0, w, h);
  }

  // A soft hand-drawn ridge: a run of overlapping arcs rather than a straight line.
  function ridge(pen, w, baseY, amplitude, bumps, colour, random) {
    pen.fillStyle = colour;
    pen.beginPath();
    pen.moveTo(-10, h_of(baseY));
    for (let i = 0; i <= bumps; i += 1) {
      const x = (w + 20) * (i / bumps) - 10;
      const y = h_of(baseY) - Math.abs(Math.sin(i * 1.7 + random() * 3)) * amplitude;
      pen.quadraticCurveTo(x - (w / bumps) * .5, y - amplitude * .3, x, y);
    }
    pen.lineTo(w + 10, h_of(baseY) + 400);
    pen.lineTo(-10, h_of(baseY) + 400);
    pen.closePath();
    pen.fill();
    function h_of(v) { return v; }
  }

  function paintScene(pen, backdrop, w, h) {
    paintSky(pen, backdrop, w, h);
    const random = seeded(BACKDROPS.indexOf(backdrop) + 1);
    const horizon = h * GARDEN_TOP;

    if (backdrop.scene === "peaks") {
      // Three ranks of peaks, palest at the back.
      for (const [depth, alpha] of [[.62, .35], [.74, .55], [.86, .8]]) {
        pen.globalAlpha = alpha;
        pen.fillStyle = depth < .8 ? backdrop.far : backdrop.mid;
        pen.beginPath();
        pen.moveTo(-10, horizon);
        let x = -10;
        while (x < w + 40) {
          const span = 70 + random() * 120, peak = 40 + random() * 90 * depth;
          pen.lineTo(x + span / 2, horizon - peak * depth);
          pen.lineTo(x + span, horizon);
          x += span;
        }
        pen.lineTo(w + 40, horizon + 10); pen.lineTo(-10, horizon + 10);
        pen.closePath(); pen.fill();
      }
      pen.globalAlpha = 1;
    } else if (backdrop.scene === "terraces") {
      // Stacked paddy steps curving away.
      for (let step = 0; step < 5; step += 1) {
        const y = horizon - step * (horizon * .12) - 6;
        pen.globalAlpha = .28 + step * .1;
        pen.fillStyle = step < 3 ? backdrop.far : backdrop.mid;
        pen.beginPath();
        pen.moveTo(-10, y + 26);
        pen.quadraticCurveTo(w / 2, y - 14 - step * 3, w + 10, y + 26);
        pen.lineTo(w + 10, y + 60); pen.lineTo(-10, y + 60);
        pen.closePath(); pen.fill();
      }
      pen.globalAlpha = 1;
    } else {
      ridge(pen, w, horizon + 4, 26, 7, backdrop.hills[0], random);
      ridge(pen, w, horizon + 16, 18, 5, backdrop.hills[1], random);
    }

    if (backdrop.scene === "bamboo") {
      // Stalks down both edges, clear of the playfield.
      for (const side of [0, 1]) {
        for (let stalk = 0; stalk < 3; stalk += 1) {
          const x = side ? w - 14 - stalk * 26 - random() * 10 : 14 + stalk * 26 + random() * 10;
          const top = horizon * (.06 + random() * .2);
          pen.globalAlpha = .5 - stalk * .1;
          pen.strokeStyle = backdrop.trim;
          pen.lineWidth = 7 - stalk;
          pen.beginPath(); pen.moveTo(x, horizon + 30); pen.lineTo(x, top); pen.stroke();
          pen.lineWidth = 2;
          for (let node = top; node < horizon; node += 42) {
            pen.beginPath(); pen.moveTo(x - 5, node); pen.lineTo(x + 5, node); pen.stroke();
          }
          for (let leaf = 0; leaf < 4; leaf += 1) {
            const ly = top + 20 + leaf * 46, dir = leaf % 2 ? 1 : -1;
            pen.beginPath();
            pen.moveTo(x, ly);
            pen.quadraticCurveTo(x + dir * 34, ly - 14, x + dir * 52, ly + 8);
            pen.quadraticCurveTo(x + dir * 30, ly + 6, x, ly);
            pen.fillStyle = backdrop.trim; pen.fill();
          }
        }
      }
      pen.globalAlpha = 1;
    } else if (backdrop.scene === "blossom") {
      // Two boughs reaching in from the top corners.
      for (const side of [0, 1]) {
        const rootX = side ? w + 10 : -10, dir = side ? -1 : 1;
        pen.strokeStyle = backdrop.trim; pen.lineWidth = 9; pen.globalAlpha = .55;
        pen.beginPath();
        pen.moveTo(rootX, 10);
        pen.quadraticCurveTo(rootX + dir * 110, 40, rootX + dir * 210, 22);
        pen.stroke();
        pen.globalAlpha = .5;
        for (let i = 0; i < 14; i += 1) {
          const t = random(), bx = rootX + dir * (30 + t * 190), by = 16 + random() * 44;
          pen.fillStyle = "#f6c9d8";
          pen.beginPath(); pen.arc(bx, by, 5 + random() * 5, 0, Math.PI * 2); pen.fill();
        }
      }
      pen.globalAlpha = 1;
    }

    // Grass tufts along the ground, behind the planting rail.
    pen.strokeStyle = backdrop.grass; pen.globalAlpha = .3; pen.lineWidth = 2;
    for (let i = 0; i < 26; i += 1) {
      const x = random() * w, y = horizon + 18 + random() * (h - horizon - 30);
      pen.beginPath();
      pen.moveTo(x, y);
      pen.quadraticCurveTo(x + 3, y - 9, x + 7, y - 12);
      pen.stroke();
    }
    pen.globalAlpha = 1;
  }

  // The static half of a scene is painted once and reused. Rebuilt only when the
  // scene or the canvas size changes.
  let sceneryCache = null, sceneryUsable = true;
  function scenery(index, w, h) {
    if (!sceneryUsable) return null;
    const key = `${index}:${Math.round(w)}x${Math.round(h)}`;
    if (sceneryCache && sceneryCache.key === key) return sceneryCache.canvas;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w));
      canvas.height = Math.max(1, Math.round(h));
      const pen = canvas.getContext("2d");
      if (!pen || typeof pen.createLinearGradient !== "function") throw new Error("no 2d context");
      paintScene(pen, BACKDROPS[index], w, h);
      sceneryCache = { key, canvas };
      return canvas;
    } catch (_) {
      // No offscreen canvas here (a test double, or a browser refusing one), so
      // stop trying and let the caller paint the scene directly every frame.
      sceneryUsable = false;
      return null;
    }
  }

  // The moving half: clouds that drift, and petals in the grove. Cheap on purpose.
  function drawWeather(pen, backdrop, w, h, clock) {
    const horizon = h * GARDEN_TOP;
    const random = seeded(BACKDROPS.indexOf(backdrop) + 9);
    pen.globalAlpha = .5;
    pen.fillStyle = "#fffdf8";
    for (let i = 0; i < 4; i += 1) {
      const speed = 6 + random() * 10, size = 26 + random() * 26;
      const drift = reducedMotion.matches ? 0 : clock * speed;
      const x = ((random() * w + drift) % (w + 240)) - 120;
      const y = horizon * (.1 + random() * .45);
      pen.beginPath();
      pen.ellipse(x, y, size, size * .48, 0, 0, Math.PI * 2);
      pen.ellipse(x + size * .7, y + 5, size * .7, size * .38, 0, 0, Math.PI * 2);
      pen.ellipse(x - size * .7, y + 6, size * .6, size * .34, 0, 0, Math.PI * 2);
      pen.fill();
    }
    if (backdrop.scene === "blossom") {
      pen.fillStyle = "#f3b9cd";
      for (let i = 0; i < 14; i += 1) {
        const fall = reducedMotion.matches ? random() * horizon : (clock * (14 + random() * 22) + random() * 900) % (horizon + 60);
        const x = (random() * w + Math.sin(fall * .03 + i) * 18 + w) % w;
        pen.globalAlpha = .55 * (1 - fall / (horizon + 60));
        pen.beginPath();
        pen.ellipse(x, fall, 4, 2.6, fall * .02, 0, Math.PI * 2);
        pen.fill();
      }
    }
    pen.globalAlpha = 1;
  }

  function draw() {
    const w = width, h = height;
    ctx.clearRect(0, 0, w, h);
    const backdrop = BACKDROPS[backdropIndex(state.wave)];
    const painted = scenery(backdropIndex(state.wave), w, h);
    if (painted) ctx.drawImage(painted, 0, 0, w, h); else paintScene(ctx, backdrop, w, h);
    drawWeather(ctx, backdrop, w, h, state.time);
    // One planting rail, with sixteen visible slots. No extra boundary/grid lines.
    const plantingY = h * (GARDEN_TOP + GARDEN_BOTTOM) / 2;
    ctx.strokeStyle = "#71966a"; ctx.lineWidth = 2; ctx.setLineDash([5, 7]);
    ctx.beginPath(); ctx.moveTo(w * .07, plantingY + 27); ctx.lineTo(w * .93, plantingY + 27); ctx.stroke(); ctx.setLineDash([]);
    for (let slot = 0; slot < GARDEN_CAPACITY; slot++) {
      if (state.friends.some(friend => friend.slot === slot)) continue;
      const x = slotX(slot);
      // Sixteen fixed-width markers ran into each other on a narrow canvas and read
      // as one white smear. Size them to the gap they actually have.
      const spacing = slotX(1) - slotX(0);
      const markerX = Math.min(23, spacing * .42);
      ctx.fillStyle = "#ffffff70"; ctx.beginPath();
      ctx.ellipse(x, plantingY + 27, markerX, Math.max(3.5, markerX * .3), 0, 0, Math.PI * 2); ctx.fill();
    }

    labelBoxes.length = 0;
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
    const emojiScale = friendScale(); ctx.scale(emojiScale, emojiScale);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(23,34,28,.15)"; ctx.beginPath(); ctx.ellipse(0, 28 - bounce, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
    drawEmojiFace(ctx, friend, emotionFor(friend), friend.blink < 0);
    ctx.restore();
    ctx.fillStyle = "rgba(23,34,28,.2)"; ctx.fillRect(friend.x - 20, friend.y + 37, 40, 3);
    ctx.fillStyle = "#71b36a"; ctx.fillRect(friend.x - 20, friend.y + 37, 40 * clamp(friend.hp / friend.maxHp, 0, 1), 3);
    // A ring in the role's colour, and one pip per growth tier under it, so the
    // garden can be read at a glance without tapping anything.
    const accent = ROLES[friend.role]?.accent || "#7cc96b";
    ctx.strokeStyle = accent; ctx.lineWidth = friend.growFlash > 0 ? 3.5 : 1.8;
    ctx.globalAlpha = friend.growFlash > 0 ? 1 : .75;
    ctx.beginPath(); ctx.ellipse(friend.x, friend.y + 26, 21, 6.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    for (let pip = 0; pip < friend.tier; pip++) {
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(friend.x - 6 + pip * 6, friend.y + 45, 2.1, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawNectar(drop) {
    // Shrinks a little as it flies, so it reads as travelling away to the counter.
    const shrink = drop.age < NECTAR_POP ? 1 : .72;
    ctx.save(); ctx.translate(drop.x, drop.y);
    ctx.scale(friendScale() * shrink, friendScale() * shrink);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#f4b942"; ctx.strokeStyle = "#17221c"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.bezierCurveTo(10, -2, 8, 8, 0, 11); ctx.bezierCurveTo(-8, 8, -10, -2, 0, -10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff7c2"; ctx.beginPath(); ctx.arc(-3, -3, 2, 0, Math.PI * 2); ctx.fill();
    if (drop.age < NECTAR_POP) {
      ctx.font = '500 8px "DM Mono", monospace'; ctx.textAlign = "center"; ctx.fillStyle = "#17221c"; ctx.fillText("+1", 0, 22);
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  // Feed a planted friend a couple of sparks and it grows: tougher, harder hitting,
  // faster. Every level is then a choice between a wider garden and a stronger one.
  // Investing in a lineage is also the clearest statement of preference the game
  // can read, so it counts towards that lineage's fitness.
  function growFriend(friend) {
    if (friend.tier >= MAX_TIER) { announce(`${friend.name} is fully grown`); return false; }
    const cost = GROW_COSTS[friend.tier];
    if (state.sparks < cost) { announce(`${cost} sparks to grow ${friend.name}`); return false; }
    state.sparks -= cost;
    friend.tier += 1;
    friend.maxHp = baseHp(friend.genome, friend.tier);
    friend.hp = friend.maxHp;      // growing mends it as well
    friend.growFlash = .8;
    burst(friend.x, friend.y - 10, ROLES[friend.role]?.accent || "#7cc96b", 14);
    rewardGrowth(friend);
    updateUI(); renderOffers();
    tone(520, .07, "sine"); setTimeout(() => tone(700, .09, "sine"), 70);
    announce(`${friend.name} grew to tier ${friend.tier}`);
    return true;
  }

  function rewardGrowth(friend) {
    const line = memory.lineages.find(item => item.id === friend.id);
    if (!line) return;
    line.fitness = clamp(line.fitness + GROW_FITNESS, FITNESS_FLOOR, FITNESS_CAP);
    trimLineages();
    saveMemory();
  }

  function onArenaTap(event) {
    if (!state || state.over) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width, scaleY = height / rect.height;
    const x = (event.clientX - (rect.left || 0)) * scaleX, y = (event.clientY - (rect.top || 0)) * scaleY;
    // An armed shovel over an empty garden has nothing to do, so let the tap fall
    // through to Nectar rather than vanishing.
    if (state.shovelMode && !state.friends.length) state.shovelMode = false;
    if (state.shovelMode) {
      // Pick the friend NEAREST the tap, not the first one in the array that happens
      // to be in range. Sixteen slots are close enough together that their hit areas
      // overlap, and since slots are assigned randomly the array order has nothing to
      // do with where things are on screen - so the old findIndex dug up an
      // effectively arbitrary one of the two you were pointing between.
      const reach = Math.max(24, width / 24);
      let target = null, best = Infinity;
      for (const friend of state.friends) {
        const distance = Math.hypot(friend.x - x, friend.y - y);
        if (distance < reach && distance < best) { target = friend; best = distance; }
      }
      if (target) {
        state.friends.splice(state.friends.indexOf(target), 1);
        burst(target.x, target.y, "#d18b55", 12); state.shovelMode = false;
        updateUI(); renderOffers(); tone(180, .08, "triangle"); announce(`${target.name} was dug up`);
      }
      return;
    }
    // Nectar banks itself now, so a tap on the field can only mean one thing: grow
    // whatever is under it. No more reaching for a friend and pocketing a drop
    // that happened to drift across.
    const reach = Math.max(26, width / 22);
    let grown = null, best = Infinity;
    for (const friend of state.friends) {
      const distance = Math.hypot(friend.x - x, friend.y - y);
      if (distance < reach && distance < best) { grown = friend; best = distance; }
    }
    if (grown) growFriend(grown);
  }

  // Runs every frame, including while the game is paused or not yet started, so a
  // candidate's motion genes are visible before you spend a spark on it.
  function drawOfferPreviews(clock) {
    for (const offer of state.offers) {
      const art = offer.art;
      if (!art) continue;
      const pen = art.getContext("2d");
      const g = offer.genome;
      pen.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
      pen.save();
      pen.translate(PREVIEW_SIZE / 2, PREVIEW_SIZE / 2);
      // A quarter of the arena's amplitude. The preview still has to show off the
      // motion genes - that is what you are selecting on - but three portraits
      // bobbing at full tilt made the tray restless to read and to aim at.
      const bounce = reducedMotion.matches ? 0 : Math.sin(clock * (1.6 + g.speed * 1.6)) * g.bounce * 1.8;
      const wobble = (reducedMotion.matches ? 0 : Math.sin(clock * 1.2) * g.wobble * .05) + g.tilt * .6;
      pen.translate(0, bounce);
      pen.rotate(wobble);
      pen.scale(PREVIEW_SCALE, PREVIEW_SCALE);
      drawEmojiFace(pen, offer, previewEmotion(offer));
      pen.restore();
    }
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

  // Emoji fill their glyph box very differently. An apple is a solid blob edge to
  // edge, but a sun is a small disc surrounded by rays, so a fixed-size pair of
  // eyes drawn at the centre spills straight off the body and onto the background.
  // Rather than hand-tune the awkward ones, measure the glyph once: render it
  // offscreen and find how wide the opaque body actually is at the eye line.
  const FACE_REFERENCE = 38;   // body width, in px, that the face geometry assumes
  const faceFits = new Map();
  function faceFit(glyph) {
    if (faceFits.has(glyph)) return faceFits.get(glyph);
    let fit = 1;
    try {
      const size = 48, pad = 30, extent = size + pad * 2;
      const probe = document.createElement("canvas");
      probe.width = probe.height = extent;
      const pen = probe.getContext("2d");
      // Confirm this really is a canvas we can read pixels back from BEFORE drawing
      // anything on it. Without the check, a stand-in context (a test double, or a
      // browser that refuses readback) still gets painted on, and the measurement
      // draw is indistinguishable from a real one.
      const readback = pen.getImageData(0, 0, 1, 1);
      if (!readback || !readback.data) throw new Error("no pixel readback");
      pen.textAlign = "center"; pen.textBaseline = "middle";
      pen.font = `${size}px ${EMOJI_FONT}`;
      pen.fillText(glyph, extent / 2, extent / 2);
      const centre = Math.round(extent / 2);
      const row = pen.getImageData(0, centre - 8, extent, 1).data;
      const solid = index => row[index * 4 + 3] > 40;
      if (solid(centre)) {
        let left = centre, right = centre;
        while (left > 0 && solid(left - 1)) left -= 1;
        while (right < extent - 1 && solid(right + 1)) right += 1;
        fit = clamp((right - left) / FACE_REFERENCE, .5, 1);
      } else {
        // Nothing solid under the middle at all (an arc, a ring): keep the face
        // small so it stays on whatever the glyph does have.
        fit = .62;
      }
    } catch (_) {
      fit = 1;   // no real canvas (tests, or a blocked readback) - assume it fits
    }
    faceFits.set(glyph, fit);
    return fit;
  }

  // Shared by planted defenders and the giant victory character; every emoji gets a full face.
  function drawEmojiFace(pen, friend, emotion, blink = false) {
    const g = friend.genome, scared = emotion === "scared", hurt = emotion === "hurt", joy = emotion === "joy";
    pen.save(); pen.globalAlpha = 1;
    pen.fillStyle = "#17221c";
    pen.font = `48px ${EMOJI_FONT}`;
    pen.textAlign = "center"; pen.textBaseline = "middle"; pen.fillText(friend.emoji, 0, 0);
    // Everything below is scaled to the body we actually measured, so the eyes sit
    // on the emoji rather than beside it.
    const fit = faceFit(friend.emoji);
    const eyeSize = (5 + g.eyeSize * 5) * (scared ? 1.15 : 1) * fit, gap = (4 + g.eyeGap * 9) * fit;
    pen.lineCap = "round";
    for (const side of [-1, 1]) {
      pen.fillStyle = "white"; pen.strokeStyle = "#17221c"; pen.lineWidth = 1.3; pen.beginPath();
      pen.ellipse(side * gap, -8 * fit, eyeSize, blink || hurt ? 1 : eyeSize * 1.18, 0, 0, Math.PI * 2); pen.fill(); pen.stroke();
      if (!blink && !hurt) {
        pen.fillStyle = "#17221c"; pen.beginPath();
        if (joy) pen.arc(side * gap, -5 * fit, 3 * fit, Math.PI, Math.PI * 2);
        else pen.arc(side * gap, -6 * fit, (scared ? 1.6 : 2.2) * fit, 0, Math.PI * 2);
        if (joy) pen.stroke(); else pen.fill();
      }
      const browY = (-12 * fit) - eyeSize * 1.18;
      pen.beginPath(); pen.moveTo(side * gap - 4 * fit, browY + (emotion === "determined" ? -side * 2 : 0));
      pen.lineTo(side * gap + 4 * fit, browY + (emotion === "determined" ? side * 2 : scared ? -side * 2 : 0)); pen.stroke();
      if (joy || emotion === "happy") {
        pen.fillStyle = "#f78999"; pen.beginPath(); pen.ellipse(side * (gap + 5 * fit), 3 * fit, 4 * fit, 2 * fit, 0, 0, Math.PI * 2); pen.fill();
      }
    }
    pen.strokeStyle = "#17221c"; pen.fillStyle = "#17221c"; pen.lineWidth = 1.5; pen.beginPath();
    if (scared || emotion === "curious") {
      pen.ellipse(0, 9 * fit, (scared ? 4 : 2.5) * fit, (scared ? 6 : 3.5) * fit, 0, 0, Math.PI * 2); pen.fill();
    } else if (hurt) {
      pen.moveTo(-6 * fit, 11 * fit); pen.quadraticCurveTo(0, 3 * fit, 6 * fit, 11 * fit); pen.stroke();
    } else if (emotion === "determined") {
      pen.fillStyle = "white"; pen.rect(-6 * fit, 7 * fit, 12 * fit, 5 * fit); pen.fill(); pen.stroke();
    } else {
      pen.moveTo(-7 * fit, 6 * fit); pen.lineTo(7 * fit, 6 * fit);
      pen.quadraticCurveTo(0, (joy ? 25 : 20) * fit, -7 * fit, 6 * fit); pen.fill(); pen.stroke();
      pen.fillStyle = "#ff879b"; pen.beginPath();
      pen.ellipse(0, (joy ? 13 : 11) * fit, 3 * fit, 2 * fit, 0, 0, Math.PI * 2); pen.fill();
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
    // Fade the blink out over its lifetime so it reads as a flash rather than a
    // change of costume.
    const flash = clamp(enemy.hit / HIT_FLASH, 0, 1);
    if (flash > 0) { ctx.shadowColor = "white"; ctx.shadowBlur = 16 * flash; }
    else if (enemy.chill > 0) { ctx.shadowColor = "#6fb7e8"; ctx.shadowBlur = 14; }
    // Fredoka carries no CJK glyphs, so name the CJK families explicitly instead of
    // silently falling through to whatever `sans-serif` happens to resolve to.
    ctx.font = `700 ${enemy.size}px ${HAN_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    // A radical is ALWAYS drawn in its own meaning colour. Being hit or chilled used
    // to replace that colour outright - orange for a moment, icy blue for the whole
    // 2.6s of a chill - so you could not tell what was coming at you. Both states are
    // shown on top of the real colour now, never instead of it.
    ctx.fillStyle = radicalColor(enemy.char);
    ctx.fillText(radicalGlyph(enemy.char), 0, 0);
    if (flash > 0) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = flash * .8;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(radicalGlyph(enemy.char), 0, 0);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.fillStyle = "rgba(23,34,28,.17)"; ctx.fillRect(enemy.x - 15, enemy.y - enemy.size * .7, 30, 2);
    ctx.fillStyle = "#ff6d4a"; ctx.fillRect(enemy.x - 15, enemy.y - enemy.size * .7, 30 * clamp(enemy.hp / enemy.maxHp, 0, 1), 2);
    ctx.font = '500 9px "DM Mono", monospace'; ctx.textAlign = "center"; ctx.textBaseline = "top";
    const label = radicalLabel(enemy.char).toUpperCase();
    const labelWidth = ctx.measureText(label).width + 8;
    const labelX = clamp(enemy.x, labelWidth / 2 + 2, width - labelWidth / 2 - 2);
    // Two radicals close together used to print their names on top of each other.
    // Step this one down until it has a clear line; give up rather than add to a pile.
    let labelY = enemy.y + enemy.size * .52;
    const overlaps = y => labelBoxes.some(box =>
      Math.abs(box.y - y) < 13 && Math.abs(box.x - labelX) < (box.w + labelWidth) / 2);
    let attempts = 0;
    while (overlaps(labelY) && attempts++ < 4) labelY += 14;
    if (overlaps(labelY)) return;
    labelBoxes.push({ x: labelX, y: labelY, w: labelWidth });
    ctx.fillStyle = "rgba(255,253,247,.85)"; ctx.fillRect(labelX - labelWidth / 2, labelY, labelWidth, 13);
    ctx.fillStyle = "#17221c"; ctx.fillText(label, labelX, labelY + 2);

  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const oldW = width, oldH = height;
    // A hidden or not-yet-laid-out canvas reports 0x0. Rescaling by width/0 gave
    // Infinity, then NaN, and every friend was silently lost for the rest of the
    // run. Keep the last good size instead; the next real layout pass fixes it.
    if (!(rect.width > 0) || !(rect.height > 0)) return;
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state) {
      const sx = oldW > 0 ? width / oldW : 1, sy = oldH > 0 ? height / oldH : 1;
      if (!Number.isFinite(sx) || !Number.isFinite(sy)) return;
      for (const entity of [...state.friends, ...state.enemies, ...state.projectiles, ...state.particles, ...state.nectarDrops]) { entity.x *= sx; entity.y *= sy; if (entity.baseY) entity.baseY *= sy; }
    }
  }

  function updateUI() {
    ui.wave.textContent = state.wave; ui.health.textContent = state.health; ui.sparks.textContent = state.sparks; ui.nectar.textContent = state.nectar;
    ui.best.textContent = memory.bestWave || 0; ui.generation.textContent = String(state.generation).padStart(2, "0");
    ui.reroll.disabled = trayLocked() || state.sparks < 1 || (!state.started && state.sparks === 1);
    ui.shovel.disabled = state.over || (state.friends.length === 0 && !state.shovelMode);
    ui.shovel.setAttribute("aria-pressed", String(state.shovelMode));
    ui.pause.disabled = state.over || !state.started;
    ui.pause.textContent = state.paused ? "Resume" : "Pause";
    ui.pause.setAttribute("aria-pressed", String(state.paused));
    ui.victory.classList.toggle("is-paused", state.paused || document.hidden);
    ui.gardenLabel.textContent = state.started
      ? `Level ${state.wave} · one planting line`
      : `Level ${state.wave} · choose your garden`;
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

  ui.reroll.addEventListener("click", () => { if (trayLocked() || state.sparks < 1 || (!state.started && state.sparks === 1)) return; state.sparks--; rememberChoices(null); refillOffers(); updateUI(); tone(350, .05); });
  // Arming needs a garden to dig in; putting the shovel away never does. The old
  // guard blocked both, so if your last friend died while the shovel was out you
  // were stuck: every canvas tap was swallowed by the shovel branch, Nectar could
  // not be collected, and the button that would have released you did nothing.
  ui.shovel.addEventListener("click", () => {
    if (state.over) return;
    if (!state.shovelMode && state.friends.length === 0) return;
    state.shovelMode = !state.shovelMode;
    updateUI();
    announce(state.shovelMode ? "Pick a friend to dig up" : "Shovel put away");
  });
  ui.pause.addEventListener("click", () => { if (state.over || !state.started) return; state.paused = !state.paused; updateUI(); announce(state.paused ? "Garden paused" : "Here come the radicals!"); });
  ui.forget.addEventListener("click", () => { memory = { lineages: [], generation: 1, bestWave: 0 }; saveMemory(); start(); announce("Evolutionary memory cleared"); });
  ui.sound.addEventListener("click", () => { muted = !muted; ui.sound.classList.toggle("muted", muted); ui.sound.setAttribute("aria-label", muted ? "Turn sound on" : "Turn sound off"); if (!muted) tone(520, .06); });
  ui.playAgain.addEventListener("click", start);
  canvas.addEventListener("pointerdown", onArenaTap);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { lastTime = performance.now(); updateUI(); });

  let previewClock = 0;
  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, .035); lastTime = now;
    previewClock += dt;
    update(dt); draw(); drawOfferPreviews(previewClock); requestAnimationFrame(frame);
  }

  start(); requestAnimationFrame(frame);
})();
