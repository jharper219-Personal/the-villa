// Seeded random numbers. Every villa is reproducible from its seed, so a season code can be
// shared and a friend can cast the exact same board.
export function hashStr(s) {
  let h = 2166136261 >>> 0;
  const str = String(s);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

export function makeRng(seed) {
  let a = (seed == null ? (Date.now() ^ (Math.random() * 0xffffffff)) : (typeof seed === 'string' ? hashStr(seed) : seed)) >>> 0;
  const r = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.chance = (p) => r() < p;
  r.shuffle = (arr) => { const c = arr.slice(); for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
  r.gauss = (mu = 0, sd = 1) => { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  /** items: [[weight, value], ...] */
  r.weighted = (items) => { const tot = items.reduce((s, x) => s + x[0], 0); let t = r() * tot; for (const [w, v] of items) { t -= w; if (t <= 0) return v; } return items[items.length - 1][1]; };
  /** pick n distinct items */
  r.sample = (arr, n) => r.shuffle(arr).slice(0, Math.max(0, Math.min(n, arr.length)));
  r.state = () => a;
  return r;
}

/** A short, shareable season code: six letters and digits, no ambiguous characters. */
export function seasonCode(rng) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += A[Math.floor(rng() * A.length)];
  return s;
}
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
