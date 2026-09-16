// Villa challenges. Each one reads the relationship matrix and writes scenes, popularity and
// tension back, and some let the player choose when they are the one holding the pie.
import { P, girls, boys, partnerOf, opposite, rel, bump, bumpBoth, scene, caption, popBump, pop, moment, ofGender, sameGender } from './model.js';
import { captions, CHALLENGE_NAMES } from './text.js';
import { pronoun, noun } from './cast.js';

const pk = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const n = (p) => p.name;
const pr = (p) => pronoun(p);

/** Whose heart raced for whom: the partner wins unless someone else has a real pull. */
export function heartRate(S, rng) {
  scene(S, { where: 'garden', kind: 'challenge', text: `Heart Rate Challenge. Everyone gets a monitor. Everyone performs a dance for everyone else. Everyone is about to find out something they did not want to know.`, big: true });
  const exposed = [];
  for (const id of S.inVilla) {
    const p = P(S, id), partner = partnerOf(S, id);
    const cands = opposite(S, id).map((x) => ({ x, v: rel(S, id, x).spark + P(S, x).attrs.looks * 0.25 + rng.gauss(0, 9) + (x === partner ? 6 : 0) }));
    cands.sort((u, w) => w.v - u.v);
    const top = cands[0] && cands[0].x;
    if (!top) continue;
    if (partner && top !== partner && rng.chance(0.75)) {
      const t = P(S, top), pt = P(S, partner);
      bump(S, partner, id, { tension: 16, trust: -8 });
      bump(S, id, top, { spark: 5 });
      scene(S, { where: 'garden', kind: 'challenge', who: [id, top, partner], text: `${n(p)}'s heart rate went up the most for... ${n(t)}. Not ${n(pt)}. ${n(pt)} laughs. ${n(pt)} is not laughing.`, fx: { [id]: -3, [partner]: 3 } });
      caption(S, captions.heartRate(rng, p, t, pt), 'spicy');
      exposed.push(id);
    } else if (partner && rng.chance(0.3)) {
      const pt = P(S, partner);
      bumpBoth(S, id, partner, { spark: 3, trust: 3 });
      scene(S, { where: 'garden', kind: 'challenge', who: [id, partner], text: `${n(p)}'s heart raced most for ${n(pt)}. ${pr(pt).They} does a little victory lap around the fire pit. Unnecessary. Adorable.`, fx: { [id]: 2, [partner]: 2 } });
    }
  }
  if (!exposed.length) scene(S, { where: 'garden', kind: 'narrator', text: 'Somehow, every heart raced for the right person. The producers look genuinely disappointed.' });
  const star = pk(rng, S.inVilla);
  scene(S, { where: 'garden', kind: 'challenge', who: [star], text: `${n(P(S, star))}'s dance involved a chair, a slow-motion hair flip, and a level of commitment the villa was not ready for.`, fx: { [star]: 4 } });
  caption(S, captions.challengeFunny(rng, P(S, star)), 'fun');
  return { exposed };
}

/**
 * Kiss, Marry, Pie: the choosing gender assigns one of each. Returns 'pause' when the player
 * must choose; `finish` applies a choice { kiss, marry, pie }.
 */
