// ---------------------------------------------------------------------------
// Every face in this game is drawn here, at runtime, from a genome.
//
// The emoji glyph underneath is deliberately eyeless (see src/data.js), so
// these eyes are the *only* eyes on screen. That means an individual's
// expression is a heritable trait: eye size, spacing, pupil size, brow angle,
// mouth width and blink rate all live in the genome and all mutate. If you
// keep planting the ones with huge round eyes, the roster drifts towards huge
// round eyes, permanently.
//
// Mood is layered on top and is NOT heritable — it is the current situation
// (hurt, terrified, happy) bending the inherited face.
// ---------------------------------------------------------------------------

import { clamp, lerp } from './rng.js';

export const MOODS = ['calm', 'cute', 'scared', 'hurt', 'angry', 'dizzy'];

// Per-mood multipliers/offsets applied on top of the inherited face.
const MOOD = {
  calm:   { eye: 1.00, pupil: 1.00, brow: 0.0,  browLift: 0.00, mouth: 0.35, open: 0.10, wob: 0.0 },
  cute:   { eye: 1.18, pupil: 1.35, brow: 0.1,  browLift: 0.03, mouth: 0.70, open: 0.20, wob: 0.0 },
  scared: { eye: 1.45, pupil: 0.45, brow: 0.9,  browLift: 0.07, mouth: -0.8, open: 0.55, wob: 1.0 },
  hurt:   { eye: 0.55, pupil: 0.70, brow: -0.7, browLift: 0.00, mouth: -1.0, open: 0.35, wob: 0.6 },
  angry:  { eye: 0.85, pupil: 0.80, brow: -1.0, browLift: -0.02, mouth: -0.5, open: 0.25, wob: 0.0 },
  dizzy:  { eye: 1.05, pupil: 0.60, brow: 0.3,  browLift: 0.02, mouth: 0.10, open: 0.40, wob: 0.8 },
};

// Work out how a defender feels right now. Threat is 0..1 (how close the
// nearest radical is), hpFrac is 0..1.
export function moodFor(hpFrac, threat, justHit) {
  if (justHit > 0) return 'hurt';
  if (hpFrac < 0.3) return 'dizzy';
  if (threat > 0.6) return 'scared';
  if (threat > 0.28) return 'angry';
  if (hpFrac > 0.92) return 'cute';
  return 'calm';
}

// Blink envelope: mostly 1 (open), briefly 0 (shut). `blink` is the genome's
// rate; phase keeps siblings from blinking in lockstep.
function blinkAmount(t, rate, phase) {
  const period = 1 / clamp(rate, 0.05, 2);
  const local = ((t + phase * period) % period) / period;
  const shutFor = 0.07;
  if (local > 1 - shutFor) {
    const k = (local - (1 - shutFor)) / shutFor;   // 0..1 across the blink
    return Math.abs(Math.cos(k * Math.PI));        // 1 -> 0 -> 1
  }
  return 1;
}

/**
 * Draw a face centred on (0,0) in the current transform, sized to `size`.
 * Call inside ctx.save()/restore() with the body transform already applied.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} size      body size in px
 * @param {object} g         genome
 * @param {object} opts      { mood, t, phase, lookX, lookY, ink }
 */
