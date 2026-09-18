// Persistence. The gene pool is the save file — waves and score are not worth
// keeping, but a roster you spent an evening breeding is.

import { GENOME_VERSION, emptyPool } from './genetics.js';

const KEY = 'radical-panic/pool/v1';

export function loadPool() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyPool();
    const pool = JSON.parse(raw);
    if (!pool || pool.version !== GENOME_VERSION || !pool.species) return emptyPool();
    return pool;
  } catch (err) {
    console.warn('[radical-panic] could not read saved gene pool, starting fresh', err);
    return emptyPool();
  }
}

let pending = null;
export function savePool(pool) {
  // Debounced: planting happens in bursts and localStorage writes are sync.
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(pool));
    } catch (err) {
      console.warn('[radical-panic] could not save gene pool', err);
    }
  }, 400);
}

export function resetPool() {
  try { localStorage.removeItem(KEY); } catch (err) { /* nothing to do */ }
  return emptyPool();
}

// Export/import so people can trade evolved rosters. A pool is small JSON and
// contains nothing but numbers — safe to paste anywhere.
export function exportPool(pool) {
  const blob = new Blob([JSON.stringify(pool, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `radical-panic-genepool-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function importPool(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const pool = JSON.parse(String(reader.result));
        if (!pool || !pool.species) throw new Error('not a gene pool');
        pool.version = GENOME_VERSION;
        resolve(pool);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