export function smpChoosers(S, rng) {
  const g = S.lastChoosers === 'f' ? 'm' : 'f';
  return { choosers: ofGender(S, g), targets: ofGender(S, g === 'f' ? 'm' : 'f') };
}
export function smpAuto(S, rng, chooserId, targets) {
  const partner = partnerOf(S, chooserId);
  const scored = targets.map((t) => ({ t, v: rel(S, chooserId, t).spark + rng.gauss(0, 6) + (t === partner ? 15 : 0) })).sort((a, b) => b.v - a.v);
  const marry = scored[0].t;
  const rest = scored.slice(1);
  const kiss = rest.length ? rest[0].t : marry;
  const pieCands = targets.filter((t) => t !== marry && t !== kiss);
  const pie = pieCands.length ? pieCands.map((t) => ({ t, v: rel(S, chooserId, t).tension + rng.gauss(0, 8) - rel(S, chooserId, t).spark * 0.3 })).sort((a, b) => b.v - a.v)[0].t : null;
  return { kiss, marry, pie };
}
export function smpApply(S, rng, chooserId, pick) {
  const c = P(S, chooserId), partner = partnerOf(S, chooserId);
  const m = P(S, pick.marry), k = P(S, pick.kiss), pie = pick.pie ? P(S, pick.pie) : null;
  const bits = [];
  if (pick.marry === partner) { bumpBoth(S, chooserId, partner, { trust: 4, spark: 2 }); bits.push(`marries ${n(m)} (obviously)`); }
  else { bits.push(`marries ${n(m)}`); if (partner) { bump(S, partner, chooserId, { tension: 10, trust: -6 }); bump(S, chooserId, pick.marry, { spark: 4 }); } }
  if (pick.kiss !== pick.marry) {
    bits.push(`kisses ${n(k)}`);
    if (partner && pick.kiss !== partner) { bump(S, partner, chooserId, { tension: 8 }); bump(S, pick.kiss, chooserId, { spark: 4 }); }
    const kp = partnerOf(S, pick.kiss);
    if (kp && kp !== chooserId) bump(S, kp, pick.kiss, { tension: 5 });
  }
  if (pie) {
    bits.push(`pies ${n(pie)} directly in the face`);
    bump(S, pick.pie, chooserId, { tension: 12, trust: -5 });
    popBump(S, chooserId, rng.chance(0.5) ? 2 : -2);
    caption(S, captions.pie(rng, c, pie), 'spicy');
  }
  scene(S, { where: 'garden', kind: 'challenge', who: [chooserId, pick.marry, pick.kiss, pick.pie].filter(Boolean), text: `${n(c)} ${bits.join(', ')}.${pick.marry !== partner && partner ? ` ${n(P(S, partner))} claps very slowly.` : ''}` });
}

export function babies(S, rng) {
  scene(S, { where: 'villa', kind: 'challenge', text: 'Baby day. Every couple gets a robot baby that cries at 3 a.m. and judges you. The villa is about to find out who is parent material.', big: true });
  for (const c of S.couples) {
    const a = P(S, c.a), b = P(S, c.b);
    const skill = (a.attrs.eq + b.attrs.eq + a.attrs.loyal + b.attrs.loyal) / 4 + rng.gauss(0, 12);
    if (skill > 62) { bumpBoth(S, c.a, c.b, { trust: 6, spark: 3 }); scene(S, { where: 'villa', kind: 'challenge', who: [c.a, c.b], text: pk(rng, [`${n(a)} and ${n(b)} are, annoyingly, great at this. Schedules. Lullabies. ${n(b)} burps the baby with a technique. Where did ${pr(b).they} learn a technique.`, `${n(a)} and ${n(b)} name the baby, dress the baby, and take the baby on a walk to the pool. The girls call them "mom and dad" for the rest of the day.`]), fx: { [c.a]: 3, [c.b]: 3 } }); caption(S, captions.sweet(rng, a, b), 'soft'); }
    else if (skill < 42) { bump(S, c.a, c.b, { tension: 8 }); scene(S, { where: 'villa', kind: 'challenge', who: [c.a, c.b], text: pk(rng, [`${n(b)} leaves the baby on a daybed to go to the gym. ${n(a)}: "It's a TEST." ${n(b)}: "It's a DOLL." Both true. Both bad.`, `${n(a)} and ${n(b)} lose their baby for twenty minutes. It was under a towel. Neither of them put the towel there. A mystery for the ages.`]), fx: { [c.b]: -2 } }); }
    else scene(S, { where: 'villa', kind: 'challenge', who: [c.a, c.b], text: `${n(a)} and ${n(b)} get through the day. The baby lives. Nobody cries who wasn't supposed to.` });
  }
  return {};
}

