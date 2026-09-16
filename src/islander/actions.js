// Islander mode: what you can do with your two moves a day, and how a chat plays out.
// Everything here writes straight into the villa state so the sim sees what you did.
import { P, partnerOf, isCoupled, opposite, sameGender, rel, bump, bumpBoth, mutual, strength, coupleOf, popBump, pop, scene, caption, moment, singles } from '../villa/model.js';
import { withRng } from '../villa/engine.js';
import { ARCHETYPES, STYLES, STYLE_LABEL, pronoun, noun } from '../villa/cast.js';
import { captions } from '../villa/text.js';
import { clamp } from '../villa/rng.js';

const n = (p) => p.name;
const pr = (p) => pronoun(p);
const pk = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const me = (S) => P(S, S.playerId);
const T = (S, id) => (S.tally[id] = S.tally[id] || { kisses: 0, grafts: 0, arguments: 0, loyal: 0, steals: 0, twists: 0, dates: 0, picked: 0, stuck: 0, betrayed: 0 });

/** Who you can talk to today: everyone in your villa, plus the Casa bombshells on your side. */
function reachable(S) {
  const id = S.playerId, g = me(S).gender;
  const inMain = S.inVilla.filter((x) => x !== id);
  if (!S.casa) return inMain;
  // During Casa the boys are away: a girl reaches the girls, the male bombshells; a boy reaches the boys and the female bombshells.
  const side = inMain.filter((x) => P(S, x).gender === g);
  return [...side, ...S.casa.bombs[g === 'f' ? 'm' : 'f']];
}

// ---------- situations ----------
function situation(S, t) {
  const id = S.playerId, partner = partnerOf(S, id);
  const tp = P(S, t);
  if (tp.gender === me(S).gender) return 'friend';
  if (S.casa && S.casa.bombs[tp.gender].includes(t)) return 'casa';
  if (t === partner) return rel(S, partner, id).tension > 35 ? 'talk' : 'partner';
  return isCoupled(S, t) ? 'graft' : 'single';
}
const OPENERS = {
  partner: [
    (t) => `${n(t)} pats the daybed next to ${pr(t).them}. "Come here. How are you feeling about us, honestly?"`,
    (t) => `${n(t)} hands you a coffee. "Okay. Real talk. Where's your head at?"`,
    (t) => `${n(t)}, on the swing seat: "I keep thinking about last night. Good thinking. Mostly."`,
    (t) => `${n(t)} pulls you to the terrace. "The girls are asking if we're exclusive. I said I'd ask you."`,
  ],
  talk: [
    (t) => `${n(t)} is already sitting at the fire pit when you get there. "So. Are we going to talk about it or not?"`,
    (t) => `${n(t)}: "I'm not gonna lie, that stung. I just need to know what you were thinking."`,
    (t) => `${n(t)} doesn't look up. "Everyone saw. I looked stupid. Explain it to me."`,
  ],
  graft: [
    (t) => `${n(t)} glances back at the kitchen, then at you. "Okay, you've got five minutes. What's up?"`,
    (t) => `${n(t)} laughs. "You're going to get me in trouble." ${pr(t).They} sits down anyway.`,
    (t) => `${n(t)}: "I'm happy where I am. But... go on. Say what you came to say."`,
    (t) => `${n(t)} lowers ${pr(t).their} voice. "If ${n(P(S_current, partnerOf(S_current, t.id) || t.id))} sees this, it's a whole thing. So talk fast."`,
  ],
  single: [
    (t) => `${n(t)}, single and not pretending otherwise: "Finally. I was starting to think you weren't going to come over."`,
    (t) => `${n(t)} moves ${pr(t).their} towel so you can sit. "So what's your type on paper? Be honest."`,
    (t) => `${n(t)}: "Everyone in here is coupled up and lying about it. What about you?"`,
  ],
  casa: [
    (t) => `${n(t)} walks over like ${pr(t).they} has been waiting all day. "I've been told you're coupled up. How coupled up?"`,
    (t) => `${n(t)}: "Look, I'm not here to be anyone's test. Are you actually open, or just being polite?"`,
    (t) => `${n(t)}, on the daybed: "You keep looking at the door. ${pr(t).They}'s not coming through it. Talk to me."`,
  ],
  friend: [
    (t) => `${n(t)} pulls you to the terrace. "Okay. Debrief. What is going ON with you two?"`,
    (t) => `${n(t)} hands you a face mask. "Sit. Tell me everything. I have thoughts."`,
    (t) => `${n(t)}: "Between us? I'm worried about you. Say the thing you're not saying."`,
    (t) => `${n(t)}, whispering by the pool: "Do you want to know what I heard, or do you want to sleep tonight?"`,
  ],
};
let S_current = null; // openers need partner lookups; set during startChat

