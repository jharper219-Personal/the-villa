// The Villa - app shell: first run, home, the Hall of Islanders, sharing, install.
import * as producer from './producer/ui.js';
import * as islander from './islander/ui.js';
import { league, LEAGUE_MODE, validHandle, handleKey, handleSuggestion } from './league.js';
import * as an from './analytics.js';
import * as U from './ui.js';
import { makeRng } from './villa/rng.js';
import { portraitSVG } from './villa/portrait.js';
import { ARCHETYPES } from './villa/cast.js';

const APP_VERSION = 'v1';
const HANDLE_KEY = 'villa-handle-v1';
const STATS_KEY = 'villa-stats-v1';
const app = document.getElementById('app');
const rng = makeRng();
const state = { handle: null };

// ---------- storage ----------
const loadHandle = () => { try { const h = JSON.parse(localStorage.getItem(HANDLE_KEY) || 'null'); return h && h.display && h.token ? h : null; } catch { return null; } };
const saveHandle = (h) => { try { localStorage.setItem(HANDLE_KEY, JSON.stringify(h)); } catch { /* ignore */ } };
const blankStats = () => ({ seasons: 0, islanderRuns: 0, finals: 0, wins: 0, bestScore: 0, bestDays: 0 });
const loadStats = () => { try { return Object.assign(blankStats(), JSON.parse(localStorage.getItem(STATS_KEY) || '{}')); } catch { return blankStats(); } };
const saveStats = (s) => { try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* ignore */ } };
function addStats(patch) {
  const s = loadStats();
  for (const [k, v] of Object.entries(patch)) { if (k.startsWith('best')) s[k] = Math.max(s[k] || 0, v || 0); else s[k] = (s[k] || 0) + (v || 0); }
  saveStats(s);
}
const token = () => { const a = new Uint8Array(24); crypto.getRandomValues(a); return [...a].map((b) => b.toString(16).padStart(2, '0')).join(''); };

// ---------- boot ----------
(async function boot() {
  state.handle = loadHandle();
  an.init({ version: APP_VERSION, handle: state.handle });
  const host = { app, home: renderHome, handle: () => state.handle, stats: loadStats, addStats, share, an, postRun };
  producer.init(host); islander.init(host);
  window.villa = { home: renderHome, qa: () => import('./qa.js').then((m) => m.runQA({ home: renderHome })), version: APP_VERSION };
  const q = new URLSearchParams(location.search);
  if (q.get('qa') === '1') { if (!state.handle) { state.handle = { display: 'QA', key: 'qa', token: token() }; } renderHome(); const { runQA } = await import('./qa.js'); await runQA({ home: renderHome }); return; }
  if (state.handle) { renderHome(); league.touch(state.handle.display, state.handle.token).catch(() => {}); }
  else renderWelcome();
})();

// ---------- first run ----------
function renderWelcome(err = '') {
  an.screen('welcome');
  const suggestion = handleSuggestion(rng);
  app.innerHTML = `<section class="screen welcome">
    <div class="hero">${logo()}<p class="tagline">Cast the villa and run the season as the public. Or walk in as an islander and try to make the final.</p></div>
    <div class="wl-card">
      <div class="lbl">Pick a username</div>
      <input id="wl-name" class="inp big" maxlength="16" value="${U.esc(suggestion)}" autocomplete="off" spellcheck="false" />
      <div class="muted small">3 to 16 letters, numbers or underscores. It goes on the Hall of Islanders.</div>
      ${err ? `<div class="err">${U.esc(err)}</div>` : ''}
      <button class="cta wide" id="wl-go">Enter the villa 🏝️</button>
      <button class="ghost-btn slim" id="wl-shuffle">🎲 Suggest another</button>
    </div>
  </section>`;
  const inp = document.getElementById('wl-name');
  U.on('wl-shuffle', () => { inp.value = handleSuggestion(rng); });
  U.on('wl-go', async () => {
    const name = inp.value.trim();
    if (!validHandle(name)) return renderWelcome('3 to 16 characters: letters, numbers, underscores.');
    const btn = document.getElementById('wl-go'); btn.disabled = true; btn.textContent = 'Checking…';
    const t = token();
    try {
      const r = await league.claim(name, t);
      if (!r.ok) { const why = r.reason === 'taken' ? 'That one is taken. Try another.' : r.reason === 'format' ? '3 to 16 characters: letters, numbers, underscores.' : 'Could not claim that name.'; return renderWelcome(why); }
      state.handle = { display: r.display || name, key: r.handle || handleKey(name), token: t };
    } catch {
      state.handle = { display: name, key: handleKey(name), token: t, pending: true };
    }
    saveHandle(state.handle); an.setHandle(state.handle.key); an.track('handle_claimed');
    U.buzz([20, 40, 20]);
    renderHome();
  });
  inp.focus();
}