export function talent(S, rng) {
  scene(S, { where: 'garden', kind: 'challenge', text: 'Talent show. Everyone has a talent. Not everyone should have shown it.', big: true });
  const acts = ['a magic trick that goes wrong twice and then, somehow, right', 'a spoken-word poem about the fire pit', 'a full choreographed dance to a song only they know', 'a stand-up set about the other islanders that is far too accurate', 'juggling, and then juggling with fire, and then no longer juggling', 'a rap that rhymes every islander\'s name with a fruit', 'a ballad, sung with eyes closed, directly at one person', 'a backflip that was not asked for', 'an impression of every islander. The impressions are perfect. Nobody is happy.', 'a cooking demo that sets off the smoke alarm'];
  const perf = rng.sample(S.inVilla, Math.min(4, S.inVilla.length));
  for (const id of perf) {
    const p = P(S, id);
    const score = p.attrs.funny * 0.6 + p.attrs.charm * 0.4 + rng.gauss(0, 15);
    const d = score > 70 ? 5 : score > 50 ? 2 : -1;
    scene(S, { where: 'garden', kind: 'challenge', who: [id], text: `${n(p)} performs ${pk(rng, acts)}. ${score > 70 ? 'The villa loses it. Standing ovation, tears, a chant.' : score > 50 ? 'Polite applause turns into real applause about halfway through.' : 'The applause is supportive, which is the word people use when it was not good.'}`, fx: { [id]: d } });
    if (score > 70) caption(S, captions.challengeFunny(rng, p), 'fun');
  }
  return {};
}

export function newsroom(S, rng) {
  scene(S, { where: 'garden', kind: 'challenge', text: 'The Villa Newsroom. Islanders read real posts from the public about themselves, out loud, and have to guess who each one is about. This never goes well. That is the point.', big: true });
  const ids = rng.sample(S.inVilla, Math.min(4, S.inVilla.length));
  for (const id of ids) {
    const p = P(S, id);
    const loved = pop(S, id) >= 58;
    const line = loved ? captions.generic(rng, p) : pk(rng, [captions.graft(rng, p, P(S, pk(rng, opposite(S, id)))), captions.generic(rng, p)]);
    scene(S, { where: 'garden', kind: 'challenge', who: [id], text: `"${line}" ${loved ? `${n(p)} pretends to be embarrassed and is thrilled.` : `${n(p)} reads it twice. "That's about me?" It is about ${pr(p).them}.`}`, fx: { [id]: loved ? 2 : -2 } });
    if (!loved) { const partner = partnerOf(S, id); if (partner) bump(S, partner, id, { tension: 5 }); }
  }
  return {};
}

export function sportsDay(S, rng) {
  scene(S, { where: 'garden', kind: 'challenge', text: 'Sports Day. Sack races, three-legged sprints, a tug of war that gets weirdly personal.', big: true });
  const g = rng.shuffle(girls(S)), b = rng.shuffle(boys(S));
  const winners = S.couples.length ? rng.pick(S.couples) : null;
  if (winners) { bumpBoth(S, winners.a, winners.b, { trust: 5, spark: 3 }); scene(S, { where: 'garden', kind: 'challenge', who: [winners.a, winners.b], text: `${n(P(S, winners.a))} and ${n(P(S, winners.b))} win the three-legged race by simply not falling over, which nobody else manages. Gold medals. A kiss on the podium.`, fx: { [winners.a]: 3, [winners.b]: 3 } }); }
  if (g.length && b.length) {
    const flop = rng.pick([...g, ...b]);
    scene(S, { where: 'garden', kind: 'challenge', who: [flop], text: `${n(P(S, flop))} goes down in the sack race like a felled tree and lies there laughing for a full minute. Nobody helps. Everyone films.`, fx: { [flop]: 3 } });
    caption(S, captions.challengeFunny(rng, P(S, flop)), 'fun');
  }
  const tug = rng.chance(0.6);
  if (tug) scene(S, { where: 'garden', kind: 'narrator', text: 'Girls win the tug of war. The boys demand a rematch. The girls decline, from the pool, with drinks.' });
  return {};
}