export function drawFace(ctx, size, g, opts = {}) {
  const {
    mood = 'calm',
    t = 0,
    phase = 0,
    lookX = 0,      // -1..1, where the eyes are pointing
    lookY = 0,
    ink = '#1a1526',
  } = opts;

  const m = MOOD[mood] || MOOD.calm;
  const wob = m.wob * Math.sin(t * 17 + phase * 9) * size * 0.012;

  ctx.save();
  ctx.rotate(g.tilt * 0.5);
  ctx.translate(wob, 0);

  const gap = g.eyeGap * size;
  const eyeY = g.eyeY * size - size * 0.06;
  const baseR = g.eyeSize * size * m.eye;
  const lid = blinkAmount(t, g.blink, phase);
  // `squint` flattens the eye permanently; blinking flattens it momentarily.
  const squash = lerp(1, 0.32, g.squint * 0.7) * lid;

  // --- eyeballs ---
  for (const side of [-1, 1]) {
    const ex = side * gap;
    const rx = baseR;
    const ry = Math.max(baseR * 0.06, baseR * squash);

    ctx.beginPath();
    ctx.ellipse(ex, eyeY, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = Math.max(1, size * 0.018);
    ctx.strokeStyle = ink;
    ctx.stroke();

    if (lid > 0.25) {
      // pupil, offset towards whatever it is looking at, clipped inside
      const pr = rx * clamp(g.pupil * m.pupil, 0.12, 0.92) * 0.85;
      const maxOff = Math.max(0, rx - pr - rx * 0.08);
      const px = ex + clamp(lookX, -1, 1) * maxOff;
      const py = eyeY + clamp(lookY, -1, 1) * Math.max(0, ry - pr * squash) * 0.9;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, rx, ry, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = ink;
      ctx.fill();
      // catchlight — the single thing that makes it read as alive
      ctx.beginPath();
      ctx.arc(px - pr * 0.33, py - pr * 0.36, Math.max(0.6, pr * 0.32), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fill();
      ctx.restore();
    }
  }

  // --- eyebrows ---
  if (g.browW > 0.22) {
    const angle = g.browA + m.brow;
    const by = eyeY - baseR - (g.browY + m.browLift) * size * 0.35;
    const w = lerp(baseR * 0.7, baseR * 1.5, g.browW);
    ctx.lineWidth = Math.max(1.2, size * 0.026 * g.browW);
    ctx.strokeStyle = ink;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const ex = side * gap;
      // Inner end rises for fear, drops for anger. `side` flips it so both
      // brows point the same way relative to the nose.
      const tiltY = angle * size * 0.05 * side;
      ctx.beginPath();
      ctx.moveTo(ex - w, by + tiltY);
      ctx.lineTo(ex + w, by - tiltY);
      ctx.stroke();
    }
  }

  // --- mouth ---
  const my = eyeY + (g.mouthY + 0.12) * size;
  const mw = lerp(size * 0.06, size * 0.2, g.mouth);
  const curve = m.mouth;          // +1 smile, -1 frown
  const open = m.open * size * 0.09 * (0.5 + g.mouth);

  ctx.lineWidth = Math.max(1.2, size * 0.028);
  ctx.strokeStyle = ink;
  ctx.lineJoin = 'round';

  if (open > size * 0.02) {
    // open mouth: a filled blob, rounder when scared, flatter when cross
    ctx.beginPath();
    ctx.ellipse(0, my + open * 0.3, mw * 0.85, open * 1.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#5b2a3a';
    ctx.fill();
    ctx.stroke();
    // tongue
    ctx.beginPath();
    ctx.ellipse(0, my + open * 1.1, mw * 0.45, open * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#e57373';
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-mw, my);
    ctx.quadraticCurveTo(0, my + curve * size * 0.1, mw, my);
    ctx.stroke();
  }

  // --- blush, for the cute ones only ---
  if (mood === 'cute' || mood === 'scared') {
    ctx.globalAlpha = mood === 'cute' ? 0.45 : 0.3;
    ctx.fillStyle = mood === 'cute' ? '#ff8a9b' : '#8ec9ff';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * (gap + baseR * 0.9), eyeY + baseR * 1.1,
        baseR * 0.62, baseR * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // --- sweat drop when terrified ---
  if (mood === 'scared' || mood === 'dizzy') {
    const drop = ((t * 0.9 + phase) % 1);
    const dy = eyeY - baseR + drop * size * 0.5;
    ctx.globalAlpha = 1 - drop * 0.8;
    ctx.beginPath();
    ctx.ellipse(gap + baseR * 1.5, dy, size * 0.028, size * 0.042, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#7fd4ff';
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
