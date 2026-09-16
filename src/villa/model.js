// The villa state and the small helpers everything else uses to read and move it.
// Plain JSON all the way down so a season can be saved mid-episode and picked back up.
import { clamp } from './rng.js';

export const SEASON_DAYS = 22;
export const PRIZE = 100000;
export const PUBLIC = 'America';
export const VILLA_SIZE = 5; // couples at the start

export function emptyState({ seed, code, mode, playerId = null }) {
  return {
    v: 1, seed, code, mode, playerId,
    day: 0, phase: 'cast', started: Date.now(),
    cast: {}, inVilla: [], couples: [], rel: {}, pop: {},
    dumped: [], casa: null, queue: [], episode: null, log: [], pending: null,
    stats: { kisses: 0, arguments: 0, recouplings: 0, bombshells: 0, dumpings: 0, texts: 0, dates: 0, stuck: 0, twisted: 0, challenges: 0 },
    history: [], winner: null, usedNames: [], rngState: null, final: null, awards: null,
    player: null, // islander mode: { energy, actions, chats, score bits... }
  };
}

export const P = (S, id) => S.cast[id];
export const girls = (S) => S.inVilla.filter((id) => S.cast[id].gender === 'f');
export const boys = (S) => S.inVilla.filter((id) => S.cast[id].gender === 'm');
export const ofGender = (S, g) => S.inVilla.filter((id) => S.cast[id].gender === g);
export const coupleOf = (S, id) => S.couples.find((c) => c.a === id || c.b === id) || null;
export const partnerOf = (S, id) => { const c = coupleOf(S, id); return c ? (c.a === id ? c.b : c.a) : null; };
export const isCoupled = (S, id) => !!coupleOf(S, id);
export const singles = (S) => S.inVilla.filter((id) => !isCoupled(S, id));
export const singlesOf = (S, g) => singles(S).filter((id) => S.cast[id].gender === g);
export const inVilla = (S, id) => S.inVilla.includes(id);
export const opposite = (S, id) => S.inVilla.filter((x) => S.cast[x].gender !== S.cast[id].gender);
export const sameGender = (S, id) => S.inVilla.filter((x) => x !== id && S.cast[x].gender === S.cast[id].gender);

/** Directional relationship a -> b. */
export function rel(S, a, b) {
  if (!S.rel[a]) S.rel[a] = {};
  if (!S.rel[a][b]) S.rel[a][b] = { spark: 30, trust: 40, tension: 0 };
  return S.rel[a][b];
}
export function bump(S, a, b, d) {
  const r = rel(S, a, b);
  if (d.spark) r.spark = clamp(r.spark + d.spark, 0, 100);
  if (d.trust) r.trust = clamp(r.trust + d.trust, 0, 100);
  if (d.tension) r.tension = clamp(r.tension + d.tension, 0, 100);
  return r;
}
export function bumpBoth(S, a, b, d) { bump(S, a, b, d); bump(S, b, a, d); }
export const spark = (S, a, b) => rel(S, a, b).spark;
export const mutual = (S, a, b) => (rel(S, a, b).spark + rel(S, b, a).spark) / 2;
export const trustBetween = (S, a, b) => (rel(S, a, b).trust + rel(S, b, a).trust) / 2;
export const tensionBetween = (S, a, b) => (rel(S, a, b).tension + rel(S, b, a).tension) / 2;

/** How solid a couple looks from the outside, 0..100. */
export function strength(S, c) {
  if (!c) return 0;
  const days = Math.min(S.day - (c.since || 0), 10);
  return clamp(Math.round(mutual(S, c.a, c.b) * 0.5 + trustBetween(S, c.a, c.b) * 0.35 + days * 1.5 - tensionBetween(S, c.a, c.b) * 0.2), 0, 100);
}
export const strengthLabel = (v) => (v >= 80 ? 'Locked in 🔒' : v >= 65 ? 'Solid 💗' : v >= 50 ? 'Warming up 🌤️' : v >= 35 ? 'Wobbling 🫠' : 'Hanging by a thread 🧵');

