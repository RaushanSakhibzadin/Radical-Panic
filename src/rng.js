// Small deterministic-ish RNG helpers. Nothing here touches the DOM, so the
// genetics module can be exercised from plain node if you want to simulate
// a few thousand generations offline.

export function rand(min = 0, max = 1) {
  return min + Math.random() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Box-Muller. Mutation wants a bell curve, not a flat one: most children
// should look like their parent, a few should be strange.
export function gauss(mean = 0, sigma = 1) {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Weighted choice. `weightOf` may return <= 0; those entries are skipped
// unless every entry is dead, in which case we fall back to uniform.
export function weighted(list, weightOf) {
  let total = 0;
  const weights = list.map((item, i) => {
    const w = Math.max(0, weightOf(item, i));
    total += w;
    return w;
  });
  if (total <= 0) return pick(list);
  let roll = Math.random() * total;
  for (let i = 0; i < list.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return list[i];
  }
  return list[list.length - 1];
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
