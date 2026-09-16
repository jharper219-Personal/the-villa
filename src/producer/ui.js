// Producer mode: cast the villa, then run the season as the public. Every episode ends with a
// decision, the feed reacts, and the season card is built to be screenshotted.
import { makeRng, seasonCode } from '../villa/rng.js';
import { makeBoard, starPower, typeMatch, archLabel, archEmoji, ATTR_LABEL } from '../villa/cast.js';
import { createSeason, run, answer, dayTitle, dayPreview, awardsList } from '../villa/engine.js';
import { P, pop, strength, couplesSorted, SEASON_DAYS, PRIZE, popLabel } from '../villa/model.js';
import * as U from '../ui.js';

const KEY = 'villa-producer-v1';
let H = null, S = null, board = null, boardSeed = null, picked = { f: [], m: [] };
const app = () => H.app;
const save = () => { try { if (S) localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* full disk, private mode */ } };
export function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s && s.v === 1 && s.cast ? s : null; } catch { return null; } }
export const hasSave = () => !!load();
export function init(host) { H = host; }
export function start() {
  S = load();
  if (S && S.phase !== 'done') { if (!S.ui) S.ui = { shown: 0 }; return loop(); }
  S = null; renderCast();
}
export function resume() { S = load(); if (!S) return start(); if (!S.ui) S.ui = { shown: 0 }; if (S.phase === 'done') return renderSeasonCard(); loop(); }
export function resumeCard() {
  const s = load(); if (!s) return '';
  const done = s.phase === 'done';
  const w = done && s.winner ? `${U.esc(P(s, s.winner.a).name)} & ${U.esc(P(s, s.winner.b).name)} won` : `Day ${s.day} · ${s.couples.length} couples · ${s.inVilla.length} islanders`;
  return `<button class="resume-card" id="resume-producer"><span class="rs-emoji">🎬</span><div class="rs-txt"><div class="rs-name">${done ? 'Season card' : 'Resume your season'} · ${U.esc(s.code)}</div><div class="rs-sub">${w}</div></div><div class="mode-go">${done ? 'VIEW ›' : 'RESUME ›'}</div></button>`;
}

