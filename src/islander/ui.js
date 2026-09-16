// Islander mode: build yourself, walk into the villa, talk your way to the final.
import { makeRng } from '../villa/rng.js';
import { makeBoard, makeIslander, ARCHETYPES, ARCH_KEYS, JOBS, HOMETOWNS, F_HAIR, M_HAIR, SKIN, HAIR_COLORS, OUTFITS, BGS, archLabel, archEmoji, ATTR_LABEL, topAttrs, tier, pronoun } from '../villa/cast.js';
import { createSeason, run, answer, dayTitle, dayPreview, playerScore, awardsList } from '../villa/engine.js';
import { P, partnerOf, coupleOf, pop, popLabel, strength, strengthLabel, mutual, rel, SEASON_DAYS, PRIZE } from '../villa/model.js';
import { playerAct, startChat, replyChat, kiss } from './actions.js';
import * as U from '../ui.js';

const KEY = 'villa-islander-v1';
let H = null, S = null, form = null;
const app = () => H.app;
const save = () => { try { if (S) localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* ignore */ } };
export function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s && s.v === 1 && s.cast && s.playerId ? s : null; } catch { return null; } }
export const hasSave = () => !!load();
export function init(host) { H = host; }
const me = () => P(S, S.playerId);
export function start() {
  S = load();
  if (S && S.phase !== 'done') { if (!S.ui) S.ui = { shown: 0 }; return loop(); }
  S = null; renderCreate();
}
export function resume() { S = load(); if (!S) return start(); if (!S.ui) S.ui = { shown: 0 }; if (S.phase === 'done') return renderEnd(); loop(); }
export function resumeCard() {
  const s = load(); if (!s) return '';
  const p = s.cast[s.playerId]; if (!p) return '';
  const done = s.phase === 'done';
  const inV = s.inVilla.includes(s.playerId);
  const sub = done ? `${inV && s.winner && (s.winner.a === s.playerId || s.winner.b === s.playerId) ? 'Winner 🏆' : inV ? 'Made the final' : `Dumped on day ${(s.dumped.find((d) => d.id === s.playerId) || {}).day || s.day}`} · ${playerScore(s)} pts` : `Day ${s.day} · ${partnerOf(s, s.playerId) ? `coupled with ${U.esc(s.cast[partnerOf(s, s.playerId)].name)}` : 'single'} · ${pop(s, s.playerId)} pop`;
  return `<button class="resume-card" id="resume-islander">${U.face(p, 'rs', 48)}<div class="rs-txt"><div class="rs-name">${done ? 'Your Aftersun card' : 'Back to the villa'} · ${U.esc(p.name)}</div><div class="rs-sub">${sub}</div></div><div class="mode-go">${done ? 'VIEW ›' : 'RESUME ›'}</div></button>`;
}