// ---------- home ----------
function logo() {
  return `<h1 class="logo" aria-label="The Villa"><span class="logo-the">the</span><span class="logo-name">Villa</span><span class="logo-heart">💗</span></h1>`;
}
function renderHome() {
  an.screen('home');
  const s = loadStats();
  app.innerHTML = `<section class="screen home">
    <div class="home-top"><span class="handle-chip">👤 ${U.esc(state.handle ? state.handle.display : 'guest')}</span><span id="home-install"></span><button class="ghost-btn slim" id="home-share">📣 Share</button></div>
    <div class="hero">${logo()}<p class="tagline">Your villa. Your rules. Your summer.</p></div>
    <div class="modes">
      <button class="mode-card producer" id="mode-producer"><div class="mc-emoji">🎬</div><div class="mc-body"><div class="mc-title">Run the Villa</div><div class="mc-sub">Cast ten islanders, pick the bombshells, send the postcard, and vote like America. 22 episodes.</div></div><div class="mode-go">PLAY ›</div></button>
      <button class="mode-card islander" id="mode-islander"><div class="mc-emoji">🌅</div><div class="mc-body"><div class="mc-title">Be an Islander</div><div class="mc-sub">Create yourself, walk in, pull people for chats, survive recouplings and Casa Amor. Make the final.</div></div><div class="mode-go">PLAY ›</div></button>
    </div>
    ${producer.resumeCard()}${islander.resumeCard()}
    <button class="board-btn" id="home-board"><span>🏆 Hall of Islanders</span><span class="muted">${LEAGUE_MODE === 'global' ? 'global board' : 'this device'} ›</span></button>
    <div class="trophy-case">
      <div class="tc-item"><div class="tc-num">${s.seasons}</div><div class="tc-label">Seasons run</div></div>
      <div class="tc-item"><div class="tc-num">${s.islanderRuns}</div><div class="tc-label">Islanders</div></div>
      <div class="tc-item"><div class="tc-num">${s.finals}</div><div class="tc-label">Finals</div></div>
      <div class="tc-item gold"><div class="tc-num">${s.wins}</div><div class="tc-label">Wins 🏆</div></div>
    </div>
    <div class="home-foot">Best islander run: <b>${s.bestScore}</b> pts · longest stay <b>${s.bestDays}</b> days</div>
  </section>`;
  U.on('mode-producer', () => { an.track('mode', { mode: 'producer' }); producer.start(); });
  U.on('mode-islander', () => { an.track('mode', { mode: 'islander' }); islander.start(); });
  U.on('resume-producer', () => producer.resume());
  U.on('resume-islander', () => islander.resume());
  U.on('home-board', () => renderBoard());
  U.on('home-share', () => share('Cast your own villa, or walk in as an islander. The Villa:'));
  renderInstall();
  U.top();
}