export function popBump(S, id, d) { if (S.pop[id] == null) S.pop[id] = 50; S.pop[id] = clamp(Math.round(S.pop[id] + d), 1, 99); }
export const pop = (S, id) => S.pop[id] ?? 50;
export const popLabel = (v) => (v >= 80 ? 'Fan favorite' : v >= 65 ? 'Loved' : v >= 50 ? 'Liked' : v >= 35 ? 'Divisive' : 'In trouble');

export function setCouple(S, f, m) {
  S.couples = S.couples.filter((c) => c.a !== f && c.b !== m && c.a !== m && c.b !== f);
  S.couples.push({ a: f, b: m, since: S.day });
}
export function uncouple(S, id) { S.couples = S.couples.filter((c) => c.a !== id && c.b !== id); }
export function removeFromVilla(S, id, how) {
  uncouple(S, id);
  S.inVilla = S.inVilla.filter((x) => x !== id);
  S.dumped.push({ id, day: S.day, how });
  S.stats.dumpings++;
}
export function addToVilla(S, p) {
  S.cast[p.id] = p;
  if (!S.inVilla.includes(p.id)) S.inVilla.push(p.id);
  if (S.pop[p.id] == null) S.pop[p.id] = initialPop(p);
  if (!S.usedNames.includes(p.name)) S.usedNames.push(p.name);
}
export function initialPop(p) {
  const a = p.attrs;
  return clamp(Math.round(36 + a.charm * 0.14 + a.funny * 0.14 + a.loyal * 0.08 + a.eq * 0.05 - a.drama * 0.06), 25, 72);
}

// ---------- the episode being written ----------
export function beginEpisode(S, title) {
  S.episode = { day: S.day, title, scenes: [], captions: [], results: {}, fx: {} };
}
/**
 * scene: { where, kind, text, who, fx, reveal, big }
 *  where: firepit | pool | kitchen | terrace | beachhut | hideaway | bedroom | garden | gym | casa | dates | villa
 *  kind:  narrator | text | chat | flirt | kiss | argument | gossip | confession | arrival | recouple | dump | challenge | date | movie | vote | final | twist
 */
export function scene(S, s) {
  if (!S.episode) beginEpisode(S, `Day ${S.day}`);
  const sc = Object.assign({ where: 'villa', kind: 'narrator', who: [], fx: null, reveal: false, big: false }, s);
  if (sc.fx) for (const [id, d] of Object.entries(sc.fx)) { popBump(S, id, d); S.episode.fx[id] = (S.episode.fx[id] || 0) + d; }
  S.episode.scenes.push(sc);
  return sc;
}
export function caption(S, text, tone = 'neutral') { if (S.episode) S.episode.captions.push({ text, tone }); }
export function moment(S, m) { S.history.push(Object.assign({ day: S.day }, m)); }
export function endEpisode(S) {
  if (!S.episode) return null;
  const ep = S.episode;
  ep.couples = S.couples.map((c) => ({ a: c.a, b: c.b, strength: strength(S, c) }));
  ep.pop = Object.fromEntries(S.inVilla.map((id) => [id, pop(S, id)]));
  ep.inVilla = S.inVilla.slice();
  S.log.push(ep);
  S.episode = null;
  return ep;
}

export const WHERE_LABEL = { firepit: '🔥 Fire pit', pool: '🏖️ Pool', kitchen: '🍳 Kitchen', terrace: '🌙 Terrace', beachhut: '🎥 Beach Hut', hideaway: '🔑 Hideaway', bedroom: '🛏️ Bedroom', garden: '🌴 Garden', gym: '🏋️ Gym', casa: '🏠 Casa Amor', dates: '🥂 Date', villa: '🏝️ Villa', daybeds: '☀️ Daybeds', balcony: '🌅 Balcony' };

export const couplesSorted = (S) => S.couples.slice().sort((x, y) => strength(S, y) - strength(S, x));
export const byPop = (S, ids) => ids.slice().sort((x, y) => pop(S, y) - pop(S, x));
export const alive = (S, id) => S.inVilla.includes(id);
export const daysIn = (S, id) => { const p = S.cast[id]; return Math.max(1, S.day - (p.arrived || 1) + 1); };