const LINES = {
  partner: {
    flirty: ['"I\'m feeling like I want to kiss you and stop talking about feelings."', '"My head\'s at you. Specifically your face. Come here."', '"Honestly? Distracted. By you. It\'s a problem."'],
    honest: ['"I like you. I\'m scared of how much, and I\'d rather say that than pretend."', '"Same page. Same book. I\'m in this, and I want to do it properly."', '"I\'m happy. That scares me a bit, but I\'m happy."'],
    funny: ['"My head\'s at whoever\'s making pancakes tomorrow. Is it you? It should be you."', '"Exclusive? In here? Bold. I\'m in. Where do I sign."', '"I\'m feeling like a person who\'s been in a villa for a week. So, unwell. But happy unwell."'],
    sweet: ['"You make this place feel calm. That\'s the nicest thing I can say about anywhere."', '"I look for you first when I wake up. That\'s where my head is."', '"I don\'t need a bombshell. I need you to keep making me tea."'],
    confident: ['"I know exactly where I stand, and I stand here. Do you?"', '"We\'re the strongest couple in here and everyone knows it."', '"Exclusive. Yes. Tell the girls I said it first."'],
    guarded: ['"I\'m still figuring it out. I\'m not going anywhere, I just need a little time."', '"It\'s early. I like you. Let\'s not name it yet."', '"I\'m good. Can we just enjoy it without the labels tonight?"'],
  },
  talk: {
    flirty: ['"You\'re cute when you\'re annoyed. That\'s not an answer. But you are."', '"Come here. Let me make it up to you properly."'],
    honest: ['"You\'re right. I wasn\'t thinking about how it looked. I\'m sorry."', '"I got caught up. It won\'t happen again, and I\'d rather you hear that from me than anyone else."', '"I messed up. Not the intention, but the effect. I own it."'],
    funny: ['"In my defense, I have no defense. Can I make you a smoothie."', '"I was being an idiot. A charming idiot. But an idiot."'],
    sweet: ['"I hate that I made you feel like that. You matter to me more than a chat by the pool."', '"I\'d rather lose the argument than lose you. Tell me what you need."'],
    confident: ['"It was a chat. I\'m allowed to have chats. But I hear you, and I\'m here."', '"I\'m not going to apologize for talking to people. I am going to apologize for not telling you first."'],
    guarded: ['"I don\'t really want to do this at the fire pit with everyone watching."', '"Can we talk about it tomorrow? I need to think."'],
  },
  graft: {
    flirty: ['"I\'ll be honest, I\'ve been trying not to look at you all week. It\'s not going well."', '"You\'re my type on paper and the paper is on fire. Just so you know."', '"If you weren\'t coupled up, I\'d have pulled you for this chat on day one."'],
    honest: ['"I\'m not trying to cause drama. I just think there\'s something here and I\'d rather say it than regret it."', '"You seem happy. I want to know if you\'re actually happy or just comfortable."', '"I\'m not going to pretend I don\'t feel something. What you do with that is up to you."'],
    funny: ['"This is a strictly professional chat about how you\'re very fit."', '"I came over to ask about the weather. It\'s hot. You\'re hot. Weather report complete."', '"Your partner\'s great. Really. Anyway, are you free at the next recoupling."'],
    sweet: ['"You seem like the kind of person who checks on everyone else. I wanted to check on you."', '"I just like being around you. That\'s all. No agenda. Okay, small agenda."'],
    confident: ['"I know you\'re coupled up. I also know you\'ve looked over here three times today."', '"I\'m not here to be polite. I\'m here because I think we\'d be better together than either of us is right now."'],
    guarded: ['"Nothing big. Just wanted to get to know you a bit. As friends. For now."', '"I\'m not going to say anything I can\'t take back. I just wanted a chat."'],
  },
  single: {
    flirty: ['"My type on paper? Tall, funny, and currently sitting right here."', '"I noticed you the second I walked in. I\'ve been waiting for a quiet moment."', '"You\'re dangerous. I like dangerous."'],
    honest: ['"I\'m open. Properly open. I\'d like to get to know you without playing games."', '"I don\'t know what this is yet. I\'d like to find out."', '"I\'m not going to rush it. But I\'m interested. Very."'],
    funny: ['"My type is someone who laughs at my jokes. Test: what do you call a fish with no eyes."', '"Everyone\'s lying about being coupled up? Great. I\'m lying about being single. Wait."', '"I have a strict no-drama policy. It\'s never once worked."'],
    sweet: ['"You seem kind. I don\'t say that about many people in here."', '"I want someone I can be soft with. You seem like that."'],
    confident: ['"Let\'s not dance around it. I think we\'d be good. Prove me wrong."', '"I\'m the best chat in this villa and I picked you. That\'s a compliment."'],
    guarded: ['"Let\'s just talk. No pressure. See where it goes."', '"I\'m taking it slow this time. If that\'s a problem, tell me now."'],
  },
  casa: {
    flirty: ['"I\'m coupled up. I\'m also on this daybed. Draw your own conclusions."', '"You\'re making this very hard. Which I think is your job."', '"Okay, you\'ve got my attention. Don\'t waste it."'],
    honest: ['"I\'m coupled up and I like them. I\'m also not going to pretend you\'re not interesting."', '"I owe it to myself to at least have this chat. I don\'t know what happens after."', '"I\'m torn. That\'s the truth. I didn\'t think I would be."'],
    funny: ['"Casa Amor is a loyalty test and I am, apparently, failing the practice questions."', '"I came here to get to know people. You\'re a people. Here I am."'],
    sweet: ['"You seem like a genuinely nice person and that is the last thing I need right now."', '"I\'m not going to lead you on. But I do like talking to you."'],
    confident: ['"I\'m coupled up, so if you want a shot, you\'ll have to be very convincing."', '"Everyone in here says they\'re loyal. I actually am. Change my mind."'],
    guarded: ['"I\'m coupled up and I\'m being loyal. Nice to meet you, though."', '"I\'m not open. I\'m being polite. There\'s a difference."'],
  },
  friend: {
    flirty: ['"Debrief later. First: did you SEE how they looked at me at breakfast."', '"I\'m going to go for it tonight. Full send. Hold my drink."'],
    honest: ['"I like them more than I\'m saying. I\'m scared it isn\'t mutual."', '"I\'m not sure about my couple. Don\'t repeat that. Well, repeat it a little."', '"I need you to tell me if I\'m being an idiot. Straight up."'],
    funny: ['"My plan is to be so charming it becomes a public safety issue."', '"I\'m fine. I\'m great. I\'ve cried twice and it\'s 11 a.m."'],
    sweet: ['"Honestly, having you in here is the best part. The rest is noise."', '"Whatever happens, we\'re leaving as friends. That\'s the deal."'],
    confident: ['"I know exactly what I\'m doing. Ask me again at the fire pit."', '"They\'d be lucky to have me. I\'m not being arrogant. I\'m being accurate."'],
    guarded: ['"I don\'t want to get into it. Tell me your stuff instead."', '"I\'m keeping my cards close. Not because of you. Because of the cameras."'],
  },
};
const REACT = {
  great: [(t) => `${n(t)} lights up. "Okay. Okay okay okay." ${pr(t).They} does not stop smiling for the rest of the chat.`, (t) => `${n(t)} goes quiet, then grabs your hand. "You can't just say things like that." ${pr(t).They} does not let go.`, (t) => `${n(t)} laughs and hides ${pr(t).their} face. "Stop. No, don't stop. Stop."`],
  good: [(t) => `${n(t)} nods slowly. "Yeah. Yeah, I feel that." Progress.`, (t) => `${n(t)} smiles. "Noted." ${pr(t).They} means it as a compliment.`, (t) => `${n(t)}: "I like that you said that." ${pr(t).They} moves an inch closer.`],
  meh: [(t) => `${n(t)} says "that's fair," which is what people say when nothing landed.`, (t) => `${n(t)} smiles politely and looks at the pool. Neutral. Fine. Not a win.`, (t) => `${n(t)}: "Cool." Cool is not good.`],
  bad: [(t) => `${n(t)} pulls back a little. "That's... a lot." ${pr(t).They} finds a reason to go to the kitchen.`, (t) => `${n(t)} laughs, but not the good laugh. "Okay then." Conversation over.`, (t) => `${n(t)}: "I don't really know what to say to that." Neither do you.`],
};
const FRIEND_REACT = {
  great: [(t) => `${n(t)} squeezes your arm. "That's what I needed to hear. I've got you." Sisterhood, or brotherhood, or whatever this is: locked.`, (t) => `${n(t)}: "You're my favorite person in here. Don't tell anyone. Tell everyone."`],
  good: [(t) => `${n(t)} nods. "Okay. I'm with you." A good ally is worth two bombshells.`, (t) => `${n(t)} laughs. "You're a mess. I love you." Both true.`],
  meh: [(t) => `${n(t)} listens, hums, and changes the subject to sunscreen.`],
  bad: [(t) => `${n(t)} raises an eyebrow. "Interesting." ${pr(t).They} will repeat this on the terrace tonight.`],
};