// ---------- hall of islanders ----------
async function renderBoard() {
  an.screen('board');
  app.innerHTML = `<section class="screen board-screen"><div class="back-bar"><button class="ghost-btn slim" id="back-home">‹ Home</button><span>Hall of Islanders</span></div>
    <div class="board-kicker">${LEAGUE_MODE === 'global' ? '🌍 GLOBAL BOARD' : '📱 THIS DEVICE'} · best islander runs</div>
    <div id="board-list" class="board-list"><div class="muted">Loading…</div></div></section>`;
  U.on('back-home', renderHome);
  let rows = [];
  try { rows = await league.board(50); } catch { rows = []; }
  const el = document.getElementById('board-list'); if (!el) return;
  if (!rows.length) { el.innerHTML = `<div class="empty">Nobody has posted a run yet. Be the first islander.</div>`; return; }
  const my = state.handle ? state.handle.key : null;
  el.innerHTML = rows.map((r, i) => {
    const fake = { id: `b${i}`, gender: r.gender === 'f' ? 'f' : 'm', look: r.look || {} };
    const A = ARCHETYPES[r.arch] || ARCHETYPES.sweetheart;
    return `<div class="board-row ${r.handle === my ? 'me' : ''}"><span class="br-rank">${i + 1}</span><span class="pfw xs">${portraitSVG(fake, 40)}</span><div class="br-body"><div class="br-name">${U.esc(r.name)} <span class="muted">@${U.esc(r.display || r.handle)}</span></div><div class="br-sub">${A.emoji} ${A.label.replace('The ', '')} · ${r.days} day${r.days === 1 ? '' : 's'} · ${{ winner: '🏆 winner', 'runner-up': '🥈 runner-up', finalist: '🌅 finalist', dumped: '🧳 dumped' }[r.result] || r.result}${r.entry === 'bombshell' ? ' · 💣' : ''}</div></div><b class="br-score">${r.score}</b></div>`;
  }).join('');
}
async function postRun(run) {
  if (!state.handle) return { ok: false };
  try { return await league.postRun(state.handle.display, state.handle.token, run); } catch { return { ok: false }; }
}

// ---------- share ----------
const shareUrl = () => `${location.origin}${location.pathname}`.replace(/index\.html$/, '');
async function share(text) {
  an.track('share');
  const url = shareUrl();
  if (navigator.share) { try { await navigator.share({ title: 'The Villa', text, url }); return; } catch { /* cancelled */ } }
  try { await navigator.clipboard.writeText(`${text} ${url}`); U.flash('Link copied 📋'); } catch { U.flash(url); }
}

// ---------- install ----------
var installPrompt = null; // var: boot() runs before this line is reached, so it must not be in a temporal dead zone
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; renderInstall(); });
function isInstalled() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone; }
function renderInstall() {
  const slot = document.getElementById('home-install'); if (!slot) return;
  if (isInstalled()) { slot.innerHTML = ''; return; }
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!installPrompt && !ios) { slot.innerHTML = ''; return; }
  slot.innerHTML = `<button class="ghost-btn slim" id="home-install-btn">📲 Install</button>`;
  U.on('home-install-btn', async () => {
    an.track('a2hs', { os: ios ? 'ios' : 'prompt' });
    if (installPrompt) { installPrompt.prompt(); try { await installPrompt.userChoice; } catch { /* ignore */ } installPrompt = null; renderInstall(); return; }
    const ov = document.createElement('div'); ov.className = 'sheet-wrap';
    ov.innerHTML = `<div class="sheet small"><div class="sheet-head"><b>Keep The Villa on your phone</b><button class="ghost-btn slim" id="sheet-close">Close</button></div><ol class="steps"><li>Tap the <b>Share</b> button in Safari (the square with the arrow).</li><li>Scroll and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. It opens full screen like a real app.</li></ol></div>`;
    document.body.appendChild(ov); ov.querySelector('#sheet-close').addEventListener('click', () => ov.remove()); ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
  });
}

// ---------- errors ----------
function reportError(e) {
  const msg = (e && e.message) || String(e);
  try { localStorage.setItem('villa-last-error', `${new Date().toISOString()} ${msg}`); } catch { /* ignore */ }
  an.track('error', { msg: String(msg).slice(0, 64) });
  const t = document.createElement('div'); t.className = 'flash err'; t.textContent = `Something broke: ${msg}`; document.body.appendChild(t); setTimeout(() => t.remove(), 6000);
  console.error(e);
}
window.addEventListener('error', (ev) => { if (ev.error) reportError(ev.error); });
window.addEventListener('unhandledrejection', (ev) => { if (ev.reason && !/HTTP 404/.test(String(ev.reason.message || ev.reason))) reportError(ev.reason); });