// ---------- create ----------
function newForm() {
  const rng = makeRng();
  const gender = rng.pick(['f', 'm']);
  return { name: '', gender, age: rng.int(22, 29), job: rng.pick(JOBS), home: rng.pick(HOMETOWNS), arch: null, entry: 'og', lookSeed: rng.int(1, 1e9) };
}
function previewIslander() {
  const rng = makeRng(`look-${form.lookSeed}-${form.gender}`);
  const p = makeIslander(rng, form.gender, new Set(), { arch: form.arch || 'sweetheart', id: 'me', age: form.age, job: form.job, home: form.home, player: true });
  p.name = form.name.trim() || (form.gender === 'f' ? 'You' : 'You'); p.last = '';
  return p;
}
function renderCreate() {
  if (!form) form = newForm();
  H.an.screen('create');
  const p = previewIslander();
  const A = form.arch ? ARCHETYPES[form.arch] : null;
  app().innerHTML = `<section class="screen create">
    <div class="back-bar"><button class="ghost-btn slim" id="back-home">‹ Home</button><span>Walk into the villa</span></div>
    <div class="cr-hero">${U.face(p, 'big', 120)}<button class="ghost-btn slim" id="cr-look">🎲 New look</button></div>
    <div class="cr-card">
      <label class="lbl">Your name</label>
      <input id="cr-name" class="inp" maxlength="18" placeholder="First name" value="${U.esc(form.name)}" autocomplete="off" />
      <div class="cr-row">
        <div class="seg"><button class="seg-btn ${form.gender === 'f' ? 'on' : ''}" id="g-f">👩 Girl</button><button class="seg-btn ${form.gender === 'm' ? 'on' : ''}" id="g-m">👨 Boy</button></div>
        <div class="age"><button class="mini" id="age-dn">−</button><span>${form.age}</span><button class="mini" id="age-up">+</button></div>
      </div>
      <div class="cr-row two"><div class="fld"><label class="lbl">Job</label><button class="pick-btn" id="cr-job">${U.esc(form.job)} <i>🎲</i></button></div><div class="fld"><label class="lbl">Hometown</label><button class="pick-btn" id="cr-home">${U.esc(form.home)} <i>🎲</i></button></div></div>
      <label class="lbl">Your energy</label>
      <div class="arch-grid">${ARCH_KEYS.map((k) => `<button class="arch-opt ${form.arch === k ? 'on' : ''}" data-id="${k}"><span class="ao-emoji">${ARCHETYPES[k].emoji}</span><span class="ao-label">${ARCHETYPES[k].label.replace('The ', '')}</span></button>`).join('')}</div>
      ${A ? `<div class="arch-desc"><b>${A.label}.</b> ${U.esc(A.tagline)} <span class="muted">Your strengths: ${topAttrs(p, 3).map((k) => `${ATTR_LABEL[k]} <b class="${tier(p.attrs[k])}">${p.attrs[k]}</b>`).join(' · ')}</span></div>` : '<div class="arch-desc muted">Pick the energy you are bringing in. It sets your hidden stats and which chat lines land.</div>'}
      <label class="lbl">How you enter</label>
      <div class="entry-row"><button class="entry-opt ${form.entry === 'og' ? 'on' : ''}" id="en-og"><b>☀️ Day one</b><span>Line up on night one and pick first. Safer start.</span></button><button class="entry-opt ${form.entry === 'bombshell' ? 'on' : ''}" id="en-bomb"><b>💣 Bombshell</b><span>Walk in on night one to a full villa. Get picked by day 4 or go home. Bonus points.</span></button></div>
      <button class="cta wide" id="cr-go" ${form.name.trim().length < 2 || !form.arch ? 'disabled' : ''}>${!form.arch ? 'Pick your energy' : form.name.trim().length < 2 ? 'Type your name' : 'Pack your bags 🧳'}</button>
    </div>
  </section>`;
  U.on('back-home', () => H.home());
  const re = () => { const y = window.scrollY; renderCreate(); window.scrollTo({ top: y }); };
  const inp = document.getElementById('cr-name');
  inp.addEventListener('input', () => { form.name = inp.value; const go = document.getElementById('cr-go'); const ok = form.name.trim().length >= 2 && form.arch; go.disabled = !ok; go.textContent = !form.arch ? 'Pick your energy' : form.name.trim().length < 2 ? 'Type your name' : 'Pack your bags 🧳'; });
  U.on('cr-look', () => { form.lookSeed = Math.floor(Math.random() * 1e9); U.buzz(8); re(); });
  U.on('g-f', () => { form.gender = 'f'; re(); }); U.on('g-m', () => { form.gender = 'm'; re(); });
  U.on('age-dn', () => { form.age = Math.max(21, form.age - 1); re(); }); U.on('age-up', () => { form.age = Math.min(34, form.age + 1); re(); });
  U.on('cr-job', () => { form.job = JOBS[Math.floor(Math.random() * JOBS.length)]; re(); }); U.on('cr-home', () => { form.home = HOMETOWNS[Math.floor(Math.random() * HOMETOWNS.length)]; re(); });
  U.onAll('.arch-opt', (el) => { form.arch = el.dataset.id; U.buzz(10); re(); });
  U.on('en-og', () => { form.entry = 'og'; re(); }); U.on('en-bomb', () => { form.entry = 'bombshell'; re(); });
  U.on('cr-go', () => {
    const rng = makeRng(`${Date.now()}-${form.name}`);
    const board = makeBoard(rng, 5, 5);
    const used = new Set([...board.women, ...board.men].map((x) => x.name));
    const player = previewIslander();
    player.name = form.name.trim().slice(0, 18); player.last = '';
    if (form.entry === 'bombshell') { const g = form.gender; if (g === 'f') board.women.pop(); else board.men.pop(); if (g === 'f') board.women.push(makeIslander(rng, 'f', used)); else board.men.push(makeIslander(rng, 'm', used)); }
    S = createSeason({ seed: `${Date.now()}-${form.name}`, mode: 'islander', women: board.women, men: board.men, player, playerEntry: form.entry });
    S.ui = { shown: 0, entry: form.entry };
    save();
    H.an.track('season_start', { mode: 'islander', entry: form.entry, arch: form.arch });
    U.buzz([20, 40, 20]);
    renderMeet();
  });
}
function renderMeet() {
  H.an.screen('meet');
  const ids = Object.keys(S.cast).filter((id) => id !== S.playerId && !S.cast[id].casa);
  const mine = me();
  app().innerHTML = `<section class="screen meet">
    <div class="dh-top"><span class="dh-day">Meet the islanders</span></div>
    <h2 class="dh-title">${S.ui.entry === 'bombshell' ? 'They don’t know you’re coming.' : 'Your summer starts now.'}</h2>
    <p class="dh-sub">${S.ui.entry === 'bombshell' ? 'Ten islanders couple up tonight. You walk in after. You have until the first recoupling on day 4 to get picked.' : 'Ten of you. One villa. Tonight the girls line up and the boys step forward. Go find your person.'}</p>
    <div class="vb-title">The ${mine.gender === 'f' ? 'boys' : 'girls'}</div>
    <div class="cast-list">${ids.filter((id) => S.cast[id].gender !== mine.gender).map((id) => U.islanderCard(S, id, { bio: true, sub: `<span class="muted">Into you: ${sparkWord(rel(S, id, S.playerId).spark)}</span>` })).join('')}</div>
    <div class="vb-title">The ${mine.gender === 'f' ? 'girls' : 'boys'}</div>
    <div class="cast-list">${ids.filter((id) => S.cast[id].gender === mine.gender).map((id) => U.islanderCard(S, id, { attrs: false })).join('')}</div>
    <button class="cta wide" id="meet-go">Enter the villa 🏝️</button>
  </section>`;
  U.on('meet-go', () => loop());
  U.top();
}
const sparkWord = (v) => (v >= 70 ? 'very 💗' : v >= 55 ? 'warm' : v >= 40 ? 'undecided' : 'not yet');