function styleAttr(S, style) {
  const a = me(S).attrs;
  return { flirty: a.charm * 0.6 + a.looks * 0.4, honest: a.eq * 0.6 + a.loyal * 0.4, funny: a.funny, sweet: a.eq * 0.5 + a.loyal * 0.5, confident: a.charm * 0.5 + a.game * 0.5, guarded: a.eq * 0.5 + a.game * 0.5 }[style] || 50;
}
export function chatOptions(S, t) {
  const sit = situation(S, t);
  const rng = () => Math.random();
  const styles = STYLES.filter((s) => LINES[sit][s]);
  const pickStyles = [...styles].sort(() => Math.random() - 0.5).slice(0, 3);
  return pickStyles.map((style) => ({ style, label: STYLE_LABEL[style], line: pk(rng, LINES[sit][style]) }));
}
/** Start a chat: NPC opener plus three ways to answer. */
export function startChat(S, t) {
  S_current = S;
  const tp = P(S, t), sit = situation(S, t);
  const opener = withRng(S, (rng) => pk(rng, OPENERS[sit])(tp));
  return { target: t, sit, opener, choices: chatOptions(S, t), round: 1 };
}
/** Answer with a style; returns the reaction, the numbers that moved, and maybe a second round. */
export function replyChat(S, chatCtx, style) {
  const id = S.playerId, t = chatCtx.target, tp = P(S, t), sit = chatCtx.sit;
  return withRng(S, (rng) => {
    const A = ARCHETYPES[tp.arch];
    let score = rel(S, t, id).spark * 0.45 + styleAttr(S, style) * 0.35 + (A.likes.includes(style) ? 16 : 0) + rng.gauss(0, 9);
    if (sit === 'friend') score = rel(S, t, id).trust * 0.5 + styleAttr(S, style) * 0.3 + (A.likes.includes(style) ? 12 : 0) + (style === 'confident' ? -6 : 0) + rng.gauss(0, 8);
    if (sit === 'graft') score -= strength(S, coupleOf(S, t)) * 0.25 - (100 - tp.attrs.loyal) * 0.15;
    if (sit === 'casa') score += (100 - tp.attrs.loyal) * 0.1;
    if (sit === 'talk') score += style === 'honest' || style === 'sweet' ? 14 : style === 'guarded' ? -14 : style === 'flirty' ? -6 : 0;
    if (style === 'guarded' && sit !== 'talk' && sit !== 'friend') score -= 8;
    const tier = score >= 68 ? 'great' : score >= 52 ? 'good' : score >= 38 ? 'meh' : 'bad';
    const chips = [];
    const partner = partnerOf(S, id), tPartner = partnerOf(S, t);
    const d = { great: { spark: 12, trust: 6, tension: -10 }, good: { spark: 7, trust: 3, tension: -5 }, meh: { spark: 1, trust: 1, tension: 0 }, bad: { spark: -5, trust: -2, tension: 6 } }[tier];
    if (sit === 'friend') {
      bump(S, t, id, { trust: d.spark }); bump(S, id, t, { trust: d.spark * 0.6 });
      chips.push({ label: `🤝 Trust ${d.spark >= 0 ? '+' : ''}${d.spark}`, tone: d.spark >= 0 ? 'good' : 'bad' });
      if (tier === 'great' || tier === 'good') { const intel = intelFrom(S, rng, t); if (intel) chips.push({ label: `🕵️ ${intel}`, tone: 'info' }); }
      if (tier === 'bad') { S.secrets.push({ day: S.day, who: id, about: t, kind: 'shade' }); }
    } else {
      bump(S, t, id, d); bump(S, id, t, { spark: Math.round(d.spark * 0.5), trust: Math.round(d.trust * 0.5) });
      chips.push({ label: `💗 Spark ${d.spark >= 0 ? '+' : ''}${d.spark}`, tone: d.spark >= 0 ? 'good' : 'bad' });
      if (d.trust) chips.push({ label: `🤝 Trust ${d.trust >= 0 ? '+' : ''}${d.trust}`, tone: d.trust >= 0 ? 'good' : 'bad' });
      if (sit === 'talk' && d.tension) chips.push({ label: `🌡️ Tension ${d.tension > 0 ? '+' : ''}${d.tension}`, tone: d.tension <= 0 ? 'good' : 'bad' });
      if ((sit === 'graft' || sit === 'casa' || sit === 'single') && partner && t !== partner) {
        const seen = rng.chance(sit === 'casa' ? 0.15 : 0.45);
        T(S, id).grafts++; S.player.grafts++;
        if (seen) { bump(S, partner, id, { tension: tier === 'great' ? 16 : 9, trust: -6 }); chips.push({ label: `👀 ${n(P(S, partner))} saw`, tone: 'bad' }); popBump(S, id, -2); chips.push({ label: '📉 Public −2', tone: 'bad' }); if (rng.chance(0.5)) S.beef.push({ a: partner, b: id }); }
        if (sit === 'casa' && tier !== 'bad') { S.casa.history.push({ day: S.day, who: id, b: t, kind: tier === 'great' ? 'kiss' : 'talk' }); S.casa.lean[id] = { b: t, score: 70 }; }
        if (sit !== 'casa') S.secrets.push({ day: S.day, who: id, about: t, kind: tier === 'bad' ? 'shot' : 'flirt', partner });
      }
      if (sit === 'graft' && tPartner && tier !== 'bad') { bump(S, tPartner, id, { tension: tier === 'great' ? 14 : 7 }); bump(S, tPartner, t, { tension: 8 }); if (rng.chance(0.4)) chips.push({ label: `😤 ${n(P(S, tPartner))} is not happy`, tone: 'bad' }); }
      if (sit === 'partner' && tier === 'great') { popBump(S, id, 2); chips.push({ label: '📈 Public +2', tone: 'good' }); T(S, id).loyal++; S.player.loyal++; }
      if (sit === 'talk' && (tier === 'great' || tier === 'good')) { popBump(S, id, 1); T(S, id).arguments++; }
      if (sit === 'talk' && tier === 'bad') { popBump(S, id, -2); chips.push({ label: '📉 Public −2', tone: 'bad' }); }
    }
    S.player.chats++;
    const reaction = pk(rng, (sit === 'friend' ? FRIEND_REACT : REACT)[tier])(tp);
    const kissable = sit !== 'friend' && (sit === 'partner' || sit === 'casa' || sit === 'single') && tier === 'great' && mutual(S, id, t) > 55 && chatCtx.round === 1;
    let next = null;
    if (chatCtx.round === 1 && rng.chance(sit === 'friend' ? 0.35 : 0.6)) {
      next = { target: t, sit, opener: followUp(rng, tp, sit, tier), choices: chatOptions(S, t), round: 2, kissable };
    }
    scene(S, { where: sit === 'casa' ? 'casa' : sit === 'friend' ? 'terrace' : sit === 'talk' ? 'firepit' : 'daybeds', kind: sit === 'talk' ? 'argument' : sit === 'friend' ? 'chat' : 'flirt', who: [id, t], text: `You pull ${n(tp)} for a chat. ${tier === 'great' ? 'It goes better than you dared hope.' : tier === 'good' ? 'It goes well.' : tier === 'meh' ? 'It goes... fine.' : 'It does not go well.'}` });
    if (sit === 'graft' && tier === 'great') caption(S, captions.graft(rng, me(S), tp), 'spicy');
    S.player.log.push({ day: S.day, t, style, tier });
    return { tier, reaction, chips, next, kissable };
  });
}
function followUp(rng, t, sit, tier) {
  const good = tier === 'great' || tier === 'good';
  const pool = {
    partner: good ? [`${n(t)} leans in. "Okay, one more question. What happens when we get out of here?"`, `${n(t)}: "So we're saying it? We're a thing-thing?"`] : [`${n(t)} pulls back. "Right. So where does that leave us?"`, `${n(t)}: "Be honest with me. Are you all in or not?"`],
    talk: good ? [`${n(t)} softens. "Okay. I believe you. Don't make me regret it."`, `${n(t)} exhales. "Thank you for actually saying that. Now what?"`] : [`${n(t)} stands up. "I need a minute. Actually, I need the night."`, `${n(t)}: "You're not hearing me. Try again."`],
    graft: good ? [`${n(t)} bites ${pr(t).their} lip. "You can't say that and then just... sit there. What do you want me to do with it?"`, `${n(t)} checks over ${pr(t).their} shoulder. "If I was open... hypothetically... what then?"`] : [`${n(t)} stands. "I think I should go find my partner." ${pr(t).They} lingers one second.`, `${n(t)}: "That's sweet. It's not going to happen. But it's sweet."`],
    single: good ? [`${n(t)}: "Okay, follow-up. Recoupling. If I stood up for you, would you be relieved or embarrassed?"`, `${n(t)} smiles. "Say something else. I liked that one."`] : [`${n(t)} shrugs. "We'll see. Villa's big." It is not big.`],
    casa: good ? [`${n(t)} leans back. "So. Stick or twist? Don't answer. Actually, answer."`, `${n(t)}: "If I'm wasting my time, tell me now. If I'm not, stop looking at the door."`] : [`${n(t)}: "Fair enough. Loyal is hot, honestly. Annoying, but hot."`],
    friend: good ? [`${n(t)} lowers ${pr(t).their} voice. "Okay, now the real question. What do you actually want out of here?"`] : [`${n(t)}: "Anyway. Enough about that. Sunscreen?"`],
  }[sit];
  return pk(rng, pool);
}
function intelFrom(S, rng, friend) {
  const id = S.playerId;
  const admirers = opposite(S, id).filter((x) => rel(S, x, id).spark >= 55 && partnerOf(S, id) !== x);
  const partner = partnerOf(S, id);
  const opts = [];
  if (admirers.length) { const x = pk(rng, admirers); opts.push(`${n(P(S, x))} has been asking about you`); }
  if (partner) { const wander = opposite(S, partner).filter((x) => x !== id && rel(S, partner, x).spark > rel(S, partner, id).spark - 5); if (wander.length) opts.push(`${n(P(S, partner))} keeps looking at ${n(P(S, pk(rng, wander)))}`); else if (rel(S, partner, id).spark > 60) opts.push(`${n(P(S, partner))} is all in, apparently`); }
  const rival = sameGender(S, id).filter((x) => rel(S, x, id).tension > 25); if (rival.length) opts.push(`${n(P(S, pk(rng, rival)))} isn't your biggest fan`);
  return opts.length ? pk(rng, opts) : null;
}