// ---------- casting ----------
function newBoard(seed) {
  boardSeed = seed || `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  board = makeBoard(makeRng(boardSeed), 12, 12);
  picked = { f: [], m: [] };
}
function forecast() {
  const all = [...picked.f, ...picked.m].map((id) => findOnBoard(id)).filter(Boolean);
  if (!all.length) return { drama: 0, romance: 0, loyal: 0, star: 0 };
  const avg = (fn) => Math.round(all.reduce((s, p) => s + fn(p), 0) / all.length);
  let romance = 0, pairs = 0;
  for (const f of picked.f) for (const m of picked.m) { const a = findOnBoard(f), b = findOnBoard(m); if (a && b) { romance += (typeMatch(a, b) + typeMatch(b, a)) * 50; pairs++; } }
  return { drama: avg((p) => p.attrs.drama), romance: pairs ? Math.round(romance / pairs + avg((p) => p.attrs.open) * 0.3) : 0, loyal: avg((p) => p.attrs.loyal), star: avg((p) => starPower(p)) };
}
const findOnBoard = (id) => [...board.women, ...board.men].find((p) => p.id === id) || null;
function renderCast(tab = 'f') {
  if (!board) newBoard();
  H.an.screen('cast');
  const fake = { cast: Object.fromEntries([...board.women, ...board.men].map((p) => [p.id, p])), couples: [], inVilla: [], pop: {}, playerId: null };
  const list = tab === 'f' ? board.women : board.men;
  const n = picked.f.length + picked.m.length;
  const fc = forecast();
  const meterRow = (label, v, emoji, cls) => `<div class="fc-row"><span>${emoji} ${label}</span>${U.meter(v, cls)}<b>${v ? (v >= 70 ? 'High' : v >= 50 ? 'Medium' : 'Low') : '–'}</b></div>`;
  app().innerHTML = `<section class="screen cast">
    ${backBar('Cast your villa', () => H.home())}
    <div class="cast-intro"><h2 class="dh-title">Cast your villa</h2><p class="dh-sub">Pick <b>5 girls</b> and <b>5 boys</b>. Every islander has a type on paper, a red flag and a hidden loyalty score. Bombshells come later, and you choose those too.</p>
      <div class="seed-row"><span class="seed">Board <b>${U.esc(boardSeed.slice(-6).toUpperCase())}</b></span><button class="ghost-btn slim" id="cast-reroll">🔀 New board</button></div></div>
    <div class="tabs"><button class="tab ${tab === 'f' ? 'on' : ''}" id="tab-f">Girls <span class="cnt">${picked.f.length}/5</span></button><button class="tab ${tab === 'm' ? 'on' : ''}" id="tab-m">Boys <span class="cnt">${picked.m.length}/5</span></button></div>
    <div class="cast-grid">${list.map((p) => `<button class="cast-card ${picked[tab].includes(p.id) ? 'picked' : ''} ${!picked[tab].includes(p.id) && picked[tab].length >= 5 ? 'locked' : ''}" data-id="${p.id}">${U.islanderCard(fake, p.id, { pick: true, picked: picked[tab].includes(p.id), bio: true })}</button>`).join('')}</div>
    <div class="forecast"><div class="fc-title">Villa forecast <span>${n}/10 cast</span></div>
      ${meterRow('Drama', fc.drama, '🔥', 'bad')}${meterRow('Romance', fc.romance, '💗', 'good')}${meterRow('Loyalty', fc.loyal, '🔒', 'mid')}${meterRow('Star power', fc.star, '✨', 'gold')}
      <button class="cta wide" id="cast-go" ${n < 10 ? 'disabled' : ''}>${n < 10 ? `Pick ${10 - n} more` : 'Cast the villa 🏝️'}</button></div>
  </section>`;
  bindBack(() => H.home());
  U.on('tab-f', () => renderCast('f')); U.on('tab-m', () => renderCast('m'));
  U.on('cast-reroll', () => { newBoard(); U.buzz(10); renderCast(tab); });
  U.onAll('.cast-card', (el) => {
    const id = el.dataset.id; const arr = picked[tab];
    if (arr.includes(id)) picked[tab] = arr.filter((x) => x !== id);
    else if (arr.length < 5) { arr.push(id); U.buzz(12); }
    else { U.flash(`You already have five ${tab === 'f' ? 'girls' : 'boys'}. Tap one to swap.`); return; }
    const y = window.scrollY; renderCast(tab); window.scrollTo({ top: y });
    if (picked.f.length + picked.m.length === 10) { U.flash('Full house. Cast the villa when you’re ready 🏝️'); }
  });
  U.on('cast-go', () => {
    const women = picked.f.map(findOnBoard), men = picked.m.map(findOnBoard);
    S = createSeason({ seed: `${boardSeed}:${Date.now()}`, mode: 'producer', women, men });
    S.ui = { shown: 0 };
    save();
    H.an.track('season_start', { mode: 'producer' });
    U.buzz([20, 40, 20]);
    loop();
  });
}

// ---------- the loop ----------
function topBar() {
  return `<div class="ep-top"><button class="ghost-btn slim" id="ep-villa">🏝️ Villa</button><span class="ep-day">${U.dayLabel(S)}</span><button class="ghost-btn slim" id="ep-quit" title="Leave">🏠</button></div>`;
}
function bindTop() {
  U.on('ep-villa', () => villaSheet());
  U.on('ep-quit', () => { save(); H.home(); });
}
function loop() {
  const out = run(S);
  save();
  const shown = (S.ui && S.ui.shown) || 0;
  if (out.pending) {
    const scenes = S.episode ? S.episode.scenes : [];
    const then = () => { S.ui.shown = scenes.length; save(); renderDecision(out.pending); };
    if (scenes.length > shown) { U.episodeScreen({ app: app(), S, scenes, from: shown, header: topBar() + U.dayHeader(S, shown ? { sub: '' } : {}), onDone: then, nextLabel: 'Decide ›' }); bindTop(); }
    else then();
    return;
  }
  if (out.episode) {
    const ep = out.episode;
    const done = S.phase === 'done';
    U.episodeScreen({ app: app(), S, scenes: ep.scenes, from: shown, header: topBar() + U.dayHeader(S, shown ? { sub: '' } : {}), afterHTML: `${U.moversHTML(S, ep)}${U.captionsHTML(ep, S)}${done ? '' : `<div class="next-up"><div class="feed-title">📺 Next episode</div><b>Day ${S.day + 1}: ${U.esc(dayTitle(S.day + 1))}</b><p>${U.esc(dayPreview(S.day + 1))}</p></div>`}`, onDone: () => { S.ui.shown = 0; save(); if (done) renderSeasonCard(); else loop(); }, nextLabel: done ? 'See the results 🏆' : `Play Day ${S.day + 1} ›` });
    bindTop();
    H.an.track('episode_done', { mode: 'producer', day: S.day });
    return;
  }
  renderSeasonCard();
}
function renderDecision(pending) {
  H.an.screen('decision');
  U.decisionScreen({ app: app(), S, pending, header: topBar(), onAnswer: (choice) => { H.an.track('decision', { mode: 'producer', type: pending.type, day: S.day }); answer(S, choice); save(); loop(); } });
  bindTop();
}
function villaSheet() {
  const ov = document.createElement('div');
  ov.className = 'sheet-wrap';
  ov.innerHTML = `<div class="sheet"><div class="sheet-head"><b>🏝️ The Villa · ${U.dayLabel(S)}</b><button class="ghost-btn slim" id="sheet-close">Close</button></div>
    ${U.villaBoard(S)}
    <div class="vb-title">Everyone in the villa</div>
    <div class="cast-list">${S.inVilla.map((id) => U.islanderCard(S, id, { showPop: true, showPartner: true })).join('')}</div>
    ${S.dumped.length ? `<div class="vb-title">Dumped</div><div class="single-row">${S.dumped.map((d) => `<div class="single-chip gone">${U.face(P(S, d.id), 'xs', 36)} ${U.esc(P(S, d.id).name)} <i>day ${d.day}</i></div>`).join('')}</div>` : ''}
  </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.querySelector('#sheet-close').addEventListener('click', close);
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
}