export function truth(S, rng) {
  scene(S, { where: 'firepit', kind: 'challenge', text: 'Spill the Tea. Anonymous questions from the islanders, read out at the fire pit. Everybody wrote one. Everybody swears they didn\'t.', big: true });
  const qs = [
    (S, rng) => { const id = pk(rng, S.inVilla); const p = P(S, id); const others = opposite(S, id).filter((x) => x !== partnerOf(S, id)); if (!others.length) return null; const best = others.sort((x, y) => rel(S, id, y).spark - rel(S, id, x).spark)[0]; const partner = partnerOf(S, id); if (rel(S, id, best).spark < 45) return null; if (partner) bump(S, partner, id, { tension: 9, trust: -4 }); return { who: [id, best], text: `"Which islander, other than your partner, would you couple up with?" ${n(p)}, after a pause the length of a commercial break: "...${n(P(S, best))}." ${partner ? `${n(P(S, partner))} nods a lot. Too much.` : ''}`, fx: { [id]: -2 } }; },
    (S, rng) => { const id = pk(rng, S.inVilla); const p = P(S, id); const target = pk(rng, sameGender(S, id)); if (!target) return null; bump(S, target, id, { tension: 6 }); return { who: [id, target], text: `"Who in here is playing a game?" ${n(p)} says "${n(P(S, target))}" before the question is finished. ${n(P(S, target))}: "Wow. Okay. WOW."`, fx: { [id]: -1, [target]: 2 } }; },
    (S, rng) => { const c = S.couples.length ? pk(rng, S.couples) : null; if (!c) return null; bumpBoth(S, c.a, c.b, { trust: 4 }); return { who: [c.a, c.b], text: `"Which couple will make it on the outside?" Nearly everyone says ${n(P(S, c.a))} and ${n(P(S, c.b))}. They hold hands under the bench and pretend they are not delighted.`, fx: { [c.a]: 3, [c.b]: 3 } }; },
    (S, rng) => { const id = pk(rng, S.inVilla); const p = P(S, id); return { who: [id], text: `"Who has the worst chat?" Silence, then ${n(p)}'s own partner says ${pr(p).their} name. It was a joke. ${n(p)} does not laugh for the rest of the night.`, fx: { [id]: 1 } }; },
  ];
  let count = 0;
  for (const q of rng.shuffle(qs)) { const s = q(S, rng); if (s) { scene(S, Object.assign({ where: 'firepit', kind: 'challenge' }, s)); count++; } if (count >= 3) break; }
  return {};
}

export function baggage(S, rng) {
  scene(S, { where: 'garden', kind: 'challenge', text: 'Excess Baggage. Suitcases arrive, each with a secret from an islander\'s past. Guess whose. Laugh. Regret.', big: true });
  const ids = rng.sample(S.inVilla, Math.min(5, S.inVilla.length));
  for (const id of ids) {
    const p = P(S, id);
    const which = rng.pick(['flag', 'ick', 'fame']);
    const line = which === 'flag' ? `"This islander ${p.bio.flag}."` : which === 'ick' ? `"This islander's biggest ick is when someone ${p.bio.ick}."` : `"This islander ${p.bio.fame}."`;
    const guessRight = rng.chance(0.55);
    const partner = partnerOf(S, id);
    if (which === 'flag' && partner && rng.chance(0.5)) bump(S, partner, id, { tension: 5 });
    scene(S, { where: 'garden', kind: 'challenge', who: [id], text: `${line} ${guessRight ? `Everyone points at ${n(p)} immediately. ${pr(p).They} does not deny it.` : `Three wrong guesses before ${n(p)} raises a hand. "...Fine. Yes."`}`, fx: { [id]: which === 'fame' ? 2 : 0 } });
  }
  return {};
}

export const CHALLENGE_RUN = { heartRate, babies, talent, newsroom, sportsDay, truth, baggage };
export const challengeTitle = (id) => CHALLENGE_NAMES[id] || id;
export function runChallenge(S, rng, id) {
  S.stats.challenges++;
  moment(S, { type: 'challenge', id });
  const fn = CHALLENGE_RUN[id];
  return fn ? fn(S, rng) : {};
}