/** A kiss at the end of a great chat. */
export function kiss(S, t) {
  const id = S.playerId, tp = P(S, t);
  return withRng(S, (rng) => {
    const key = tp.gender === 'f' ? `${t}|${id}` : `${id}|${t}`;
    const first = !S.kissed[key];
    S.kissed[key] = S.day; S.stats.kisses++; T(S, id).kisses++; T(S, t).kisses++; S.player.kisses++;
    bumpBoth(S, id, t, { spark: 8, trust: 4 });
    const partner = partnerOf(S, id), tPartner = partnerOf(S, t);
    const chips = [{ label: '💋 Kiss', tone: 'good' }, { label: '💗 Spark +8', tone: 'good' }];
    if (partner && partner !== t) { bump(S, partner, id, { tension: 25, trust: -15, spark: -8 }); chips.push({ label: `💔 ${n(P(S, partner))} will hear about this`, tone: 'bad' }); S.secrets.push({ day: S.day, who: id, about: t, kind: 'flirt', partner }); if (S.casa) S.casa.history.push({ day: S.day, who: id, b: t, kind: 'kiss' }); else S.beef.push({ a: partner, b: id }); popBump(S, id, -3); }
    else { popBump(S, id, 3); chips.push({ label: '📈 Public +3', tone: 'good' }); }
    if (tPartner && tPartner !== id) { bump(S, tPartner, id, { tension: 20 }); bump(S, tPartner, t, { tension: 15, trust: -10 }); }
    scene(S, { where: S.casa ? 'casa' : 'terrace', kind: 'kiss', who: [id, t], text: `You kiss ${n(tp)}${first ? ' for the first time' : ''}. ${partner && partner !== t ? 'Somebody definitely saw.' : 'The terrace erupts.'}`, fx: null, big: true });
    caption(S, captions.kiss(rng, tp.gender === 'f' ? tp : me(S), tp.gender === 'f' ? me(S) : tp), 'soft');
    moment(S, { type: 'kiss', ids: [id, t] });
    return { chips, text: `You kiss ${n(tp)}. ${first ? 'First one.' : ''} ${partner && partner !== t ? `${n(P(S, partner))} is going to hear about this.` : ''}` };
  });
}