// ---------- the season card ----------
function renderSeasonCard() {
  H.an.screen('season_card');
  if (!S.ui.counted) { S.ui.counted = true; save(); H.addStats({ seasons: 1 }); H.an.track('season_done', { mode: 'producer' }); }
  const w = S.winner ? { a: P(S, S.winner.a), b: P(S, S.winner.b) } : null;
  const env = S.final && S.final.envelope;
  const envText = !env ? '' : env.result === 'split' ? `They split the $${PRIZE.toLocaleString()} 💞` : env.result === 'bothSteal' ? 'They BOTH stole. Nobody got a dollar. 😱' : `${U.esc(P(S, env.result.split(':')[1]).name)} STOLE the whole $${PRIZE.toLocaleString()} 😈`;
  const awards = S.awards || {};
  const st = S.stats;
  app().innerHTML = `<section class="screen season-card" id="season-card">
    ${backBar('Season card', () => H.home())}
    <div class="sc-card">
      <div class="sc-kicker">SEASON ${U.esc(S.code)} · THE FINAL</div>
      ${w ? `<div class="winners">${U.face(w.a, 'win', 96)}<span class="win-heart">💗</span>${U.face(w.b, 'win', 96)}</div>
      <h2 class="win-names">${U.esc(w.a.name)} & ${U.esc(w.b.name)}</h2>
      <div class="win-sub">Winners with ${S.winner.share}% of the vote</div>
      <div class="win-env">${envText}</div>` : '<h2 class="win-names">No winner</h2>'}
      ${S.final ? `<div class="final-order">${S.final.order.map((o, i) => `<div class="fo-row"><span class="fo-rank">${['🥇', '🥈', '🥉', '4th'][i] || i + 1}</span>${U.face(P(S, o.a), 'xs', 34)}${U.face(P(S, o.b), 'xs', 34)}<span class="fo-names">${U.esc(P(S, o.a).name)} & ${U.esc(P(S, o.b).name)}</span><b>${o.share}%</b></div>`).join('')}</div>` : ''}
      <div class="awards">${awardsList().map((a) => awards[a.id] && S.cast[awards[a.id]] ? `<div class="award"><span class="aw-emoji">${a.emoji}</span>${U.face(P(S, awards[a.id]), 'xs', 40)}<div class="aw-body"><div class="aw-label">${a.label}</div><div class="aw-name">${U.esc(P(S, awards[a.id]).name)}</div></div></div>` : '').join('')}</div>
      <div class="season-stats">
        <div class="ss"><b>${st.kisses}</b><span>kisses</span></div><div class="ss"><b>${st.arguments}</b><span>fire pit rows</span></div><div class="ss"><b>${st.recouplings}</b><span>recouplings</span></div>
        <div class="ss"><b>${st.bombshells}</b><span>bombshells</span></div><div class="ss"><b>${st.dumpings}</b><span>dumped</span></div><div class="ss"><b>${st.stuck}/${st.stuck + st.twisted}</b><span>stuck at Casa</span></div>
      </div>
      <div class="sc-foot">The Villa · thevilla.game</div>
    </div>
    <div class="btn-row"><button class="cta" id="sc-share">📣 Share</button><button class="cta alt" id="sc-new">New season</button></div>
    <button class="ghost-btn wide" id="sc-home">Home</button>
  </section>`;
  bindBack(() => H.home());
  U.on('sc-share', () => H.share(w ? `${w.a.name} & ${w.b.name} just won my villa (season ${S.code}). ${envText.replace(/<[^>]+>/g, '')} Cast yours:` : 'I just ran a whole season of The Villa. Cast yours:'));
  U.on('sc-new', () => { if (!confirm('Start a brand-new season? This one stays on the card until you do.')) return; localStorage.removeItem(KEY); S = null; board = null; renderCast(); });
  U.on('sc-home', () => H.home());
  U.buzz([30, 60, 30, 60, 30]);
  U.top();
}

function backBar(title, fn) { return `<div class="back-bar"><button class="ghost-btn slim" id="back-home">‹ Home</button><span>${U.esc(title)}</span></div>`; }
function bindBack(fn) { U.on('back-home', fn); }
