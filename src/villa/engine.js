// The season engine. A season is a list of days; a day is a queue of named steps; a step writes
// scenes into the episode and sometimes stops to ask somebody a question. In Producer mode the
// question goes to the public (you). In Islander mode it goes to your islander. Everyone else is
// simulated. State is plain JSON, so the queue can be saved between any two steps.
import { makeRng, clamp, seasonCode } from './rng.js';
import { makeIslander, makeBombshell, initialSpark, typeMatch, starPower, other, nounPl, noun, pronoun } from './cast.js';
import { emptyState, P, girls, boys, ofGender, coupleOf, partnerOf, isCoupled, singles, singlesOf, opposite, sameGender, rel, bump, bumpBoth, spark, mutual, trustBetween, tensionBetween, strength, popBump, pop, setCouple, uncouple, removeFromVilla, addToVilla, beginEpisode, scene, caption, moment, endEpisode, couplesSorted, byPop, SEASON_DAYS, VILLA_SIZE, PUBLIC } from './model.js';
import { texts, TEXT_OPENERS, narrator, chat, speech, arrival, casa as casaT, movie, finale, captions, AWARDS, DATE_KINDS, shipName } from './text.js';
import { runChallenge, challengeTitle, heartRate, smpChoosers, smpAuto, smpApply } from './challenges.js';

const n = (p) => p.name;
const pr = (p) => pronoun(p);
const pk = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// ---------- creating a season ----------
export function createSeason({ seed, mode, women, men, player = null, playerEntry = 'og' }) {
  const rng = makeRng(seed);
  const S = emptyState({ seed, code: seasonCode(rng), mode, playerId: player ? player.id : null });
  S.tally = {}; S.kissed = {}; S.exclusive = {}; S.secrets = []; S.lastChoosers = null; S.beef = [];
  S.dumped = [];
  const all = [...women, ...men];
  for (const p of all) { p.arrived = 1; addToVilla(S, p); ensureTally(S, p.id); }
  if (player) {
    player.player = true;
    if (playerEntry === 'bombshell') { S.cast[player.id] = player; S.pendingBombshell = player.id; player.bombshell = true; }
    else { player.arrived = 1; addToVilla(S, player); ensureTally(S, player.id); }
    S.player = { id: player.id, energy: 2, day: 0, log: [], chats: 0, kisses: 0, grafts: 0, loyal: 0, score: 0 };
  }
  // First impressions: everyone sizes everyone up.
  for (const a of Object.keys(S.cast)) for (const b of Object.keys(S.cast)) if (a !== b) seedRel(S, rng, a, b);
  S.rngState = rng.state();
  S.phase = 'run';
  return S;
}
function seedRel(S, rng, a, b) {
  const A = P(S, a), B = P(S, b);
  if (A.gender !== B.gender) rel(S, a, b).spark = initialSpark(rng, A, B);
  else { const r = rel(S, a, b); r.spark = 0; r.trust = clamp(Math.round(45 + rng.gauss(0, 10) + (A.attrs.eq - 50) * 0.1), 10, 80); }
}
function ensureTally(S, id) { if (!S.tally[id]) S.tally[id] = { kisses: 0, grafts: 0, arguments: 0, loyal: 0, steals: 0, twists: 0, dates: 0, picked: 0, stuck: 0, betrayed: 0 }; return S.tally[id]; }
const T = (S, id) => ensureTally(S, id);

// ---------- running ----------
export const controlled = (S, by) => (S.mode === 'producer' ? by === 'public' : by === S.playerId);
export function isPlayer(S, id) { return S.playerId && id === S.playerId; }

/** Advance until the day ends or somebody has to decide. Returns { pending } or { episode }. */
export function run(S) {
  if (S.phase === 'done') return { done: true };
  const rng = makeRng(S.rngState ?? S.seed);
  try {
    if (S.pending) return { pending: S.pending };
    if (!S.queue.length) { if (S.day >= SEASON_DAYS) { finishSeason(S, rng); return { done: true }; } startDay(S, rng); }
    while (S.queue.length) {
      const st = S.queue[0];
      const fn = STEPS[st.step];
      if (!fn) { S.queue.shift(); continue; }
      const out = fn(S, rng, st);
      if (out === 'pause') {
        if (S.pending && !controlled(S, S.pending.by)) { const choice = autoAnswer(S, rng, S.pending); S.pending = null; S.answer = choice; continue; }
        return { pending: S.pending };
      }
      S.queue.shift();
      S.answer = null;
    }
    const ep = endEpisode(S);
    if (S.day >= SEASON_DAYS && S.phase !== 'done') { /* final runs as day 22's steps */ }
    return { episode: ep };
  } finally { S.rngState = rng.state(); }
}
/** Answer the pending question and keep going. */
export function answer(S, choice) {
  if (!S.pending) return run(S);
  S.pending = null;
  S.answer = choice;
  return run(S);
}
/** Do something with the rng between steps (Islander mode actions). */
export function withRng(S, fn) { const rng = makeRng(S.rngState ?? S.seed); try { return fn(rng); } finally { S.rngState = rng.state(); } }

function ask(S, st, q) {
  S.pending = Object.assign({ id: `${S.day}-${st.step}-${S.queue.length}`, step: st.step }, q);
  return 'pause';
}
const take = (S) => { const a = S.answer; S.answer = null; return a; };
const hasAnswer = (S) => S.answer != null;

// ---------- the schedule ----------
function startDay(S, rng) {
  S.day++;
  const d = S.day;
  beginEpisode(S, dayTitle(d));
  const q = [];
  const yours = S.mode === 'islander' ? [{ step: 'yourMove' }] : [];
  const evening = { step: 'evening' };
  switch (d) {
    case 1: q.push({ step: 'arrive' }, { step: 'firstCoupling' }, { step: 'bombshellIn', k: 1, first: true }); break;
    case 2: q.push({ step: 'morning' }, ...yours, { step: 'bombshellDates' }, evening); break;
    case 3: q.push({ step: 'morning' }, ...yours, { step: 'challenge', id: rng.pick(['talent', 'sportsDay', 'baggage']) }, evening); break;
    case 4: q.push({ step: 'morning' }, ...yours, { step: 'recoupleText', dump: true }, { step: 'eveningShort' }, { step: 'recoupling', dump: true }); break;
    case 5: q.push({ step: 'morning' }, ...yours, { step: 'bombshellIn', k: 2, pickable: true }, evening); break;
    case 6: q.push({ step: 'morning' }, ...yours, { step: 'bombshellDates' }, { step: 'hideaway' }, evening); break;
    case 7: q.push({ step: 'morning' }, ...yours, { step: 'challenge', id: 'heartRate' }, evening); break;
    case 8: q.push({ step: 'morning' }, ...yours, { step: 'recoupleText', dump: false }, { step: 'eveningShort' }, { step: 'recoupling', dump: false }); break;
    case 9: q.push({ step: 'morning' }, ...yours, evening, { step: 'publicVote', mode: 'islandersDecide' }); break;
    case 10: q.push({ step: 'morning' }, ...yours, { step: 'datePick' }, { step: 'bombshellIn', k: 1 }, evening); break;
    case 11: q.push({ step: 'morning' }, ...yours, { step: 'bombshellDates' }, { step: 'recoupleText', dump: true }, { step: 'recoupling', dump: true }); break;
    case 12: q.push({ step: 'morning' }, ...yours, { step: 'challenge', id: rng.pick(['babies', 'truth']) }, evening); break;
    case 13: q.push({ step: 'casaStart' }, ...yours, { step: 'casaDay', first: true }); break;
    case 14: q.push({ step: 'casaMorning' }, { step: 'postcard' }, ...yours, { step: 'casaDay' }); break;
    case 15: q.push({ step: 'casaMorning' }, ...yours, { step: 'casaRecoupling' }); break;
    case 16: q.push({ step: 'morning' }, ...yours, { step: 'movieNight' }, { step: 'eveningShort' }); break;
    case 17: q.push({ step: 'morning' }, ...yours, { step: 'challenge', id: 'smp' }, { step: 'publicVote', mode: 'publicDump' }); break;
    case 18: q.push({ step: 'morning' }, ...yours, { step: 'bombshellIn', k: 2, pickable: true }, { step: 'bombshellDates' }, evening); break;
    case 19: q.push({ step: 'morning' }, ...yours, { step: 'challenge', id: rng.pick(['newsroom', 'truth']) }, { step: 'recoupleText', dump: false }, { step: 'recoupling', dump: false }); break;
    case 20: q.push({ step: 'morning' }, ...yours, evening, { step: 'publicVote', mode: 'publicDumpCouple' }); break;
    case 21: q.push({ step: 'morning' }, { step: 'family' }, ...yours, { step: 'finalDates' }, { step: 'publicVote', mode: 'publicDumpCouple', toFinal: 4 }); break;
    case 22: q.push({ step: 'finalMorning' }, { step: 'declarations' }, { step: 'finalVote' }, { step: 'envelope' }); break;
    default: q.push({ step: 'morning' }, ...yours, evening);
  }
  q.push({ step: 'captions' }, { step: 'endDay' });
  S.queue = q;
}
export function dayTitle(d) {
  return { 1: 'Welcome to the Villa', 2: 'The Graft Begins', 3: 'Game Day', 4: 'The First Recoupling', 5: 'Double Trouble', 6: 'Date Night', 7: 'Hearts Racing', 8: 'Shuffle Up', 9: `${PUBLIC} Has Spoken`, 10: 'Trouble in Paradise', 11: 'Line Up', 12: 'Getting Real', 13: 'Casa Amor', 14: 'Wish You Were Here', 15: 'Stick or Twist', 16: 'Movie Night', 17: 'The Fallout', 18: 'Late Arrivals', 19: 'The Last Shuffle', 20: 'Final Stretch', 21: 'Meet the Parents', 22: 'The Final' }[d] || `Day ${d}`;
}
export const dayPreview = (d) => ({ 1: 'Ten singles, one villa, a bombshell before bedtime.', 2: 'The bombshell picks two dates. Someone\'s partner watches.', 3: 'A challenge, and the first real chats.', 4: 'Recoupling. The islander left standing goes home.', 5: 'Two bombshells walk in tonight. Heads will turn.', 6: 'Dates for the new arrivals, and the Hideaway opens.', 7: 'The heart rate challenge. Monitors don\'t lie.', 8: 'A recoupling with everyone safe. For now.', 9: `${PUBLIC} votes. The islanders decide who goes.`, 10: 'One couple gets a date out of the villa, and one more bombshell arrives.', 11: 'Recoupling. One islander is dumped tonight.', 12: 'A challenge that gets a little too honest.', 13: 'Casa Amor. The boys leave. The bombshells arrive.', 14: 'A postcard from the other villa. Maybe.', 15: 'Stick or twist. The walk back to the fire pit.', 16: 'Movie night. The villa has been watching.', 17: 'Kiss, Marry, Pie, then a dumping.', 18: 'Two late bombshells looking to break something up.', 19: 'The last recoupling.', 20: 'A couple is dumped days from the final.', 21: 'Families visit. Then the final four are set.', 22: 'Declarations, the winners, and the envelope.' }[d] || '');