// ---------- non-chat actions ----------
const BEACH = [
  { id: 'gush', label: 'Gush about your partner', sub: 'The public loves a soft moment', tone: 'good' },
  { id: 'doubt', label: 'Admit you have doubts', sub: 'Honest. Risky. Very watchable.', tone: 'mixed' },
  { id: 'shade', label: 'Throw a little shade', sub: 'Pick a target. The edit will remember.', tone: 'spicy' },
  { id: 'grateful', label: 'Talk about the girls / boys', sub: 'Friendship is a storyline too', tone: 'good' },
];
export const playerAct = {
  options(S) {
    if (!S.player || !S.inVilla.includes(S.playerId)) return [];
    const id = S.playerId, partner = partnerOf(S, id);
    const reach = reachable(S);
    const opts = [];
    const chatTargets = reach;
    if (chatTargets.length) opts.push({ id: 'chat', emoji: '💬', label: 'Pull someone for a chat', sub: 'Graft, check in, or clear the air', targets: chatTargets });
    opts.push({ id: 'beachhut', emoji: '🎥', label: 'Beach Hut', sub: 'Talk to the camera. The public is listening.', choices: BEACH.filter((b) => (b.id === 'gush' || b.id === 'doubt' ? !!partner : true)) });
    if (partner && !S.casa) opts.push({ id: 'cook', emoji: '🍳', label: `Make ${n(P(S, partner))} breakfast`, sub: 'Small thing. Big thing.' });
    if (partner && !S.casa && mutual(S, id, partner) > 50) opts.push({ id: 'kiss', emoji: '💋', label: `Kiss ${n(P(S, partner))}`, sub: mutual(S, id, partner) > 65 ? 'The moment is right' : 'Might be early' });
    if (S.secrets.some((s) => s.kind === 'flirt' && S.inVilla.includes(s.who) && s.partner && S.inVilla.includes(s.partner) && s.who !== id)) opts.push({ id: 'stir', emoji: '🥄', label: 'Stir the pot', sub: 'Tell someone what their partner has been up to' });
    opts.push({ id: 'laylow', emoji: '🧘', label: 'Lay low by the pool', sub: 'No drama today. Tension cools.' });
    if (!S.casa) opts.push({ id: 'gym', emoji: '🏋️', label: 'Gym session', sub: 'Looks up a touch. Someone watches.' });
    return opts;
  },
  /** Perform a non-chat action, or a whole chat with one style (used by QA). */
  perform(S, actionId, target = null, style = null) {
    const id = S.playerId;
    if (!S.player || S.player.energy <= 0) return { text: 'No moves left today.', chips: [] };
    if (actionId === 'chat') {
      const t = target || reachable(S)[0];
      if (!t) return { text: 'Nobody to talk to.', chips: [] };
      const ctx = startChat(S, t);
      const r = replyChat(S, ctx, style || ctx.choices[0].style);
      S.player.energy--;
      return { text: r.reaction, chips: r.chips };
    }
    S.player.energy--;
    return withRng(S, (rng) => {
      const partner = partnerOf(S, id);
      const meP = me(S);
      switch (actionId) {
        case 'beachhut': {
          const choice = target || 'grateful';
          if (choice === 'gush' && partner) { popBump(S, id, 4); bump(S, id, partner, { spark: 3, trust: 3 }); T(S, id).loyal++; S.player.loyal++; scene(S, { where: 'beachhut', kind: 'confession', who: [id, partner], text: `You, in the Beach Hut, about ${n(P(S, partner))}: "${pk(rng, ['I didn\'t expect this. I keep waiting for the catch and there isn\'t one.', 'Every morning I look for them first. That\'s all I\'ll say. That\'s everything.', 'They remembered how I take my coffee. Nobody remembers.'])}"` }); caption(S, captions.sweet(rng, meP.gender === 'f' ? meP : P(S, partner), meP.gender === 'f' ? P(S, partner) : meP), 'soft'); return { text: 'You go soft on camera. The public goes softer.', chips: [{ label: '📈 Public +4', tone: 'good' }, { label: '🤝 Trust +3', tone: 'good' }] }; }
          if (choice === 'doubt' && partner) { const up = rng.chance(0.55); popBump(S, id, up ? 3 : -3); S.secrets.push({ day: S.day, who: id, about: partner, kind: 'doubt' }); scene(S, { where: 'beachhut', kind: 'confession', who: [id], text: `You, in the Beach Hut: "${pk(rng, [`I like ${n(P(S, partner))}. I just don't know if it's enough. Is that awful?`, `Something's missing and I can't tell if it's ${pr(P(S, partner)).them} or the villa.`])}"` }); return { text: up ? 'Honest. The public respects it. Your partner would not.' : 'Honest. The public thinks you are being ungrateful.', chips: [{ label: `📉 Public ${up ? '+3' : '−3'}`, tone: up ? 'good' : 'bad' }, { label: '🎬 Saved for Movie Night', tone: 'bad' }] }; }
          if (choice === 'shade') { const pool = S.inVilla.filter((x) => x !== id && x !== partner); const t = pool.length ? pk(rng, pool) : null; if (!t) return { text: 'Nobody to shade.', chips: [] }; const swing = rng.chance(0.45); popBump(S, id, swing ? 4 : -4); bump(S, t, id, { tension: 12, trust: -6 }); S.secrets.push({ day: S.day, who: id, about: t, kind: 'shade' }); scene(S, { where: 'beachhut', kind: 'confession', who: [id, t], text: `You, in the Beach Hut, about ${n(P(S, t))}: "${pk(rng, ['Lovely. Lovely is a word you use about a hotel.', 'They\'re playing a game. I\'m just saying it out loud.', 'A bit much. In a fun way. Mostly.'])}"` }); return { text: swing ? `The public laughs. ${n(P(S, t))} will not.` : `The public thinks that was mean. ${n(P(S, t))} agrees.`, chips: [{ label: `${swing ? '📈' : '📉'} Public ${swing ? '+4' : '−4'}`, tone: swing ? 'good' : 'bad' }, { label: `🌡️ ${n(P(S, t))} tension +12`, tone: 'bad' }] }; }
          popBump(S, id, 3); for (const x of sameGender(S, id)) bump(S, x, id, { trust: 3 }); scene(S, { where: 'beachhut', kind: 'confession', who: [id], text: `You, in the Beach Hut, about the ${meP.gender === 'f' ? 'girls' : 'boys'}: "${pk(rng, ['Whatever happens, I\'m leaving with them. That\'s the win.', 'The terrace debriefs are the best part of my day. Don\'t tell the couples.'])}"` }); caption(S, meP.gender === 'f' ? captions.girls(rng) : captions.boys(rng), 'soft'); return { text: 'You talk about the friendships. Wholesome. The edit loves it.', chips: [{ label: '📈 Public +3', tone: 'good' }, { label: '🤝 Trust with everyone +3', tone: 'good' }] };
        }
        case 'cook': { if (!partner) return { text: 'Nobody to cook for.', chips: [] }; bumpBoth(S, id, partner, { trust: 6, spark: 4, tension: -8 }); popBump(S, id, 1); scene(S, { where: 'kitchen', kind: 'chat', who: [id, partner], text: `You make ${n(P(S, partner))} breakfast. ${pk(rng, ['Eggs, slightly burnt. Eaten anyway, loudly.', 'Pancakes shaped like a heart, if you squint. They squint.', 'A smoothie with too much spinach. "Perfect," they lie.'])}`, fx: null }); return { text: `${n(P(S, partner))} eats every bite and tells the whole villa.`, chips: [{ label: '🤝 Trust +6', tone: 'good' }, { label: '💗 Spark +4', tone: 'good' }, { label: '🌡️ Tension −8', tone: 'good' }] }; }
        case 'kiss': { if (!partner) return { text: 'No partner to kiss.', chips: [] }; if (mutual(S, id, partner) > 62 || rng.chance(0.5)) { const r = kiss(S, partner); return r; } bump(S, partner, id, { spark: -3 }); scene(S, { where: 'terrace', kind: 'flirt', who: [id, partner], text: `You go in for the kiss. ${n(P(S, partner))} turns it into a hug. A long one. Not the point.`, fx: null }); return { text: 'Too soon. It becomes a hug. The girls on the balcony wince for you.', chips: [{ label: '💗 Spark −3', tone: 'bad' }, { label: '😬 Awkward', tone: 'bad' }] }; }
        case 'stir': {
          const s = S.secrets.slice().reverse().find((x) => x.kind === 'flirt' && S.inVilla.includes(x.who) && x.partner && S.inVilla.includes(x.partner) && x.who !== id);
          if (!s) return { text: 'Nothing to stir.', chips: [] };
          bump(S, s.partner, s.who, { tension: 18, trust: -10 }); S.beef.push({ a: s.partner, b: s.who });
          const found = rng.chance(0.4);
          if (found) { bump(S, s.who, id, { tension: 20, trust: -12 }); popBump(S, id, -3); }
          else popBump(S, id, 1);
          bump(S, s.partner, id, { trust: 6 });
          scene(S, { where: 'terrace', kind: 'gossip', who: [id, s.partner, s.who], text: `You tell ${n(P(S, s.partner))} exactly what ${n(P(S, s.who))} said to ${n(P(S, s.about))}. Word for word. ${found ? `${n(P(S, s.who))} finds out it was you within the hour.` : 'Nobody knows where it came from. Yet.'}`, fx: null });
          return { text: `${n(P(S, s.partner))} goes very quiet, then very loud. ${found ? `${n(P(S, s.who))} knows it was you.` : 'Your name stays out of it. For now.'}`, chips: [{ label: `🌡️ ${n(P(S, s.partner))} → ${n(P(S, s.who))} tension +18`, tone: 'spicy' }, { label: `🤝 ${n(P(S, s.partner))} trusts you +6`, tone: 'good' }, ...(found ? [{ label: `😤 ${n(P(S, s.who))} knows`, tone: 'bad' }, { label: '📉 Public −3', tone: 'bad' }] : [])] };
        }
        case 'gym': { meP.attrs.looks = clamp(meP.attrs.looks + 1, 1, 99); const watcher = opposite(S, id).filter((x) => x !== partner); const w = watcher.length ? pk(rng, watcher) : null; if (w) bump(S, w, id, { spark: 4 }); scene(S, { where: 'gym', kind: 'flirt', who: w ? [id, w] : [id], text: `Gym session. ${w ? `${n(P(S, w))} does three sets of looking over.` : 'Nobody is watching. You tell yourself that is fine.'}`, fx: null }); return { text: w ? `${n(P(S, w))} watched the whole session and pretended not to.` : 'A good session. Quietly.', chips: [{ label: '✨ Looks +1', tone: 'good' }, ...(w ? [{ label: `💗 ${n(P(S, w))} spark +4`, tone: 'good' }] : [])] }; }
        default: { for (const x of S.inVilla) if (x !== id) bump(S, x, id, { tension: -6 }); popBump(S, id, 1); scene(S, { where: 'pool', kind: 'narrator', who: [id], text: 'You lie by the pool with your sunglasses on and let the villa happen to other people.', fx: null }); return { text: 'A quiet day. Tension cools everywhere. The public appreciates a calm one.', chips: [{ label: '🌡️ Tension −6 with everyone', tone: 'good' }, { label: '📈 Public +1', tone: 'good' }] }; }
      }
    });
  },
};
export const situationOf = situation;