// ---------- the loop ----------
function topBar() {
  return `<div class="ep-top"><button class="ghost-btn slim" id="ep-villa">🏝️ Villa</button><span class="ep-day">${U.dayLabel(S)}</span><button class="ghost-btn slim" id="ep-quit" title="Home">🏠</button></div>`;
}
function bindTop() { U.on('ep-villa', () => villaSheet()); U.on('ep-quit', () => { save(); H.home(); }); }
function loop() {
  const out = run(S);
  save();
  const shown = (S.ui && S.ui.shown) || 0;
  if (out.pending) {
    const scenes = S.episode ? S.episode.scenes : [];
    const then = () => { S.ui.shown = scenes.length; save(); if (out.pending.type === 'actions') renderDay(); else renderDecision(out.pending); };
    if (scenes.length > shown) { U.episodeScreen({ app: app(), S, scenes, from: shown, header: topBar() + U.dayHeader(S, shown ? { sub: '' } : {}), onDone: then, nextLabel: out.pending.type === 'actions' ? 'Your move ›' : 'Decide ›' }); bindTop(); }
    else then();
    return;
  }
  if (out.episode) {
    const ep = out.episode, done = S.phase === 'done';
    U.episodeScreen({ app: app(), S, scenes: ep.scenes, from: shown, header: topBar() + U.dayHeader(S, shown ? { sub: '' } : {}), afterHTML: `${statusHTML()}${U.moversHTML(S, ep)}${U.captionsHTML(ep, S)}${done ? '' : `<div class="next-up"><div class="feed-title">📺 Tomorrow</div><b>Day ${S.day + 1}: ${U.esc(dayTitle(S.day + 1))}</b><p>${U.esc(dayPreview(S.day + 1))}</p></div>`}`, onDone: () => { S.ui.shown = 0; save(); if (done) renderEnd(); else loop(); }, nextLabel: done ? 'See how it ended ›' : `Day ${S.day + 1} ›` });
    bindTop();
    H.an.track('episode_done', { mode: 'islander', day: S.day });
    return;
  }
  renderEnd();
}
function renderDecision(pending) {
  H.an.screen('decision');
  U.decisionScreen({ app: app(), S, pending, header: topBar(), onAnswer: (choice) => { H.an.track('decision', { mode: 'islander', type: pending.type, day: S.day }); answer(S, choice); save(); loop(); } });
  bindTop();
}
function statusHTML() {
  const id = S.playerId; if (!S.inVilla.includes(id)) return '';
  const partner = partnerOf(S, id), c = coupleOf(S, id);
  const pv = pop(S, id);
  return `<div class="status">
    <div class="st-row">${U.face(me(), 'sm', 48)}<div class="st-body"><div class="st-name">${U.esc(me().name)} ${me().bombshell ? U.pill('💣', 'bomb') : ''}</div><div class="st-sub">${partner ? `Coupled with <b>${U.esc(P(S, partner).name)}</b> · ${strengthLabel(strength(S, c))}` : '<b>Single</b> · vulnerable at the next dumping'}</div></div></div>
    ${partner ? U.meter(strength(S, c), strength(S, c) >= 65 ? 'good' : strength(S, c) >= 45 ? 'mid' : 'bad') : ''}
    <div class="st-pop"><span>📺 The public</span>${U.meter(pv, pv >= 65 ? 'good' : pv < 40 ? 'bad' : 'mid')}<b>${pv} · ${popLabel(pv)}</b></div>
  </div>`;
}
function villaSheet() {
  const ov = document.createElement('div');
  ov.className = 'sheet-wrap';
  const id = S.playerId;
  const others = S.inVilla.filter((x) => x !== id);
  ov.innerHTML = `<div class="sheet"><div class="sheet-head"><b>🏝️ The Villa · ${U.dayLabel(S)}</b><button class="ghost-btn slim" id="sheet-close">Close</button></div>
    ${statusHTML()}
    <div class="vb-title">Where you stand</div>
    <div class="rel-list">${others.map((x) => { const r = rel(S, x, id); const same = P(S, x).gender === me().gender; return `<div class="rel-row">${U.face(P(S, x), 'xs', 36)}<div class="rel-body"><div class="rel-name">${U.esc(P(S, x).name)} <span class="muted">${partnerOf(S, x) ? `· with ${U.esc(P(S, partnerOf(S, x)).name)}` : '· single'}</span></div><div class="rel-bars">${same ? `<span>🤝 ${r.trust}</span>` : `<span>💗 ${r.spark}</span><span>🤝 ${r.trust}</span>`}<span class="${r.tension > 30 ? 'bad' : ''}">🌡️ ${r.tension}</span></div></div></div>`; }).join('')}</div>
    ${U.villaBoard(S)}
  </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.querySelector('#sheet-close').addEventListener('click', close);
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
}

// ---------- your move ----------
let dayLog = [];
function renderDay() {
  H.an.screen('day');
  const opts = playerAct.options(S);
  const energy = S.player.energy;
  if (!dayLog.length || dayLog[0].day !== S.day) dayLog = [{ day: S.day }];
  app().innerHTML = `<section class="screen day">
    ${topBar()}
    <div class="day-head"><div class="dh-top"><span class="dh-day">Your move</span><span class="dh-ep">${energy} of 2 left</span></div><h2 class="dh-title">${U.esc(dayTitle(S.day))}</h2><p class="dh-sub">${U.esc(dayPreview(S.day))}</p></div>
    ${statusHTML()}
    ${dayLog.slice(1).map((l) => `<div class="act-result done"><div class="ar-text">${U.esc(l.text)}</div><div class="chips">${(l.chips || []).map((c) => `<span class="chip ${c.tone}">${U.esc(c.label)}</span>`).join('')}</div></div>`).join('')}
    ${energy > 0 ? `<div class="acts">${opts.map((o) => `<button class="act-btn" data-id="${o.id}"><span class="act-emoji">${o.emoji}</span><span class="act-body"><b>${U.esc(o.label)}</b><span>${U.esc(o.sub)}</span></span></button>`).join('')}</div>` : ''}
    <button class="cta wide ${energy > 0 ? 'alt' : ''}" id="day-go">${energy > 0 ? 'Skip the rest and let the day play out ▶' : 'Let the day play out ▶'}</button>
  </section>`;
  bindTop();
  U.on('day-go', () => { dayLog = []; answer(S, { done: true }); save(); loop(); });
  U.onAll('.act-btn', (el) => {
    const o = opts.find((x) => x.id === el.dataset.id);
    if (!o) return;
    U.buzz(8);
    if (o.targets) return renderTargets(o);
    if (o.choices) return renderChoices(o);
    const r = playerAct.perform(S, o.id);
    dayLog.push({ text: r.text, chips: r.chips }); save();
    renderResult(r);
  });
  U.top();
}
function renderTargets(o) {
  app().innerHTML = `<section class="screen day">${topBar()}
    <div class="day-head"><div class="dh-top"><span class="dh-day">${o.emoji} ${U.esc(o.label)}</span></div><h2 class="dh-title">Who?</h2></div>
    <div class="opts">${o.targets.map((t) => { const p = P(S, t); const partner = partnerOf(S, t); const same = p.gender === me().gender; const r = rel(S, t, S.playerId); return `<button class="opt isl-opt tgt-btn" data-id="${t}">${U.islanderCard(S, t, { attrs: false, pick: true, sub: `<span class="muted">${partner === S.playerId ? 'your partner · ' : partner ? `with ${U.esc(P(S, partner).name)} · ` : p.casa ? 'Casa bombshell · ' : 'single · '}${same ? `trust ${r.trust}` : `into you: ${sparkWord(r.spark)}`}</span>` })}</button>`; }).join('')}</div>
    <button class="ghost-btn wide" id="tg-back">‹ Back</button></section>`;
  bindTop();
  U.on('tg-back', renderDay);
  U.onAll('.tgt-btn', (el) => { U.buzz(8); renderChat(startChat(S, el.dataset.id)); });
  U.top();
}
function renderChoices(o) {
  app().innerHTML = `<section class="screen day">${topBar()}
    <div class="day-head"><div class="dh-top"><span class="dh-day">${o.emoji} ${U.esc(o.label)}</span></div><h2 class="dh-title">What do you say to the camera?</h2></div>
    <div class="opts">${o.choices.map((c) => `<button class="opt txt-opt tgt-btn" data-id="${c.id}"><span class="opt-label">${U.esc(c.label)}</span><span class="opt-sub">${U.esc(c.sub)}</span></button>`).join('')}</div>
    <button class="ghost-btn wide" id="tg-back">‹ Back</button></section>`;
  bindTop();
  U.on('tg-back', renderDay);
  U.onAll('.tgt-btn', (el) => { const r = playerAct.perform(S, o.id, el.dataset.id); dayLog.push({ text: r.text, chips: r.chips }); save(); renderResult(r); });
  U.top();
}
function renderResult(r) {
  app().innerHTML = `<section class="screen day">${topBar()}
    <div class="act-result big"><div class="ar-text">${U.esc(r.text)}</div><div class="chips">${(r.chips || []).map((c) => `<span class="chip ${c.tone}">${U.esc(c.label)}</span>`).join('')}</div></div>
    <button class="cta wide" id="chat-done">${S.player.energy > 0 ? 'Next move ›' : 'Let the day play out ▶'}</button></section>`;
  bindTop();
  U.on('chat-done', () => { if (S.player.energy > 0) renderDay(); else { dayLog = []; answer(S, { done: true }); save(); loop(); } });
  U.buzz(12);
  U.top();
}
function renderChat(ctx, history = []) {
  const t = P(S, ctx.target);
  app().innerHTML = `<section class="screen chat">${topBar()}
    <div class="chat-head">${U.face(t, 'sm', 56)}<div><div class="st-name">${U.esc(t.name)}</div><div class="muted">${archEmoji(t)} ${archLabel(t)} · ${partnerOf(S, ctx.target) === S.playerId ? 'your partner' : partnerOf(S, ctx.target) ? `coupled with ${U.esc(P(S, partnerOf(S, ctx.target)).name)}` : t.casa ? 'Casa Amor' : 'single'}</div></div></div>
    <div class="chat-log">${history.map((h) => `<div class="bubble them">${U.esc(h.opener)}</div><div class="bubble you">${U.esc(h.line)}</div><div class="bubble them">${U.esc(h.reaction)}</div><div class="chips center">${h.chips.map((c) => `<span class="chip ${c.tone}">${U.esc(c.label)}</span>`).join('')}</div>`).join('')}
      <div class="bubble them in">${U.esc(ctx.opener)}</div></div>
    <div class="lines">${ctx.choices.map((c) => `<button class="line-btn" data-style="${c.style}"><span class="line-style">${U.esc(c.label)}</span><span class="line-text">${U.esc(c.line)}</span></button>`).join('')}</div>
  </section>`;
  bindTop();
  U.onAll('.line-btn', (el) => {
    const style = el.dataset.style;
    const choice = ctx.choices.find((c) => c.style === style);
    const r = replyChat(S, ctx, style);
    save();
    U.buzz(r.tier === 'great' ? [20, 30, 40] : r.tier === 'bad' ? 40 : 12);
    const h = [...history, { opener: ctx.opener, line: choice.line, reaction: r.reaction, chips: r.chips }];
    if (r.next) return renderChat(r.next, h);
    renderChatEnd(ctx, h, r);
  });
  U.top();
}
function renderChatEnd(ctx, history, r) {
  const t = P(S, ctx.target);
  const finish = () => { S.player.energy--; dayLog.push({ text: `Chat with ${t.name}: ${r.tier === 'great' ? 'went great' : r.tier === 'good' ? 'went well' : r.tier === 'meh' ? 'was fine' : 'did not land'}.`, chips: r.chips }); save(); if (S.player.energy > 0) renderDay(); else { dayLog = []; answer(S, { done: true }); save(); loop(); } };
  app().innerHTML = `<section class="screen chat">${topBar()}
    <div class="chat-head">${U.face(t, 'sm', 56)}<div><div class="st-name">${U.esc(t.name)}</div><div class="muted">${archEmoji(t)} ${archLabel(t)}</div></div></div>
    <div class="chat-log">${history.map((h) => `<div class="bubble them">${U.esc(h.opener)}</div><div class="bubble you">${U.esc(h.line)}</div><div class="bubble them in">${U.esc(h.reaction)}</div><div class="chips center">${h.chips.map((c) => `<span class="chip ${c.tone}">${U.esc(c.label)}</span>`).join('')}</div>`).join('')}</div>
    <div class="verdict ${r.tier}">${{ great: '💗 That landed.', good: '🙂 Good chat.', meh: '😐 Fine. Just fine.', bad: '😬 That did not land.' }[r.tier]}</div>
    ${r.kissable ? `<button class="cta wide kiss" id="chat-kiss">Go for the kiss 💋</button>` : ''}
    <button class="cta wide ${r.kissable ? 'alt' : ''}" id="chat-done">${r.kissable ? 'Leave it there' : 'Walk away'} ›</button>
  </section>`;
  bindTop();
  U.on('chat-done', finish);
  U.on('chat-kiss', () => {
    const k = kiss(S, ctx.target); save();
    U.buzz([30, 50, 30, 50]);
    app().innerHTML = `<section class="screen chat">${topBar()}
      <div class="kiss-card"><div class="kiss-emoji">💋</div><div class="ar-text">${U.esc(k.text)}</div><div class="chips center">${k.chips.map((c) => `<span class="chip ${c.tone}">${U.esc(c.label)}</span>`).join('')}</div></div>
      <button class="cta wide" id="chat-done">Continue ›</button></section>`;
    bindTop();
    U.on('chat-done', finish);
  });
  U.top();
}

// ---------- the end ----------
function renderEnd() {
  H.an.screen('aftersun');
  const id = S.playerId, p = me();
  const d = S.dumped.find((x) => x.id === id);
  const won = S.winner && (S.winner.a === id || S.winner.b === id);
  const finalIdx = S.final ? S.final.order.findIndex((o) => o.a === id || o.b === id) : -1;
  const result = won ? 'winner' : finalIdx === 1 ? 'runner-up' : finalIdx >= 0 ? 'finalist' : 'dumped';
  const score = playerScore(S);
  const days = (d ? d.day : S.day) - (p.arrived || 1) + 1;
  const partner = partnerOf(S, id) || (S.history.slice().reverse().find((m) => m.type === 'recoupling' || m.type === 'firstCoupling') || {}).couples?.find((c) => c.includes(id))?.find((x) => x !== id) || null;
  const t = S.tally[id] || {};
  const env = S.final && S.final.envelope;
  const envText = !won || !env ? '' : env.result === 'split' ? `You split the $${PRIZE.toLocaleString()} 💞` : env.result === 'bothSteal' ? 'You both stole. Nobody won a dollar. Iconic. 😱' : env.result === `steal:${id}` ? `You STOLE all $${PRIZE.toLocaleString()}. The villain edit is yours. 😈` : `${U.esc(P(S, env.result.split(':')[1]).name)} stole the lot. You left with grace and zero dollars. 🥲`;
  const bits = S.history.filter((m) => (m.ids || []).includes(id)).slice(-6);
  const bitText = (m) => ({ kiss: `💋 Kissed ${U.esc(nameOfOther(m.ids))}`, steal: `😈 ${m.ids[0] === id ? `Stole ${U.esc(P(S, m.ids[1]).name)}` : m.ids[1] === id ? `Got stolen by ${U.esc(P(S, m.ids[0]).name)}` : `Lost ${U.esc(P(S, m.ids[1]).name)} to ${U.esc(P(S, m.ids[0]).name)}`}`, betrayed: `💔 ${m.ids[0] === id ? 'Stayed loyal at Casa. They did not.' : 'Twisted at Casa Amor.'}`, dumped: '🧳 Dumped from the island', hideaway: '🔑 A night in the Hideaway', date: `🥂 ${U.esc(m.kind || 'A date')}`, exclusive: '🔒 Made it exclusive', spark: '✨ A new spark', bombshell: '💣 Walked in as a bombshell', winner: '🏆 Won the whole thing' }[m.type] || '');
  if (!S.ui.counted) {
    S.ui.counted = true; save();
    H.addStats({ islanderRuns: 1, finals: result !== 'dumped' ? 1 : 0, wins: won ? 1 : 0, bestScore: score, bestDays: days });
    H.an.track('season_done', { mode: 'islander', result, days, score });
    H.postRun({ name: p.name, gender: p.gender, arch: p.arch, entry: S.ui.entry || 'og', days, result, score, pop: pop(S, id), kisses: t.kisses || 0, look: p.look, code: S.code }).then((r) => { if (r && r.ok && r.rank) U.flash(`Posted to the Hall of Islanders · #${r.rank}`); }).catch(() => {});
  }
  app().innerHTML = `<section class="screen aftersun" id="aftersun">
    <div class="back-bar"><button class="ghost-btn slim" id="back-home">‹ Home</button><span>Aftersun</span></div>
    <div class="sc-card ${result}">
      <div class="sc-kicker">${result === 'winner' ? '🏆 WINNER · SEASON ' : result === 'dumped' ? '🧳 DUMPED · DAY ' + (d ? d.day : S.day) + ' · SEASON ' : '🌅 FINALIST · SEASON '}${U.esc(S.code)}</div>
      <div class="winners">${U.face(p, 'win', 104)}${partner && S.cast[partner] && result !== 'dumped' ? `<span class="win-heart">💗</span>${U.face(P(S, partner), 'win', 104)}` : ''}</div>
      <h2 class="win-names">${U.esc(p.name)}${partner && S.cast[partner] && result !== 'dumped' ? ` & ${U.esc(P(S, partner).name)}` : ''}</h2>
      <div class="win-sub">${result === 'winner' ? `Winners with ${S.winner.share}% of the vote` : result === 'runner-up' ? 'Runners-up' : result === 'finalist' ? 'Made the final' : `${days} day${days === 1 ? '' : 's'} in the villa · ${d && d.how === 'recoupling' ? 'nobody stepped forward' : d && d.how === 'islanders' ? 'the islanders voted' : 'the public voted'}`}</div>
      ${envText ? `<div class="win-env">${envText}</div>` : ''}
      <div class="score-big"><b>${score}</b><span>points</span></div>
      <div class="season-stats">
        <div class="ss"><b>${days}</b><span>days</span></div><div class="ss"><b>${pop(S, id)}</b><span>public</span></div><div class="ss"><b>${t.kisses || 0}</b><span>kisses</span></div>
        <div class="ss"><b>${t.picked || 0}</b><span>times picked</span></div><div class="ss"><b>${S.player.chats}</b><span>chats</span></div><div class="ss"><b>${t.stuck ? 'Stuck' : t.twists ? 'Twisted' : '–'}</b><span>Casa Amor</span></div>
      </div>
      ${bits.length ? `<div class="bits"><div class="feed-title">✨ Best bits</div>${bits.map((m) => `<div class="bit"><span class="bit-day">Day ${m.day}</span>${bitText(m)}</div>`).join('')}</div>` : ''}
      <div class="sc-foot">The Villa · ${archEmoji(p)} ${archLabel(p)} · ${S.ui.entry === 'bombshell' ? 'Bombshell entry' : 'Day one'}</div>
    </div>
    ${S.winner && !won ? `<div class="also"><b>Winners:</b> ${U.esc(P(S, S.winner.a).name)} & ${U.esc(P(S, S.winner.b).name)}</div>` : ''}
    <div class="btn-row"><button class="cta" id="af-share">📣 Share</button><button class="cta alt" id="af-new">New islander</button></div>
    <button class="ghost-btn wide" id="af-home">Home</button>
  </section>`;
  U.on('back-home', () => H.home()); U.on('af-home', () => H.home());
  U.on('af-share', () => H.share(result === 'winner' ? `I WON The Villa as ${p.name} with ${score} points. ${envText.replace(/<[^>]+>/g, '')} Think you can last longer?` : result === 'dumped' ? `I lasted ${days} days in The Villa as ${p.name} before getting dumped (${score} pts). Beat that:` : `I made the final of The Villa as ${p.name} (${score} pts). Beat that:`));
  U.on('af-new', () => { if (!confirm('Start a new islander? Your Aftersun card stays on the Hall of Islanders.')) return; localStorage.removeItem(KEY); S = null; form = null; renderCreate(); });
  U.buzz(result === 'winner' ? [40, 60, 40, 60, 80] : [30]);
  U.top();
  function nameOfOther(ids) { const o = (ids || []).find((x) => x !== id); return o && S.cast[o] ? S.cast[o].name : 'someone'; }
}