// ---------- helpers ----------
function sendText(S, rng, msg, reader) {
  const id = reader || (S.playerId && S.inVilla.includes(S.playerId) && rng.chance(0.3) ? S.playerId : pk(rng, S.inVilla));
  S.stats.texts++;
  return scene(S, { where: 'villa', kind: 'text', who: [id], text: msg, opener: pk(rng, TEXT_OPENERS), big: true });
}
const fewerGender = (S) => (girls(S).length < boys(S).length ? 'f' : girls(S).length > boys(S).length ? 'm' : null);
function pickChoosers(S) {
  const g = fewerGender(S);
  if (g) return g;
  return S.lastChoosers === 'm' ? 'f' : S.lastChoosers === 'f' ? 'm' : 'm';
}
/** Who this islander would step forward for, with a little strategy and a little chaos. */
function preference(S, rng, id, pool, ctx = {}) {
  const me = P(S, id), partner = partnerOf(S, id);
  return pool.map((x) => {
    const X = P(S, x);
    let v = rel(S, id, x).spark * 0.7 + rel(S, id, x).trust * 0.25 + rel(S, x, id).spark * 0.25 - rel(S, id, x).tension * 0.4;
    if (x === partner) v += 6 + me.attrs.loyal * 0.28 + trustBetween(S, id, x) * 0.1;
    else if (partner) v -= 10 + me.attrs.loyal * 0.1;
    v += (me.attrs.game / 100) * pop(S, x) * 0.25;
    if (isCoupled(S, x) && x !== partner) v -= (100 - me.attrs.drama) * 0.08;
    v += rng.gauss(0, 6);
    return { x, v };
  }).sort((a, b) => b.v - a.v);
}

// ---------- steps ----------
const STEPS = {
  arrive(S, rng) {
    scene(S, { where: 'villa', kind: 'narrator', text: narrator.arrivals(rng), big: true });
    for (const id of girls(S)) scene(S, { where: 'villa', kind: 'arrival', who: [id], text: arrival.intro(rng, P(S, id)) });
    for (const id of boys(S)) scene(S, { where: 'villa', kind: 'arrival', who: [id], text: arrival.intro(rng, P(S, id)) });
  },
  firstCoupling(S, rng, st) {
    const gs = girls(S), bs = boys(S);
    if (S.mode === 'producer' && !hasAnswer(S) && !st.done) {
      return ask(S, st, { type: 'firstCoupling', by: 'public', title: 'Night one coupling', prompt: 'The girls line up. The boys step forward. Couple them yourself, or let the villa do it.', options: [{ id: 'auto', label: 'Let them choose' }, { id: 'manual', label: 'Couple them myself' }], girls: gs, boys: bs });
    }
    const a = hasAnswer(S) ? take(S) : null;
    if (a && a.manual && Array.isArray(a.pairs)) {
      for (const [f, m] of a.pairs) if (S.cast[f] && S.cast[m]) setCouple(S, f, m);
    } else if (a && a.id === 'manual') {
      return ask(S, st, { type: 'pairUp', by: 'public', title: 'Couple them up', prompt: 'Tap a girl, then the boy who steps forward for her.', girls: gs, boys: bs });
    } else if (S.mode === 'islander' && S.playerId && S.inVilla.includes(S.playerId) && !a) {
      // The player's gender chooses on night one so the first pick is theirs.
      const me = P(S, S.playerId);
      const pool = opposite(S, S.playerId);
      return ask(S, st, { type: 'recouplePick', by: S.playerId, title: 'Step forward', prompt: `The ${nounPl(other(me.gender))} are lined up. Who do you step forward for?`, options: pool.map((x) => ({ id: x, who: [x], label: n(P(S, x)), sub: `${P(S, x).age} · ${P(S, x).job}` })), night1: true });
    } else if (a && a.id && S.cast[a.id] && S.playerId) {
      const me = P(S, S.playerId);
      const f = me.gender === 'f' ? S.playerId : a.id, m = me.gender === 'm' ? S.playerId : a.id;
      setCouple(S, f, m);
      scene(S, { where: 'firepit', kind: 'recouple', who: [S.playerId, a.id], text: `You step forward for ${n(P(S, a.id))}. ${pr(P(S, a.id)).They} smiles. Good start.`, reveal: true });
    }
    // Everyone else: the boys step forward in order of confidence.
    const order = boys(S).filter((b) => !isCoupled(S, b)).sort((x, y) => P(S, y).attrs.charm - P(S, x).attrs.charm);
    for (const b of order) {
      const free = girls(S).filter((g) => !isCoupled(S, g));
      if (!free.length) break;
      const pick = preference(S, rng, b, free)[0].x;
      setCouple(S, pick, b);
      scene(S, { where: 'firepit', kind: 'recouple', who: [b, pick], text: `${n(P(S, b))} steps forward for ${n(P(S, pick))}.${rel(S, pick, b).spark > 55 ? ` ${n(P(S, pick))} does not hide the smile.` : rel(S, pick, b).spark < 35 ? ` ${n(P(S, pick))} smiles the way you smile at a dentist.` : ''}`, reveal: true });
    }
    for (const c of S.couples) { bumpBoth(S, c.a, c.b, { trust: 5 }); T(S, c.a).picked++; T(S, c.b).picked++; }
    moment(S, { type: 'firstCoupling', couples: S.couples.map((c) => [c.a, c.b]) });
  },
  bombshellIn(S, rng, st) {
    const genders = st.k === 2 ? ['f', 'm'] : [st.g || (S.pendingBombshell ? P(S, S.pendingBombshell).gender : (fewerGender(S) || rng.pick(['f', 'm'])))];
    // The player entering as a bombshell takes the first slot.
    if (!st.arrivals) {
      st.arrivals = [];
      if (S.pendingBombshell) { st.arrivals.push(S.pendingBombshell); genders.shift(); S.pendingBombshell = null; }
      st.genders = genders;
      st.cands = {};
      const used = new Set(S.usedNames);
      for (const g of genders) st.cands[g] = [0, 1, 2].map(() => { const b = makeBombshell(rng, g, used); S.cast[b.id] = b; return b.id; });
    }
    if (st.pickable && S.mode === 'producer') {
      for (const g of st.genders) {
        if (st[`picked_${g}`]) continue;
        if (hasAnswer(S)) { const a = take(S); st[`picked_${g}`] = a.id; st.arrivals.push(a.id); continue; }
        return ask(S, st, { type: 'bombshellPick', by: 'public', title: `Choose the ${noun({ gender: g })} bombshell`, prompt: `Three ${nounPl(g)} are waiting outside. Which one walks in tonight?`, options: st.cands[g].map((id) => ({ id, who: [id], label: n(P(S, id)), sub: `${P(S, id).age} · ${P(S, id).job} · ${P(S, id).home}` })), cards: true });
      }
    } else {
      for (const g of st.genders) { if (!st[`picked_${g}`]) { const id = st.cands[g].sort((x, y) => starPower(P(S, y)) - starPower(P(S, x)))[0]; st[`picked_${g}`] = id; st.arrivals.push(id); } }
    }
    sendText(S, rng, texts.bombshell(rng, P(S, st.arrivals[0]).gender, st.arrivals.length));
    for (const id of st.arrivals) {
      const b = P(S, id);
      b.arrived = S.day; b.bombshell = true;
      addToVilla(S, b); ensureTally(S, id);
      for (const x of S.inVilla) if (x !== id) { seedRel(S, rng, id, x); seedRel(S, rng, x, id); }
      S.stats.bombshells++;
      scene(S, { where: 'firepit', kind: 'arrival', who: [id], text: isPlayer(S, id) ? `You walk in. Sunglasses on, heart going. Ten heads turn at once. "Hi everyone!" Somebody's partner forgets to say hi back.` : arrival.bombshell(rng, b), big: true });
      scene(S, { where: 'firepit', kind: 'arrival', who: [id], text: arrival.intro(rng, b) });
      caption(S, captions.bombshell(rng, b), 'spicy');
      // Whose head turns
      const eyes = opposite(S, id).map((x) => ({ x, v: rel(S, x, id).spark + (100 - P(S, x).attrs.loyal) * 0.3 + rng.gauss(0, 8) })).sort((a, c) => c.v - a.v).slice(0, 2);
      for (const { x, v } of eyes) {
        if (v < 55) continue;
        const X = P(S, x), partner = partnerOf(S, x);
        bump(S, x, id, { spark: 6 });
        if (partner) { bump(S, partner, x, { tension: 6 }); scene(S, { where: 'firepit', kind: 'gossip', who: [x, id, partner], text: pk(rng, [`${n(X)} says ${n(b)} is "not my type at all," then looks over four times in a minute. ${n(P(S, partner))} counts.`, `${n(X)} hugs ${n(b)} hello a beat too long. ${n(P(S, partner))} clocks it from the kitchen and says nothing, loudly.`]), fx: { [x]: -1 } }); }
        else scene(S, { where: 'firepit', kind: 'flirt', who: [x, id], text: `${n(X)}, single and suddenly very interested, gets ${n(b)} a drink before ${pr(b).they} has finished sitting down.` });
      }
    }
    moment(S, { type: 'bombshell', ids: st.arrivals.slice() });
    S.lastBombshells = st.arrivals.slice();
  },
  bombshellDates(S, rng, st) {
    const bs = (S.lastBombshells || []).filter((id) => S.inVilla.includes(id));
    if (!bs.length) return;
    if (!st.i) st.i = 0;
    while (st.i < bs.length) {
      const id = bs[st.i];
      const b = P(S, id);
      const pool = opposite(S, id);
      if (!pool.length) { st.i++; continue; }
      let picks;
      if (isPlayer(S, id) && !hasAnswer(S)) {
        sendText(S, rng, texts.bombshellDates(rng, b, Math.min(2, pool.length)), id);
        return ask(S, st, { type: 'datePicks', by: id, title: 'Pick your dates', prompt: 'You get two dates this afternoon. Who do you want to get to know?', options: pool.map((x) => ({ id: x, who: [x], label: n(P(S, x)), sub: isCoupled(S, x) ? `coupled with ${n(P(S, partnerOf(S, x)))}` : 'single' })), multi: Math.min(2, pool.length) });
      }
      if (isPlayer(S, id)) { picks = (take(S).ids || []).filter((x) => S.cast[x]).slice(0, 2); }
      else { sendText(S, rng, texts.bombshellDates(rng, b, Math.min(2, pool.length))); picks = preference(S, rng, id, pool).slice(0, 2).map((o) => o.x); }
      for (const x of picks) {
        const X = P(S, x), partner = partnerOf(S, x);
        S.stats.dates++; T(S, id).dates++; T(S, x).dates++;
        const click = (rel(S, x, id).spark + rel(S, id, x).spark) / 2 + b.attrs.charm * 0.2 + rng.gauss(0, 8);
        bump(S, id, x, { spark: 8 }); bump(S, x, id, { spark: click > 60 ? 10 : 4, trust: 4 });
        scene(S, { where: 'dates', kind: 'date', who: [id, x], text: isPlayer(S, id) ? `You take ${n(X)} on a date. ${click > 60 ? `It flows. ${pr(X).They} laughs at the right parts and asks about your family.` : `It's fine. Polite. ${pr(X).They} checks the villa over your shoulder twice.`}` : chat.bombshellDate(rng, b, X) });
        if (partner) { bump(S, partner, x, { tension: click > 60 ? 12 : 5 }); if (click > 60) { scene(S, { where: 'villa', kind: 'gossip', who: [partner], text: `${n(P(S, partner))} watches the door for an hour and a half and says ${pr(P(S, partner)).they} is "not bothered." ${pr(P(S, partner)).They} is bothered.` }); } }
        if (click > 60) caption(S, captions.graft(rng, b, X), 'spicy');
      }
      st.i++;
    }
  },
  morning(S, rng) {
    scene(S, { where: 'kitchen', kind: 'narrator', text: narrator.morning(rng) });
    // One sisterhood / brotherhood moment, one lingering beef.
    if (rng.chance(0.7)) {
      const g = rng.pick(['f', 'm']); const ids = ofGender(S, g);
      if (ids.length >= 2) { const [a, b] = rng.sample(ids, 2); bump(S, a, b, { trust: 3 }); bump(S, b, a, { trust: 3 }); scene(S, { where: rng.pick(['terrace', 'daybeds', 'gym']), kind: 'chat', who: [a, b], text: chat.friends(rng, P(S, a), P(S, b)) }); }
    }
    resolveBeef(S, rng);
    dailyDrift(S, rng);
  },
  casaMorning(S, rng) { scene(S, { where: 'casa', kind: 'narrator', text: narrator.casaMorning(rng) }); dailyDrift(S, rng); },
  yourMove(S, rng, st) {
    if (!S.playerId || !S.inVilla.includes(S.playerId)) return;
    if (hasAnswer(S)) { take(S); return; }
    S.player.energy = 2; S.player.day = S.day;
    return ask(S, st, { type: 'actions', by: S.playerId, title: 'Your move', prompt: 'Two moves today. Make them count.' });
  },
  evening(S, rng) { scene(S, { where: 'garden', kind: 'narrator', text: narrator.evening(rng) }); simEvening(S, rng, 6); },
  eveningShort(S, rng) { simEvening(S, rng, 3); },
  challenge(S, rng, st) {
    if (st.id === 'smp') return stepSMP(S, rng, st);
    sendText(S, rng, texts.challenge(rng, challengeTitle(st.id)));
    runChallenge(S, rng, st.id);
  },
  recoupleText(S, rng, st) {
    const choosers = pickChoosers(S);
    st.choosers = choosers;
    S.nextChoosers = choosers;
    sendText(S, rng, st.dump ? texts.recoupleWarn(rng, choosers, other(choosers)) : texts.recoupleSafe(rng, choosers));
    caption(S, captions.text(rng), 'fun');
  },
  recoupling(S, rng, st) { return stepRecoupling(S, rng, st); },
  hideaway(S, rng, st) {
    if (S.couples.length < 2) return;
    if (S.mode === 'producer' && !hasAnswer(S) && !st.done) {
      return ask(S, st, { type: 'couplePick', by: 'public', title: 'The Hideaway is open', prompt: 'Which couple gets the key tonight?', options: couplesSorted(S).map((c) => ({ id: `${c.a}|${c.b}`, who: [c.a, c.b], label: `${n(P(S, c.a))} & ${n(P(S, c.b))}`, sub: `${strength(S, c)}% · ${strengthLabelShort(strength(S, c))}` })) });
    }
    let c;
    if (hasAnswer(S)) { const a = take(S); const [x, y] = String(a.id).split('|'); c = S.couples.find((k) => k.a === x && k.b === y); }
    if (!c) c = couplesSorted(S)[0];
    st.done = true;
    const a = P(S, c.a), b = P(S, c.b);
    sendText(S, rng, texts.hideaway(rng, a, b), c.a);
    bumpBoth(S, c.a, c.b, { spark: 8, trust: 6 });
    if (!S.kissed[`${c.a}|${c.b}`]) { S.kissed[`${c.a}|${c.b}`] = S.day; S.stats.kisses++; T(S, c.a).kisses++; T(S, c.b).kisses++; }
    scene(S, { where: 'hideaway', kind: 'kiss', who: [c.a, c.b], text: isPlayer(S, c.a) || isPlayer(S, c.b) ? `You and ${n(isPlayer(S, c.a) ? b : a)} get the Hideaway. Rose petals. A bath the size of a small car. The villa pressing its face against the bedroom window.` : chat.hideaway(rng, a, b), fx: { [c.a]: 3, [c.b]: 3 }, big: true });
    scene(S, { where: 'kitchen', kind: 'gossip', who: [c.a, c.b], text: chat.hideawayMorning(rng, a, b) });
    caption(S, captions.kiss(rng, a, b), 'soft');
    moment(S, { type: 'hideaway', ids: [c.a, c.b] });
  },
  datePick(S, rng, st) {
    if (!S.couples.length) return;
    if (S.mode === 'producer' && !hasAnswer(S)) {
      return ask(S, st, { type: 'couplePick', by: 'public', title: 'A date is up for grabs', prompt: `${PUBLIC} chooses one couple for a proper date outside the villa. Who needs it most?`, options: couplesSorted(S).map((c) => ({ id: `${c.a}|${c.b}`, who: [c.a, c.b], label: `${n(P(S, c.a))} & ${n(P(S, c.b))}`, sub: `${strength(S, c)}% · ${strengthLabelShort(strength(S, c))}` })) });
    }
    let c;
    if (hasAnswer(S)) { const a = take(S); const [x, y] = String(a.id).split('|'); c = S.couples.find((k) => k.a === x && k.b === y); }
    if (!c) c = rng.pick(S.couples);
    doDate(S, rng, c, rng.pick(DATE_KINDS));
  },
  finalDates(S, rng) {
    for (const c of S.couples) doDate(S, rng, c, rng.pick(DATE_KINDS), true);
  },
  family(S, rng) {
    sendText(S, rng, texts.family(rng));
    for (const c of S.couples) {
      const a = P(S, c.a), b = P(S, c.b);
      const warm = (a.attrs.eq + b.attrs.eq) / 2 + trustBetween(S, c.a, c.b) * 0.3 + rng.gauss(0, 10);
      if (warm > 70) { bumpBoth(S, c.a, c.b, { trust: 8, spark: 4 }); scene(S, { where: 'garden', kind: 'date', who: [c.a, c.b], text: pk(rng, [`${n(a)}'s mom meets ${n(b)} and within four minutes has called ${pr(b).them} "son." ${n(a)} cries. ${n(b)} cries. The mom does not cry; she has a list of questions.`, `${n(b)}'s family arrives and ${n(a)} is hugged before ${pr(a).they} can say hello. ${n(b)}'s sister: "Finally, someone normal."`]), fx: { [c.a]: 4, [c.b]: 4 } }); caption(S, captions.sweet(rng, a, b), 'soft'); }
      else if (warm < 50) { bump(S, c.a, c.b, { tension: 5 }); scene(S, { where: 'garden', kind: 'date', who: [c.a, c.b], text: pk(rng, [`${n(a)}'s dad asks ${n(b)} what ${pr(b).their} "plan" is. ${n(b)} says "vibes." There is a silence you could park a car in.`, `${n(b)}'s mom is polite to ${n(a)} in the way that means she has seen the episodes.`]), fx: { [c.b]: -1 } }); }
      else scene(S, { where: 'garden', kind: 'date', who: [c.a, c.b], text: `${n(a)} and ${n(b)} meet each other's families. Hugs, tears, a dad who wants to see the gym. It goes well.`, fx: { [c.a]: 2, [c.b]: 2 } });
    }
    moment(S, { type: 'family' });
  },
  publicVote(S, rng, st) { return stepPublicVote(S, rng, st); },
  casaStart(S, rng) {
    const leaving = 'm';
    S.casa = { leaving, bombs: { f: [], m: [] }, lean: {}, history: [], day: 1 };
    sendText(S, rng, texts.casaStart(rng, leaving), pk(rng, ofGender(S, leaving)));
    scene(S, { where: 'villa', kind: 'twist', text: casaT.split(rng, leaving), big: true });
    const used = new Set(S.usedNames);
    for (const g of ['f', 'm']) {
      const k = 4;
      for (let i = 0; i < k; i++) { const b = makeBombshell(rng, g, used); b.arrived = S.day; b.casa = true; S.cast[b.id] = b; S.casa.bombs[g].push(b.id); S.pop[b.id] = 45; ensureTally(S, b.id); for (const x of S.inVilla) { seedRel(S, rng, b.id, x); seedRel(S, rng, x, b.id); } }
      const hosts = g === 'f' ? 'boys' : 'girls';
      scene(S, { where: 'casa', kind: 'arrival', text: `${casaT.arrive(rng, g, k)} (${g === 'f' ? 'Casa Amor, where the boys are' : 'the main villa, where the girls are'}.)`, who: S.casa.bombs[g] });
      for (const id of S.casa.bombs[g]) scene(S, { where: g === 'f' ? 'casa' : 'villa', kind: 'arrival', who: [id], text: arrival.intro(rng, P(S, id)) });
    }
    moment(S, { type: 'casaStart' });
  },
  postcard(S, rng, st) {
    if (S.mode === 'producer' && !hasAnswer(S) && !st.done) {
      return ask(S, st, { type: 'postcard', by: 'public', title: 'Send the postcard?', prompt: 'The girls could get a postcard from Casa Amor tonight: one photo per boy, chosen for maximum damage. Send it, or let them sleep.', options: [{ id: 'send', label: 'Send the postcard 📮', sub: 'Chaos, tears, and a few heads that were loyal start turning' }, { id: 'hold', label: 'Hold it back', sub: 'Let them find out at the fire pit' }] });
    }
    const a = hasAnswer(S) ? take(S) : { id: rng.chance(0.7) ? 'send' : 'hold' };
    st.done = true;
    if (a.id !== 'send') { scene(S, { where: 'villa', kind: 'narrator', text: 'No postcard tonight. The girls decide that means good news. The girls are very optimistic people.' }); return; }
    sendText(S, rng, texts.postcard(rng), pk(rng, girls(S)));
    const lines = [];
    for (const b of boys(S)) {
      const lean = S.casa.lean[b];
      const partner = partnerOf(S, b);
      if (lean && lean.score > 55) { lines.push(casaT.postcardCuddle(rng, P(S, b), P(S, lean.b))); if (partner) { bump(S, partner, b, { tension: 22, trust: -14, spark: -6 }); S.casa.lean[partner] = S.casa.lean[partner] || { b: null, score: 30 }; S.casa.lean[partner].score += 14; } }
      else if (lean && lean.score > 42 && rng.chance(0.6)) { lines.push(casaT.postcardKiss(rng, P(S, b), P(S, lean.b || pk(rng, S.casa.bombs.f)))); if (partner) { bump(S, partner, b, { tension: 12, trust: -6 }); S.casa.lean[partner] = S.casa.lean[partner] || { b: null, score: 30 }; S.casa.lean[partner].score += 8; } }
      else if (rng.chance(0.4)) { lines.push(casaT.postcardLoyal(rng, P(S, b))); if (partner) bump(S, partner, b, { trust: 6 }); }
    }
    if (!lines.length) lines.push('Just the boys around a pool looking suspiciously well-behaved.');
    scene(S, { where: 'villa', kind: 'twist', text: casaT.postcard(rng, lines.slice(0, 4)), who: girls(S), big: true });
    caption(S, pk(rng, ['the postcard is the most evil thing producers have ever done and I need it every season', 'the girls reading that postcard 😭😭 someone hold them', 'a POSTCARD. in this economy.']), 'spicy');
    moment(S, { type: 'postcard' });
  },
  casaDay(S, rng, st) { simCasaDay(S, rng); },
  casaRecoupling(S, rng, st) { return stepCasaRecoupling(S, rng, st); },
  movieNight(S, rng) { stepMovieNight(S, rng); },
  finalMorning(S, rng) {
    sendText(S, rng, texts.final(rng));
    scene(S, { where: 'villa', kind: 'narrator', text: 'The last day. Suits and dresses arrive in bags. Everyone cries at least once before lunch, including a cameraman.', big: true });
  },
  declarations(S, rng) {
    for (const c of couplesSorted(S)) {
      const a = P(S, c.a), b = P(S, c.b);
      scene(S, { where: 'firepit', kind: 'final', who: [c.a, c.b], text: `${n(a)} to ${n(b)}: ${finale.declaration(rng, a, b)}`, big: true });
      scene(S, { where: 'firepit', kind: 'final', who: [c.b, c.a], text: `${n(b)}: ${finale.reply(rng, b, a)}` });
    }
  },
  finalVote(S, rng, st) {
    const cs = couplesSorted(S);
    if (!cs.length) { S.phase = 'done'; return; }
    if (S.mode === 'producer' && !hasAnswer(S)) {
      return ask(S, st, { type: 'couplePick', by: 'public', title: 'Vote for your winners', prompt: `${PUBLIC} decides. Your vote is the loudest in the room.`, options: cs.map((c) => ({ id: `${c.a}|${c.b}`, who: [c.a, c.b], label: `${n(P(S, c.a))} & ${n(P(S, c.b))}`, sub: `${strength(S, c)}% · ${popShort(S, c)}` })), final: true });
    }
    let fav = null;
    if (hasAnswer(S)) { const a = take(S); const [x, y] = String(a.id).split('|'); fav = S.couples.find((k) => k.a === x && k.b === y) || null; }
    const ranked = voteCouples(S, rng, fav, 34);
    S.final = { order: ranked.map((r) => ({ a: r.c.a, b: r.c.b, share: r.share })) };
    const ORD = ['', '', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
    for (let i = ranked.length - 1; i >= 1; i--) {
      const c = ranked[i].c;
      scene(S, { where: 'firepit', kind: 'final', who: [c.a, c.b], text: i === 1 ? finale.runnerUp(rng, P(S, c.a), P(S, c.b)) : `${n(P(S, c.a))} & ${n(P(S, c.b))} finish ${ORD[i] || `${i + 1}th`} with ${ranked[i].share}% of the vote. Hugs all round.`, reveal: true });
    }
    const w = ranked[0].c;
    S.winner = { a: w.a, b: w.b, share: ranked[0].share };
    scene(S, { where: 'firepit', kind: 'final', who: [w.a, w.b], text: finale.crown(rng, P(S, w.a), P(S, w.b)), reveal: true, big: true, fx: { [w.a]: 5, [w.b]: 5 } });
    caption(S, captions.win(rng, P(S, w.a), P(S, w.b)), 'soft');
    moment(S, { type: 'winner', ids: [w.a, w.b] });
  },
  envelope(S, rng, st) {
    if (!S.winner) { S.phase = 'done'; return; }
    const { a, b } = S.winner;
    const me = isPlayer(S, a) ? a : isPlayer(S, b) ? b : null;
    if (me && !hasAnswer(S)) {
      return ask(S, st, { type: 'envelope', by: me, title: 'Two envelopes', prompt: `One says $${PRIZE_TXT}. One says nothing. Split it with ${n(P(S, me === a ? b : a))}, or take it all.`, options: [{ id: 'split', label: 'Split 💞', sub: '$50,000 each, if they split too' }, { id: 'steal', label: 'Steal 😈', sub: 'All $100,000, if they split. Nothing if you both steal.' }] });
    }
    const decide = (id) => { const p = P(S, id); const partner = id === a ? b : a; const steal = p.attrs.loyal < 32 && trustBetween(S, id, partner) < 48 ? 0.35 : p.arch === 'player' || p.arch === 'gamer' ? 0.08 : 0.02; return rng.chance(steal) ? 'steal' : 'split'; };
    const choiceA = me === a ? take(S).id : decide(a);
    const choiceB = me === b ? (me === a ? decide(b) : take(S).id) : decide(b);
    let text, result;
    if (choiceA === 'split' && choiceB === 'split') { text = finale.split(rng, P(S, a), P(S, b)); result = 'split'; }
    else if (choiceA === 'steal' && choiceB === 'steal') { text = finale.bothSteal(rng, P(S, a), P(S, b)); result = 'bothSteal'; popBump(S, a, -15); popBump(S, b, -15); }
    else { const thief = choiceA === 'steal' ? a : b; const victim = thief === a ? b : a; text = finale.steal(rng, P(S, thief), P(S, victim)); result = `steal:${thief}`; popBump(S, thief, -25); popBump(S, victim, 10); }
    S.final.envelope = { a: choiceA, b: choiceB, result };
    scene(S, { where: 'firepit', kind: 'final', who: [a, b], text, big: true, reveal: true });
    S.awards = computeAwards(S);
    S.phase = 'done';
  },
  captions(S, rng) {
    // Fill to 3-5 with generic lines about whoever mattered today.
    const ep = S.episode; if (!ep) return;
    const seen = new Set(ep.captions.map((c) => c.text));
    let guard = 0;
    while (ep.captions.length < 4 && guard++ < 12) {
      const who = ep.scenes.flatMap((s) => s.who || []).filter((id) => S.inVilla.includes(id));
      const id = who.length && rng.chance(0.8) ? pk(rng, who) : (S.inVilla.length ? pk(rng, S.inVilla) : null);
      const t = id ? (rng.chance(0.25) ? (P(S, id).gender === 'f' ? captions.girls(rng) : captions.boys(rng)) : captions.generic(rng, P(S, id))) : captions.text(rng);
      if (!seen.has(t)) { seen.add(t); ep.captions.push({ text: t, tone: 'neutral' }); }
    }
    ep.captions = ep.captions.slice(0, 6);
  },
  endDay(S, rng) {
    if (S.playerId && !S.inVilla.includes(S.playerId) && S.phase !== 'done') { S.phase = 'done'; S.awards = computeAwards(S); }
    if (S.day >= SEASON_DAYS && S.phase !== 'done') { S.phase = 'done'; S.awards = S.awards || computeAwards(S); }
  },
};
const PRIZE_TXT = '100,000';
const strengthLabelShort = (v) => (v >= 80 ? 'locked in' : v >= 65 ? 'solid' : v >= 50 ? 'warming up' : v >= 35 ? 'wobbling' : 'hanging by a thread');
const popShort = (S, c) => `${Math.round((pop(S, c.a) + pop(S, c.b)) / 2)} pop`;

// ---------- the relationship sim ----------
function dailyDrift(S, rng) {
  for (const id of S.inVilla) {
    const p = P(S, id);
    // Popularity drifts toward what the person is like, slowly.
    const base = 40 + p.attrs.charm * 0.15 + p.attrs.funny * 0.15 + p.attrs.loyal * 0.1 - p.attrs.drama * 0.05;
    popBump(S, id, (base - pop(S, id)) * 0.06 + rng.gauss(0, 1.2));
    const partner = partnerOf(S, id);
    if (partner) {
      const target = 35 + typeMatch(p, P(S, partner)) * 40 + P(S, partner).attrs.charm * 0.2 + P(S, partner).attrs.eq * 0.1;
      const r = rel(S, id, partner);
      r.spark = clamp(r.spark + (target - r.spark) * 0.08 + rng.gauss(0, 2), 0, 100);
      r.trust = clamp(r.trust + 1.5 + rng.gauss(0, 1), 0, 100);
      r.tension = clamp(r.tension - 4 - p.attrs.eq * 0.04, 0, 100);
    }
    for (const x of Object.keys(S.rel[id] || {})) if (x !== partner) { const r = S.rel[id][x]; r.tension = clamp(r.tension - 2, 0, 100); }
  }
}
function resolveBeef(S, rng) {
  const beef = S.beef.shift();
  if (!beef || !S.inVilla.includes(beef.a) || !S.inVilla.includes(beef.b)) return;
  const A = P(S, beef.a), B = P(S, beef.b);
  scene(S, { where: 'firepit', kind: 'argument', who: [beef.a, beef.b], text: chat.argument(rng, A, B), fx: { [beef.a]: 1, [beef.b]: -2 } });
  S.stats.arguments++; T(S, beef.a).arguments++; T(S, beef.b).arguments++;
  bump(S, beef.a, beef.b, { tension: -10, trust: -4 }); bump(S, beef.b, beef.a, { tension: 4 });
  if (rng.chance(0.55 + B.attrs.eq * 0.003)) { scene(S, { where: 'garden', kind: 'chat', who: [beef.a, beef.b], text: chat.makeup(rng, A, B) }); bumpBoth(S, beef.a, beef.b, { trust: 6, tension: -12 }); }
  else caption(S, captions.argument(rng, A, B), 'spicy');
}

/** An evening: couples check in, heads turn, someone kisses, someone argues, someone confesses. */
function simEvening(S, rng, budget) {
  const events = [];
  const cs = rng.shuffle(S.couples);
  // Couples
  for (const c of cs) {
    const a = P(S, c.a), b = P(S, c.b);
    const key = `${c.a}|${c.b}`;
    const mu = mutual(S, c.a, c.b), tr = trustBetween(S, c.a, c.b), tn = tensionBetween(S, c.a, c.b);
    if (tn > 40 && rng.chance(0.35 + (a.attrs.drama + b.attrs.drama) * 0.002)) {
      const [x, y] = rel(S, c.a, c.b).tension >= rel(S, c.b, c.a).tension ? [c.a, c.b] : [c.b, c.a];
      events.push({ w: 9, kind: 'argument', who: [x, y], where: 'firepit', text: chat.argument(rng, P(S, x), P(S, y)), fx: { [x]: 0, [y]: -2 }, apply: () => { S.stats.arguments++; T(S, x).arguments++; T(S, y).arguments++; bump(S, x, y, { tension: -12, trust: -5, spark: -3 }); bump(S, y, x, { tension: 5 }); if (rng.chance(0.5)) S.makeup = [x, y]; } });
      continue;
    }
    if (!S.kissed[key] && mu > 58 && rng.chance(0.28 + (a.attrs.open + b.attrs.open) * 0.002)) {
      events.push({ w: 8, kind: 'kiss', who: [c.a, c.b], where: rng.pick(['terrace', 'pool', 'garden']), text: chat.kiss(rng, a, b, 'terrace'), fx: { [c.a]: 3, [c.b]: 3 }, cap: () => captions.kiss(rng, a, b), apply: () => { S.kissed[key] = S.day; S.stats.kisses++; T(S, c.a).kisses++; T(S, c.b).kisses++; bumpBoth(S, c.a, c.b, { spark: 6, trust: 4 }); moment(S, { type: 'kiss', ids: [c.a, c.b] }); } });
      continue;
    }
    if (!S.exclusive[key] && mu > 74 && tr > 66 && S.day >= 6 && rng.chance(0.3)) {
      events.push({ w: 7, kind: 'chat', who: [c.a, c.b], where: 'terrace', text: chat.theTalk(rng, a, b), fx: { [c.a]: 4, [c.b]: 4 }, cap: () => captions.sweet(rng, a, b), apply: () => { S.exclusive[key] = S.day; bumpBoth(S, c.a, c.b, { trust: 10, spark: 4 }); T(S, c.a).loyal++; T(S, c.b).loyal++; moment(S, { type: 'exclusive', ids: [c.a, c.b] }); } });
      continue;
    }
    if (rng.chance(0.35)) events.push({ w: 3, kind: 'chat', who: [c.a, c.b], where: rng.pick(['daybeds', 'terrace', 'kitchen']), text: chat.checkin(rng, a, b), fx: null, cap: rng.chance(0.3) ? () => captions.sweet(rng, a, b) : null, apply: () => bumpBoth(S, c.a, c.b, { trust: 3, spark: 2 }) });
  }
  // Grafting: whose eye is wandering
  const grafters = rng.shuffle(S.inVilla.filter((id) => !isPlayer(S, id)));
  let grafts = 0;
  for (const id of grafters) {
    if (grafts >= 2) break;
    const me = P(S, id), partner = partnerOf(S, id);
    const pool = opposite(S, id).filter((x) => x !== partner);
    if (!pool.length) continue;
    const best = pool.map((x) => ({ x, v: rel(S, id, x).spark })).sort((p, q) => q.v - p.v)[0];
    const mySpark = partner ? rel(S, id, partner).spark : 25;
    const margin = partner ? 6 + me.attrs.loyal * 0.25 : -10;
    if (best.v < mySpark + margin) continue;
    const pGraft = 0.18 + me.attrs.open * 0.003 + (100 - me.attrs.loyal) * 0.003 + (partner ? 0 : 0.25);
    if (!rng.chance(pGraft)) continue;
    grafts++;
    const x = best.x, X = P(S, x), xPartner = partnerOf(S, x);
    const receptive = rel(S, x, id).spark + (100 - X.attrs.loyal) * 0.25 - (xPartner ? strength(S, coupleOf(S, x)) * 0.35 : -15) + rng.gauss(0, 8);
    const ok = receptive > 30;
    T(S, id).grafts++;
    events.push({ w: 7, kind: 'flirt', who: [id, x], where: rng.pick(['pool', 'terrace', 'daybeds']), text: `${chat.graft(rng, me, X, xPartner ? P(S, xPartner) : null)} ${ok ? chat.flirtOK(rng, me, X) : chat.flirtNo(rng, me, X)}`, fx: { [id]: ok ? 0 : -2, [x]: ok ? -1 : 2 }, cap: () => captions.graft(rng, me, X), apply: () => {
      bump(S, id, x, { spark: ok ? 7 : -6 }); bump(S, x, id, { spark: ok ? 6 : -3 });
      if (xPartner) { bump(S, xPartner, x, { tension: ok ? 12 : 4, trust: ok ? -6 : 0 }); bump(S, xPartner, id, { tension: 10 }); if (ok && rng.chance(0.5)) S.beef.push({ a: xPartner, b: x }); }
      if (partner) { bump(S, partner, id, { tension: ok ? 14 : 8, trust: -6 }); if (rng.chance(0.6)) S.beef.push({ a: partner, b: id }); T(S, id).loyal = Math.max(0, T(S, id).loyal - 1); }
      if (ok && !xPartner && !partner && rel(S, id, x).spark > 60) { moment(S, { type: 'spark', ids: [id, x] }); }
      S.secrets.push({ day: S.day, who: id, about: x, kind: ok ? 'flirt' : 'shot', partner: partner || null });
    } });
  }
  // Beach hut confession
  if (rng.chance(0.6)) {
    const cands = S.inVilla.filter((id) => !isPlayer(S, id));
    const id = pk(rng, cands); if (id) {
      const me = P(S, id), partner = partnerOf(S, id);
      const pool = opposite(S, id).filter((x) => x !== partner);
      const crush = pool.length ? pool.sort((p, q) => rel(S, id, q).spark - rel(S, id, p).spark)[0] : null;
      if (crush && partner && rel(S, id, crush).spark > rel(S, id, partner).spark - 5) events.push({ w: 4, kind: 'confession', who: [id], where: 'beachhut', text: chat.confessionDoubt(rng, me, P(S, partner)), fx: null, apply: () => S.secrets.push({ day: S.day, who: id, about: partner, kind: 'doubt' }) });
      else if (crush && !partner && rel(S, id, crush).spark > 50) events.push({ w: 4, kind: 'confession', who: [id], where: 'beachhut', text: chat.confession(rng, me, P(S, crush)), fx: null, apply: () => {} });
    }
  }
  // Gossip: something someone said travels
  if (S.secrets.length && rng.chance(0.4)) {
    const s = S.secrets[S.secrets.length - 1];
    if (s.kind === 'flirt' && S.inVilla.includes(s.who) && S.inVilla.includes(s.about)) {
      const target = partnerOf(S, s.about) || partnerOf(S, s.who);
      const tellers = sameGender(S, target || s.about).filter((x) => x !== s.who && x !== s.about);
      if (target && tellers.length >= 2) { const [a, b] = rng.sample(tellers, 2); events.push({ w: 5, kind: 'gossip', who: [a, b, s.who, target], where: 'terrace', text: chat.gossip(rng, P(S, a), P(S, b), P(S, s.who), P(S, target)), fx: { [a]: -1 }, apply: () => { bump(S, target, s.who, { tension: 10 }); if (rng.chance(0.5)) S.beef.push({ a: target, b: partnerOf(S, target) === s.who ? s.who : s.about }); } }); }
    }
  }
  // Makeup carried from earlier
  if (S.makeup) { const [x, y] = S.makeup; S.makeup = null; if (S.inVilla.includes(x) && S.inVilla.includes(y)) events.push({ w: 6, kind: 'chat', who: [x, y], where: 'garden', text: chat.makeup(rng, P(S, x), P(S, y)), fx: { [y]: 1 }, apply: () => bumpBoth(S, x, y, { trust: 6, tension: -10 }) }); }

  events.sort((p, q) => q.w + rng() * 3 - (p.w + rng() * 3));
  for (const e of events.slice(0, budget)) {
    scene(S, { where: e.where, kind: e.kind, who: e.who, text: e.text, fx: e.fx });
    e.apply();
    if (e.cap && rng.chance(0.7)) caption(S, e.cap(), e.kind === 'kiss' || e.kind === 'chat' ? 'soft' : 'spicy');
  }
}

function doDate(S, rng, c, kind, final = false) {
  const a = P(S, c.a), b = P(S, c.b);
  sendText(S, rng, texts.dates(rng, a, b), c.a);
  S.stats.dates++; T(S, c.a).dates++; T(S, c.b).dates++;
  bumpBoth(S, c.a, c.b, { spark: final ? 6 : 8, trust: 7, tension: -10 });
  scene(S, { where: 'dates', kind: 'date', who: [c.a, c.b], text: chat.date(rng, a, b, kind), fx: { [c.a]: 2, [c.b]: 2 }, big: !final });
  if (rng.chance(0.5)) caption(S, captions.sweet(rng, a, b), 'soft');
  moment(S, { type: 'date', ids: [c.a, c.b], kind });
}

// ---------- recoupling ----------
function stepRecoupling(S, rng, st) {
  if (!st.order) {
    const choosers = S.nextChoosers || pickChoosers(S);
    st.choosers = choosers;
    S.lastChoosers = choosers;
    const ids = ofGender(S, choosers);
    // Bombshells pick first, then the rest in a shuffled order; the player goes in the middle-late for suspense.
    const bombs = ids.filter((id) => P(S, id).bombshell && (P(S, id).arrived || 1) >= S.day - 3 && !isPlayer(S, id));
    let rest = rng.shuffle(ids.filter((id) => !bombs.includes(id) && !isPlayer(S, id)));
    st.order = [...bombs, ...rest];
    if (S.playerId && ids.includes(S.playerId)) { const me = P(S, S.playerId); const pos = me.bombshell && (me.arrived || 1) >= S.day - 3 ? 0 : Math.min(st.order.length, Math.max(1, Math.floor(st.order.length * 0.6))); st.order.splice(pos, 0, S.playerId); }
    st.i = 0;
    st.taken = [];
    S.stats.recouplings++;
    scene(S, { where: 'firepit', kind: 'narrator', text: `Recoupling. The ${nounPl(other(choosers))} line up at the fire pit. The ${nounPl(choosers)} stand, one by one, and say the word "because."`, big: true });
  }
  while (st.i < st.order.length) {
    const id = st.order[st.i];
    if (!S.inVilla.includes(id)) { st.i++; continue; }
    const available = ofGender(S, other(st.choosers)).filter((x) => !st.taken.includes(x));
    if (!available.length) break;
    let pick;
    if (isPlayer(S, id)) {
      if (!hasAnswer(S)) return ask(S, st, { type: 'recouplePick', by: id, title: 'Your turn to choose', prompt: `Stand up. Who do you want to couple up with?`, options: available.map((x) => ({ id: x, who: [x], label: n(P(S, x)), sub: `${partnerOf(S, x) === id ? 'your partner · ' : partnerOf(S, x) ? `with ${n(P(S, partnerOf(S, x)))} · ` : 'single · '}${sparkWord(rel(S, x, id).spark)}` })) });
      pick = take(S).id;
      if (!available.includes(pick)) pick = available[0];
    } else pick = preference(S, rng, id, available)[0].x;
    const me = P(S, id), them = P(S, pick), was = partnerOf(S, id), theirEx = partnerOf(S, pick);
    const steal = theirEx && theirEx !== id;
    st.taken.push(pick);
    const ex = theirEx;
    setCouple(S, me.gender === 'f' ? id : pick, me.gender === 'f' ? pick : id);
    T(S, id).picked++; T(S, pick).picked++;
    if (was === pick) { T(S, id).loyal++; bumpBoth(S, id, pick, { trust: 6 }); }
    const fx = {};
    let tail = '';
    if (steal) { T(S, id).steals++; fx[id] = -3; fx[ex] = 4; bump(S, ex, id, { tension: 25 }); bump(S, ex, pick, { tension: 10, trust: -8 }); moment(S, { type: 'steal', ids: [id, pick, ex] }); tail = ` ${n(P(S, ex))} is left standing. ${pr(P(S, ex)).They} claps. It is the loudest quiet clap in history.`; }
    else if (was && was !== pick) { fx[id] = -2; fx[was] = 3; bump(S, was, id, { tension: 20, trust: -10 }); tail = ` ${n(P(S, was))}, ${pr(P(S, was)).their} old partner, stares at the fire.`; }
    else if (rel(S, pick, id).spark > 60) { fx[pick] = 1; tail = ` ${n(them)} beams.`; }
    const said = isPlayer(S, id) ? `You couple up with ${n(them)}.` : `${n(me)}: ${speech(rng, me, them, { steal, strategic: !was && !steal && rel(S, id, pick).spark < 45 })} ${pr(me).They} picks ${n(them)}.`;
    scene(S, { where: 'firepit', kind: 'recouple', who: [id, pick, ex].filter(Boolean), text: `${said}${tail}${isPlayer(S, pick) ? ' That is you. Breathe.' : ''}`, fx, reveal: true, big: isPlayer(S, pick) || steal });
    if (steal) caption(S, captions.steal(rng, me, them, P(S, ex)), 'spicy');
    else if (rng.chance(0.35)) caption(S, captions.recouple(rng, me, them), 'neutral');
    st.i++;
  }
  // Whoever is left
  const left = ofGender(S, other(st.choosers)).filter((x) => !st.taken.includes(x));
  for (const x of left) {
    uncouple(S, x);
    if (st.dump) {
      const p = P(S, x);
      scene(S, { where: 'firepit', kind: 'dump', who: [x], text: `${isPlayer(S, x) ? 'Nobody steps forward for you. The fire pit goes quiet. You are dumped from the island.' : `Nobody steps forward for ${n(p)}. ${pr(p).They} is dumped from the island tonight.`} ${isPlayer(S, x) ? '' : arrival.exitDumped(rng, p)}`, big: true, fx: { [x]: 6 } });
      caption(S, captions.dumped(rng, p), 'sad');
      removeFromVilla(S, x, 'recoupling');
      moment(S, { type: 'dumped', ids: [x], how: 'recoupling' });
    } else scene(S, { where: 'firepit', kind: 'narrator', who: [x], text: `${n(P(S, x))} is left single. Not dumped. Not safe either.` });
  }
  const leftChoosers = ofGender(S, st.choosers).filter((id) => !isCoupled(S, id));
  for (const x of leftChoosers) scene(S, { where: 'firepit', kind: 'narrator', who: [x], text: `${n(P(S, x))} has nobody left to choose and stays single.` });
  moment(S, { type: 'recoupling', couples: S.couples.map((c) => [c.a, c.b]) });
}
const sparkWord = (v) => (v >= 70 ? 'into you 💗' : v >= 55 ? 'warm on you' : v >= 40 ? 'undecided' : 'not feeling it');

// ---------- public votes and dumpings ----------
/** Rank couples by the public's love, with the producer's own vote as a heavy thumb on the scale. */
function voteCouples(S, rng, fav, favBoost = 28) {
  const rows = S.couples.map((c) => ({ c, v: (pop(S, c.a) + pop(S, c.b)) / 2 + strength(S, c) * 0.3 + rng.gauss(0, 5) + (fav && fav.a === c.a && fav.b === c.b ? favBoost : 0) }));
  rows.sort((p, q) => q.v - p.v);
  const tot = rows.reduce((s, r) => s + Math.max(5, r.v), 0);
  return rows.map((r) => Object.assign(r, { share: Math.max(1, Math.round((Math.max(5, r.v) / tot) * 100)) }));
}
function stepPublicVote(S, rng, st) {
  if (!S.couples.length) return;
  if (!st.phase) {
    sendText(S, rng, st.mode === 'publicDumpCouple' ? (st.toFinal ? texts.finalVote(rng) : texts.publicDump(rng)) : texts.publicVote(rng));
    st.phase = 'vote';
  }
  if (st.phase === 'vote') {
    if (S.mode === 'producer' && !hasAnswer(S)) {
      return ask(S, st, { type: 'couplePick', by: 'public', title: 'Vote for your favorite couple', prompt: `${PUBLIC} is voting. Your vote carries the room.`, options: couplesSorted(S).map((c) => ({ id: `${c.a}|${c.b}`, who: [c.a, c.b], label: `${n(P(S, c.a))} & ${n(P(S, c.b))}`, sub: `${strength(S, c)}% · ${popShort(S, c)}` })) });
    }
    let fav = null;
    if (hasAnswer(S)) { const a = take(S); const [x, y] = String(a.id).split('|'); fav = S.couples.find((k) => k.a === x && k.b === y) || null; }
    const ranked = voteCouples(S, rng, fav);
    st.ranked = ranked.map((r) => ({ a: r.c.a, b: r.c.b, share: r.share }));
    const top = ranked[0].c;
    scene(S, { where: 'firepit', kind: 'vote', who: [top.a, top.b], text: `The results. The couple with the most votes: ${n(P(S, top.a))} and ${n(P(S, top.b))}. They are safe. ${n(P(S, top.a))} exhales for the first time all day.`, reveal: true, fx: { [top.a]: 2, [top.b]: 2 } });
    const k = st.mode === 'publicDumpCouple' ? 2 : Math.min(3, Math.max(2, ranked.length - 2));
    st.bottom = ranked.slice(-k).map((r) => [r.c.a, r.c.b]);
    if (st.toFinal && S.couples.length <= st.toFinal && !singles(S).length) { scene(S, { where: 'firepit', kind: 'vote', text: `Every couple is safe. The final ${S.couples.length} are set.`, big: true }); st.phase = 'done'; return; }
    const names = st.bottom.map(([a, b]) => `${n(P(S, a))} & ${n(P(S, b))}`).join(', ');
    scene(S, { where: 'firepit', kind: 'vote', who: st.bottom.flat(), text: `The couples with the fewest votes, and at risk tonight: ${names}.`, reveal: true, big: true });
    st.phase = 'dump';
  }
  if (st.phase === 'dump') {
    if (st.mode === 'islandersDecide') return islandersDecide(S, rng, st);
    if (st.mode === 'publicDump') return publicDump(S, rng, st);
    if (st.mode === 'publicDumpCouple') return publicDumpCouple(S, rng, st);
  }
}
function islandersDecide(S, rng, st) {
  // Safe girls dump a boy from the bottom couples; safe boys dump a girl.
  const vulnerable = st.bottom.flat();
  const safe = S.inVilla.filter((id) => !vulnerable.includes(id));
  if (!st.texted) { sendText(S, rng, texts.islandersDecide(rng, 2), pk(rng, safe.length ? safe : S.inVilla)); st.texted = true; }
  for (const g of ['f', 'm']) {
    if (st[`dumped_${g}`]) continue;
    const voters = safe.filter((id) => S.inVilla.includes(id) && P(S, id).gender !== g);
    const options = vulnerable.filter((id) => S.inVilla.includes(id) && P(S, id).gender === g);
    if (!options.length) { st[`dumped_${g}`] = 'none'; continue; }
    const tallyV = Object.fromEntries(options.map((o) => [o, 0]));
    if (S.playerId && voters.includes(S.playerId)) {
      if (!hasAnswer(S)) return ask(S, st, { type: 'dumpVote', by: S.playerId, title: `Who goes home?`, prompt: `The safe ${nounPl(other(g))} must send one ${noun({ gender: g })} home. Vote.`, options: options.map((x) => ({ id: x, who: [x], label: n(P(S, x)), sub: `${pop(S, x)} pop · ${partnerOf(S, x) ? `coupled with ${n(P(S, partnerOf(S, x)))}` : 'single'}` })) });
      const a = take(S); if (tallyV[a.id] != null) tallyV[a.id] += 1.5;
    }
    for (const v of voters) { if (isPlayer(S, v)) continue; const pick = options.map((o) => ({ o, s: -rel(S, v, o).trust - rel(S, v, o).spark * 0.3 + rel(S, v, o).tension * 0.6 - pop(S, o) * P(S, v).attrs.game * 0.004 + rng.gauss(0, 6) })).sort((p, q) => q.s - p.s)[0].o; tallyV[pick]++; }
    const out = Object.entries(tallyV).sort((p, q) => q[1] - p[1])[0][0];
    st[`dumped_${g}`] = out;
    dumpIslander(S, rng, out, 'islanders', `The ${nounPl(other(g))} have decided. ${isPlayer(S, out) ? 'It is you. You are dumped from the island.' : `${n(P(S, out))} is dumped from the island.`}`);
  }
  st.phase = 'done';
}
function publicDump(S, rng, st) {
  // Vulnerable: singles plus the bottom couples. The public picks one girl and one boy to go.
  const vulnerable = [...singles(S), ...st.bottom.flat()];
  for (const g of ['f', 'm']) {
    if (st[`dumped_${g}`]) continue;
    const options = vulnerable.filter((id) => P(S, id).gender === g && S.inVilla.includes(id));
    const counts = { f: girls(S).length, m: boys(S).length };
    // Keep the villa balanced: only dump from a gender that is not already short.
    if (!options.length || counts[g] < counts[other(g)]) { st[`dumped_${g}`] = 'none'; continue; }
    let out;
    if (S.mode === 'producer') {
      if (!hasAnswer(S)) return ask(S, st, { type: 'dumpPick', by: 'public', title: `Which ${noun({ gender: g })} leaves tonight?`, prompt: `${PUBLIC} decides. The vulnerable ${nounPl(g)} are waiting at the fire pit.`, options: options.map((x) => ({ id: x, who: [x], label: n(P(S, x)), sub: `${pop(S, x)} pop · ${isCoupled(S, x) ? `with ${n(P(S, partnerOf(S, x)))}` : 'single'}` })) });
      out = take(S).id; if (!options.includes(out)) out = options[0];
    } else out = options.map((o) => ({ o, v: pop(S, o) + (isCoupled(S, o) ? 8 : 0) + rng.gauss(0, 6) })).sort((p, q) => p.v - q.v)[0].o;
    st[`dumped_${g}`] = out;
    dumpIslander(S, rng, out, 'public', `${PUBLIC} has voted. ${isPlayer(S, out) ? 'You have been dumped from the island.' : `${n(P(S, out))} is dumped from the island.`}`);
  }
  st.phase = 'done';
}
function publicDumpCouple(S, rng, st) {
  // Singles go first so the final is couples only.
  for (const x of singles(S)) dumpIslander(S, rng, x, 'public', `${isPlayer(S, x) ? 'You are single, and the public has voted. You are dumped from the island.' : `${n(P(S, x))}, single tonight, is dumped from the island.`}`);
  const target = st.toFinal || Math.max(2, S.couples.length - 1);
  if (S.couples.length <= target) { st.phase = 'done'; return; }
  // The ranked list from the vote, weakest last; anyone already gone is skipped.
  const ranked = (st.ranked || []).filter((r) => S.couples.some((c) => c.a === r.a && c.b === r.b));
  const bottom = st.bottom.filter(([a, b]) => S.couples.some((c) => c.a === a && c.b === b));
  if (!bottom.length && !ranked.length) { st.phase = 'done'; return; }
  let gone = null;
  if (S.mode === 'producer' && !st.publicPicked && bottom.length) {
    if (!hasAnswer(S)) return ask(S, st, { type: 'couplePick', by: 'public', title: 'Which couple leaves?', prompt: `${PUBLIC} makes the final call between the bottom couples.`, options: bottom.map(([a, b]) => ({ id: `${a}|${b}`, who: [a, b], label: `${n(P(S, a))} & ${n(P(S, b))}`, sub: `${popShort(S, { a, b })}` })) });
    const ans = take(S); const [x, y] = String(ans.id).split('|'); gone = bottom.find(([a, b]) => a === x && b === y) || bottom[bottom.length - 1];
    st.publicPicked = true;
  }
  // Dump until the villa is down to the target, weakest couple first.
  while (S.couples.length > target) {
    if (!gone) { const last = ranked.filter((r) => S.couples.some((c) => c.a === r.a && c.b === r.b)).pop(); gone = last ? [last.a, last.b] : (bottom.find(([a, b]) => S.couples.some((c) => c.a === a && c.b === b)) || null); }
    if (!gone) { const weakest = couplesSorted(S).pop(); gone = weakest ? [weakest.a, weakest.b] : null; }
    if (!gone) break;
    const [a, b] = gone;
    scene(S, { where: 'firepit', kind: 'dump', who: [a, b], text: `The couple leaving the villa tonight is... ${n(P(S, a))} and ${n(P(S, b))}.${isPlayer(S, a) || isPlayer(S, b) ? ' That is you.' : ''} ${S.day >= 20 ? arrival.exitFinal(rng, P(S, isPlayer(S, a) ? b : a)) : arrival.exitDumped(rng, P(S, a))}`, big: true, reveal: true, fx: { [a]: 3, [b]: 3 } });
    caption(S, captions.dumped(rng, P(S, rng.chance(0.5) ? a : b)), 'sad');
    removeFromVilla(S, a, 'public'); removeFromVilla(S, b, 'public');
    moment(S, { type: 'dumped', ids: [a, b], how: 'public' });
    gone = null;
  }
  st.phase = 'done';
}
function dumpIslander(S, rng, id, how, lead) {
  const p = P(S, id);
  scene(S, { where: 'firepit', kind: 'dump', who: [id], text: `${lead} ${isPlayer(S, id) ? '' : arrival.exitDumped(rng, p)}`, big: true, reveal: true, fx: { [id]: 4 } });
  caption(S, captions.dumped(rng, p), 'sad');
  removeFromVilla(S, id, how);
  moment(S, { type: 'dumped', ids: [id], how });
}

// ---------- casa amor ----------
function simCasaDay(S, rng) {
  const C = S.casa; if (!C) return;
  C.day++;
  const budget = 7; const events = [];
  for (const id of S.inVilla) {
    if (isPlayer(S, id)) continue;
    const me = P(S, id), partner = partnerOf(S, id);
    const bombs = C.bombs[other(me.gender)];
    if (!bombs.length) continue;
    const best = bombs.map((b) => ({ b, v: rel(S, id, b).spark + P(S, b).attrs.charm * 0.2 + rng.gauss(0, 8) })).sort((p, q) => q.v - p.v)[0];
    const cs = partner ? strength(S, coupleOf(S, id)) : 0;
    const lean = C.lean[id] || (C.lean[id] = { b: null, score: partner ? 20 : 55 });
    const pull = (100 - me.attrs.loyal) * 0.25 + me.attrs.open * 0.12 + best.v * 0.25 - cs * 0.3 + (partner && rel(S, id, partner).spark < 50 ? 12 : 0) + rng.gauss(0, 7);
    lean.score = clamp(lean.score + pull * 0.35, 0, 100);
    lean.b = best.b;
    bump(S, id, best.b, { spark: lean.score > 50 ? 8 : 3 }); bump(S, best.b, id, { spark: 5 });
    const where = me.gender === 'm' ? 'casa' : 'villa';
    if (lean.score > 60) events.push({ w: 8, kind: 'flirt', where, who: [id, best.b], text: casaT.tempted(rng, me, P(S, best.b), partner ? P(S, partner) : { name: 'nobody' }), fx: { [id]: -3 }, cap: () => captions.casaTwist(rng, me, P(S, best.b)), apply: () => { C.history.push({ day: S.day, who: id, b: best.b, kind: lean.score > 75 ? 'kiss' : 'talk' }); if (lean.score > 75 && !S.kissed[`${id}|${best.b}`]) { S.kissed[`${id}|${best.b}`] = S.day; T(S, id).kisses++; } } });
    else if (partner && lean.score < 30 && me.attrs.loyal > 60) events.push({ w: 5, kind: 'chat', where, who: [id], text: casaT.loyalDay(rng, me, P(S, partner)), fx: { [id]: 3 }, cap: () => captions.casaLoyal(rng, me), apply: () => { C.history.push({ day: S.day, who: id, kind: 'loyal' }); } });
  }
  events.sort((p, q) => q.w + rng() * 3 - (p.w + rng() * 3));
  for (const e of events.slice(0, budget)) { scene(S, { where: e.where, kind: e.kind, who: e.who, text: e.text, fx: e.fx }); e.apply(); if (e.cap && rng.chance(0.6)) caption(S, e.cap(), 'spicy'); }
  if (!events.length) scene(S, { where: 'casa', kind: 'narrator', text: 'A quiet day in both villas. Suspiciously quiet.' });
}
function stepCasaRecoupling(S, rng, st) {
  const C = S.casa; if (!C) return;
  if (!st.started) {
    sendText(S, rng, texts.casaRecouple(rng), pk(rng, girls(S)));
    scene(S, { where: 'firepit', kind: 'narrator', text: 'The girls sit at the fire pit. The boys are on their way back. Behind each of them: either nobody, or somebody new.', big: true });
    st.started = true;
    st.decisions = {};
    st.order = S.couples.map((c) => [c.a, c.b]);
    st.i = 0;
    // Singles in the main villa or casa decide too (they can only "twist", i.e. couple with a bombshell).
    st.singles = singles(S).slice();
  }
  const decideFor = (id) => {
    const lean = C.lean[id] || { b: null, score: 20 };
    const me = P(S, id);
    const twist = lean.b && rng.chance(clamp((lean.score - 40) / 45, 0.02, 0.92) * (me.attrs.loyal > 80 ? 0.3 : 1));
    return twist ? lean.b : 'stick';
  };
  // Player's decision first if needed
  if (S.playerId && S.inVilla.includes(S.playerId) && st.decisions[S.playerId] == null) {
    const me = P(S, S.playerId);
    const bombs = C.bombs[other(me.gender)].filter((b) => S.cast[b]);
    if (!hasAnswer(S)) return ask(S, st, { type: 'casaPick', by: S.playerId, title: 'Stick or twist?', prompt: partnerOf(S, S.playerId) ? `Walk back to ${n(P(S, partnerOf(S, S.playerId)))} alone, or walk in with someone new.` : 'You are single. Couple up with someone from Casa, or walk in alone.', options: [{ id: 'stick', label: partnerOf(S, S.playerId) ? `Stick with ${n(P(S, partnerOf(S, S.playerId)))} 🔒` : 'Walk in alone', sub: partnerOf(S, S.playerId) ? `${strength(S, coupleOf(S, S.playerId))}% · you don't know what they did` : 'Stay single, stay vulnerable' }, ...bombs.map((b) => ({ id: b, who: [b], label: `Twist with ${n(P(S, b))} 💣`, sub: sparkWord(rel(S, b, S.playerId).spark) }))] });
    st.decisions[S.playerId] = take(S).id;
  }
  for (const [a, b] of st.order) {
    if (st.decisions[a] == null) st.decisions[a] = decideFor(a);
    if (st.decisions[b] == null) st.decisions[b] = decideFor(b);
  }
  for (const s of st.singles) if (st.decisions[s] == null) st.decisions[s] = decideFor(s);
  // Reveal, couple by couple
  const newCouples = [];
  const stayIn = new Set();
  for (const [a, b] of st.order) {
    const A = P(S, a), B = P(S, b);
    const da = st.decisions[a], db = st.decisions[b];
    const aTw = da !== 'stick' && S.cast[da], bTw = db !== 'stick' && S.cast[db];
    if (!aTw && !bTw) {
      scene(S, { where: 'firepit', kind: 'recouple', who: [a, b], text: `${casaT.stick(rng, B, A)} ${casaT.bothStuck(rng, A, B)}`, reveal: true, big: true, fx: { [a]: 6, [b]: 6 } });
      caption(S, captions.bothStuck(rng, A, B), 'soft');
      bumpBoth(S, a, b, { trust: 15, spark: 8 }); T(S, a).stuck++; T(S, b).stuck++; T(S, a).loyal++; T(S, b).loyal++; S.stats.stuck += 2;
      newCouples.push([a, b]);
    } else if (aTw && bTw) {
      scene(S, { where: 'firepit', kind: 'recouple', who: [a, b, da, db], text: casaT.bothTwisted(rng, A, B, P(S, da), P(S, db)), reveal: true, big: true, fx: { [a]: -2, [b]: -2 } });
      T(S, a).twists++; T(S, b).twists++; S.stats.twisted += 2;
      newCouples.push([a, da], [db, b]); stayIn.add(da); stayIn.add(db);
      C.history.push({ day: S.day, who: a, b: da, kind: 'twist' }, { day: S.day, who: b, b: db, kind: 'twist' });
    } else {
      const loyal = aTw ? b : a, twister = aTw ? a : b, nb = aTw ? da : db;
      const L = P(S, loyal), TW = P(S, twister), NB = P(S, nb);
      scene(S, { where: 'firepit', kind: 'recouple', who: [loyal, twister, nb], text: `${casaT.stick(rng, L, TW)} ${casaT.twist(rng, TW, NB, L)} ${casaT.betrayed(rng, L, TW, NB)}`, reveal: true, big: true, fx: { [loyal]: 10, [twister]: -9, [nb]: -2 } });
      caption(S, captions.betrayed(rng, L, TW), 'spicy');
      scene(S, { where: 'terrace', kind: 'argument', who: [loyal, twister], text: casaT.aftermath(rng, L, TW), fx: { [twister]: -2 } });
      bump(S, loyal, twister, { tension: 40, trust: -30, spark: -20 }); T(S, loyal).betrayed++; T(S, loyal).stuck++; T(S, loyal).loyal++; T(S, twister).twists++; S.stats.stuck++; S.stats.twisted++;
      newCouples.push(TW.gender === 'f' ? [twister, nb] : [nb, twister]); stayIn.add(nb);
      C.history.push({ day: S.day, who: twister, b: nb, kind: 'twist' });
      moment(S, { type: 'betrayed', ids: [loyal, twister, nb] });
    }
  }
  for (const s of st.singles) {
    const ds = st.decisions[s];
    if (ds !== 'stick' && S.cast[ds]) { const Sg = P(S, s); newCouples.push(Sg.gender === 'f' ? [s, ds] : [ds, s]); stayIn.add(ds); scene(S, { where: 'firepit', kind: 'recouple', who: [s, ds], text: `${n(Sg)}, single before Casa, walks in with ${n(P(S, ds))}. Fresh start. Good for ${pr(Sg).them}.`, reveal: true, fx: { [s]: 2 } }); }
    else scene(S, { where: 'firepit', kind: 'narrator', who: [s], text: `${n(P(S, s))} walks in alone, still single. Still here.`, reveal: true });
  }
  // Apply
  S.couples = [];
  for (const b of [...C.bombs.f, ...C.bombs.m]) if (stayIn.has(b)) { const p = P(S, b); p.arrived = S.day; p.bombshell = true; addToVilla(S, p); ensureTally(S, b); }
  for (const [f, m] of newCouples) setCouple(S, f, m);
  const gone = [...C.bombs.f, ...C.bombs.m].filter((b) => !stayIn.has(b));
  if (gone.length) scene(S, { where: 'villa', kind: 'narrator', text: `${gone.map((b) => n(P(S, b))).join(', ')} ${gone.length === 1 ? 'leaves' : 'leave'} the villa. Casa Amor is over.` });
  const sing = singles(S);
  if (sing.length) scene(S, { where: 'firepit', kind: 'narrator', who: sing, text: `${sing.map((x) => n(P(S, x))).join(' and ')} ${sing.length === 1 ? 'is' : 'are'} single tonight, and vulnerable at the next dumping.` });
  moment(S, { type: 'casaRecoupling', couples: S.couples.map((c) => [c.a, c.b]) });
  S.casa = null;
  S.casaHistory = C.history;
}

// ---------- movie night ----------
function stepMovieNight(S, rng) {
  sendText(S, rng, texts.movieNight(rng));
  scene(S, { where: 'garden', kind: 'movie', text: movie.intro(rng), big: true });
  const hist = (S.casaHistory || []).filter((h) => S.inVilla.includes(h.who));
  const clips = [];
  for (const h of hist) {
    const partner = partnerOf(S, h.who);
    if (!partner) continue;
    if ((h.kind === 'kiss' || h.kind === 'talk' || h.kind === 'twist') && h.b && S.cast[h.b] && partnerOf(S, h.who) !== h.b) clips.push({ w: h.kind === 'kiss' ? 9 : 6, who: [h.who, h.b, partner], text: h.kind === 'kiss' ? movie.clipKiss(rng, P(S, h.who), P(S, h.b), P(S, partner)) : movie.clipTalk(rng, P(S, h.who), P(S, h.b), P(S, partner)), apply: () => { bump(S, partner, h.who, { tension: 22, trust: -14 }); S.beef.push({ a: partner, b: h.who }); }, fx: { [h.who]: -4, [partner]: 3 } });
    else if (h.kind === 'loyal') clips.push({ w: 4, who: [h.who, partner], text: movie.clipLoyal(rng, P(S, h.who), P(S, partner)), apply: () => bumpBoth(S, h.who, partner, { trust: 8, spark: 4 }), fx: { [h.who]: 4 } });
  }
  for (const s of S.secrets.slice(-8)) {
    if (s.kind === 'flirt' && S.inVilla.includes(s.who) && S.inVilla.includes(s.about)) { const partner = partnerOf(S, s.who); if (partner && partner !== s.about) clips.push({ w: 5, who: [s.who, s.about, partner], text: movie.clipTalk(rng, P(S, s.who), P(S, s.about), P(S, partner)), apply: () => { bump(S, partner, s.who, { tension: 14, trust: -8 }); }, fx: { [s.who]: -3 } }); }
  }
  if (!clips.length) { const id = pk(rng, S.inVilla); const about = pk(rng, sameGender(S, id)); if (about) clips.push({ w: 3, who: [id, about], text: movie.clipGossip(rng, P(S, id), P(S, about)), apply: () => bump(S, about, id, { tension: 8 }), fx: { [id]: -2 } }); }
  clips.sort((p, q) => q.w - p.w);
  for (const c of clips.slice(0, 4)) { scene(S, { where: 'garden', kind: 'movie', who: c.who, text: `${c.text} ${movie.reaction(rng, P(S, c.who[0]))}`, fx: c.fx, reveal: true }); c.apply(); caption(S, captions.movie(rng, P(S, c.who[0])), 'spicy'); }
  moment(S, { type: 'movieNight' });
}

// ---------- kiss marry pie ----------
function stepSMP(S, rng, st) {
  if (!st.started) {
    sendText(S, rng, texts.challenge(rng, 'Kiss, Marry, Pie'));
    scene(S, { where: 'garden', kind: 'challenge', text: 'Kiss, Marry, Pie. One kiss, one proposal, one pie to the face. Everybody smiles. Not everybody means it.', big: true });
    const { choosers, targets } = smpChoosers(S, rng);
    st.started = true; st.choosers = choosers; st.targets = targets; st.i = 0;
    S.stats.challenges++;
  }
  while (st.i < st.choosers.length) {
    const id = st.choosers[st.i];
    if (!S.inVilla.includes(id)) { st.i++; continue; }
    const targets = st.targets.filter((t) => S.inVilla.includes(t));
    if (targets.length < 2) break;
    let pick;
    if (isPlayer(S, id)) {
      if (!hasAnswer(S)) return ask(S, st, { type: 'smp', by: id, title: 'Kiss, Marry, Pie', prompt: 'Pick who you kiss, who you marry, and who gets the pie.', options: targets.map((x) => ({ id: x, who: [x], label: n(P(S, x)), sub: partnerOf(S, x) === id ? 'your partner' : partnerOf(S, x) ? `with ${n(P(S, partnerOf(S, x)))}` : 'single' })), smp: true });
      const a = take(S); pick = { kiss: a.kiss, marry: a.marry, pie: a.pie };
      if (!targets.includes(pick.marry)) pick = smpAuto(S, rng, id, targets);
    } else pick = smpAuto(S, rng, id, targets);
    smpApply(S, rng, id, pick);
    st.i++;
  }
  moment(S, { type: 'challenge', id: 'snogMarryPie' });
}

// ---------- the end ----------
function finishSeason(S, rng) { S.phase = 'done'; S.awards = S.awards || computeAwards(S); }
export function computeAwards(S) {
  const ids = Object.keys(S.cast).filter((id) => S.tally[id]);
  const days = (id) => { const d = S.dumped.find((x) => x.id === id); return (d ? d.day : S.day) - (P(S, id).arrived || 1) + 1; };
  const by = (fn) => ids.slice().sort((x, y) => fn(y) - fn(x))[0] || null;
  const t = (id) => S.tally[id];
  const out = {};
  out.villain = by((id) => t(id).steals * 3 + t(id).twists * 4 + t(id).grafts * 1.2 + P(S, id).attrs.drama * 0.02 - pop(S, id) * 0.02);
  out.sweetheart = by((id) => pop(S, id) + t(id).loyal * 3 - t(id).grafts * 2);
  out.loyal = by((id) => t(id).loyal * 3 + t(id).stuck * 4 - t(id).twists * 6 - t(id).steals * 3 + days(id) * 0.1);
  out.graft = by((id) => t(id).grafts * 2 + t(id).dates);
  out.funny = by((id) => P(S, id).attrs.funny + days(id) * 0.5);
  out.bombshell = by((id) => (P(S, id).bombshell ? pop(S, id) + days(id) : -1));
  out.robbed = by((id) => (S.dumped.some((x) => x.id === id) ? pop(S, id) + days(id) * 0.5 : -1));
  out.kisses = by((id) => t(id).kisses);
  return out;
}
export const awardsList = () => AWARDS;

/** Islander mode score. */
export function playerScore(S) {
  if (!S.playerId) return 0;
  const id = S.playerId; const t = S.tally[id] || {}; const d = S.dumped.find((x) => x.id === id);
  const days = (d ? d.day : S.day) - (P(S, id).arrived || 1) + 1;
  let s = days * 12 + pop(S, id) * 2 + (t.kisses || 0) * 6 + (t.picked || 0) * 10 + (t.stuck || 0) * 25 + (t.dates || 0) * 5;
  if (S.final && !d) { const i = S.final.order.findIndex((o) => o.a === id || o.b === id); if (i === 0) s += 400; else if (i === 1) s += 220; else if (i >= 0) s += 150; }
  if (S.final && S.final.envelope && S.winner && (S.winner.a === id || S.winner.b === id)) { const mine = S.winner.a === id ? S.final.envelope.a : S.final.envelope.b; if (S.final.envelope.result === 'split') s += 100; else if (S.final.envelope.result === `steal:${id}`) s += 150; }
  return Math.round(s);
}
export { shipName };
