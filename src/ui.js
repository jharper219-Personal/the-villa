// Shared screens and widgets: islander cards, couple rows, the episode player, the decision
// screen, and the "what America is saying" feed. Both modes render through here.
import { portraitSVG } from './villa/portrait.js';
import { P, partnerOf, pop, popLabel, strength, strengthLabel, WHERE_LABEL, couplesSorted, singles, girls, boys, SEASON_DAYS } from './villa/model.js';
import { archLabel, archEmoji, typeOnPaper, topAttrs, ATTR_LABEL, tier, starPower, ARCHETYPES } from './villa/cast.js';
import { hashStr } from './villa/rng.js';
import { dayTitle, dayPreview } from './villa/engine.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const face = (p, cls = '', size = 96) => `<span class="pfw ${cls}">${portraitSVG(p, size)}</span>`;
export const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); return el; };
export const onAll = (sel, fn) => document.querySelectorAll(sel).forEach((el) => el.addEventListener('click', (ev) => fn(el, ev)));
export const buzz = (pattern) => { try { navigator.vibrate && navigator.vibrate(pattern); } catch { /* unsupported */ } };
export const top = () => window.scrollTo({ top: 0 });
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export function flash(msg, cls = '') {
  const t = document.createElement('div');
  t.className = `flash ${cls}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
export const pill = (text, cls = '') => `<span class="pill ${cls}">${text}</span>`;
/** A short burst of falling emoji for the moments that deserve one. */
export function celebrate(kind = 'hearts') {
  try {
    const set = { hearts: ['💗', '💕', '💖', '✨', '💘'], win: ['🏆', '🎉', '✨', '💗', '🥂', '🎊'], fire: ['🔥', '💋', '✨', '💗'], sad: ['🧳', '💔', '🥲'] }[kind] || ['✨'];
    const wrap = document.createElement('div');
    wrap.className = 'confetti';
    for (let i = 0; i < 22; i++) {
      const s = document.createElement('span');
      s.textContent = set[i % set.length];
      s.style.left = `${Math.random() * 100}%`;
      s.style.animationDelay = `${Math.random() * 0.5}s`;
      s.style.animationDuration = `${1.6 + Math.random() * 1.2}s`;
      s.style.fontSize = `${16 + Math.random() * 18}px`;
      wrap.appendChild(s);
    }
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 3400);
  } catch { /* purely decorative */ }
}
export const meter = (v, cls = '', label = '') => `<div class="meter ${cls}" title="${esc(label)}"><div class="meter-fill" style="width:${Math.max(2, Math.min(100, v))}%"></div></div>`;
export const popChip = (S, id) => { const v = pop(S, id); return `<span class="popchip ${v >= 65 ? 'hot' : v < 40 ? 'cold' : ''}">${v >= 65 ? '🔥' : v < 40 ? '🥶' : '📺'} ${v}</span>`; };
export const dayLabel = (S) => `Day ${S.day} of ${SEASON_DAYS}`;

// ---------- cards ----------
export function islanderCard(S, id, o = {}) {
  const p = P(S, id);
  const partner = S ? partnerOf(S, id) : null;
  const attrs = topAttrs(p, 3);
  return `<div class="isl-card ${o.cls || ''} ${o.picked ? 'picked' : ''} ${o.locked ? 'locked' : ''} ${o.me ? 'me' : ''}" data-id="${esc(id)}">
    ${face(p, 'card', 72)}
    <div class="isl-body">
      <div class="isl-name">${esc(p.name)} <span class="isl-age">${p.age}</span> ${p.bombshell ? pill('💣 bombshell', 'bomb') : ''} ${o.me ? pill('you', 'you') : ''}</div>
      <div class="isl-sub">${esc(p.job)} · ${esc(p.home)}</div>
      <div class="isl-arch">${archEmoji(p)} ${archLabel(p)}${o.showPop ? ` · ${popChip(S, id)}` : ''}${o.showPartner && partner ? ` · 💗 ${esc(P(S, partner).name)}` : o.showPartner ? ' · single' : ''}</div>
      ${o.attrs !== false ? `<div class="isl-attrs">${attrs.map((k) => `<span class="attr ${tier(p.attrs[k])}">${ATTR_LABEL[k]} ${p.attrs[k]}</span>`).join('')}</div>` : ''}
      ${o.bio ? `<div class="isl-bio"><b>Type on paper:</b> ${esc(typeOnPaper(p))}<br><b>Red flag:</b> ${esc(p.bio.flag)}<br><i>“${esc(p.bio.quote)}”</i></div>` : ''}
      ${o.sub ? `<div class="isl-extra">${o.sub}</div>` : ''}
    </div>
    ${o.pick ? `<div class="isl-pick">${o.picked ? '✓' : '+'}</div>` : ''}
  </div>`;
}
export function coupleRow(S, c, o = {}) {
  const a = P(S, c.a), b = P(S, c.b), v = strength(S, c);
  return `<div class="couple-row ${o.cls || ''}" data-id="${esc(c.a)}|${esc(c.b)}">
    <div class="cr-faces">${face(a, 'sm', 52)}<span class="cr-heart">${v >= 65 ? '💗' : v >= 45 ? '💛' : '🧊'}</span>${face(b, 'sm', 52)}</div>
    <div class="cr-body"><div class="cr-names">${esc(a.name)} & ${esc(b.name)} ${o.tag || ''}</div>
      ${meter(v, v >= 65 ? 'good' : v >= 45 ? 'mid' : 'bad')}
      <div class="cr-sub">${strengthLabel(v)} · since day ${c.since || 1}${o.pop ? ` · ${Math.round((pop(S, c.a) + pop(S, c.b)) / 2)} pop` : ''}</div></div>
    ${o.pick ? `<div class="isl-pick">›</div>` : ''}
  </div>`;
}
export function villaBoard(S, o = {}) {
  const cs = couplesSorted(S);
  const sg = singles(S);
  return `<div class="villa-board">
    <div class="vb-title">Couples</div>
    ${cs.map((c) => coupleRow(S, c, { pop: true, tag: (S.playerId && (c.a === S.playerId || c.b === S.playerId)) ? pill('you', 'you') : '' })).join('') || '<div class="empty">Nobody is coupled up.</div>'}
    ${sg.length ? `<div class="vb-title">Single${sg.length > 1 ? 's' : ''} <span class="vb-warn">vulnerable</span></div><div class="single-row">${sg.map((id) => `<div class="single-chip">${face(P(S, id), 'xs', 36)} ${esc(P(S, id).name)}</div>`).join('')}</div>` : ''}
    <div class="vb-title">The public’s favorites</div>
    <div class="pop-list">${S.inVilla.slice().sort((x, y) => pop(S, y) - pop(S, x)).map((id, i) => `<div class="pop-row ${S.playerId === id ? 'me' : ''}"><span class="pop-rank">${i + 1}</span>${face(P(S, id), 'xs', 34)}<span class="pop-name">${esc(P(S, id).name)}</span>${meter(pop(S, id), pop(S, id) >= 65 ? 'good' : pop(S, id) < 40 ? 'bad' : 'mid')}<span class="pop-num">${pop(S, id)}</span></div>`).join('')}</div>
  </div>`;
}

// ---------- the episode player ----------
const KIND_ICON = { text: '📱', chat: '💬', flirt: '😏', kiss: '💋', argument: '😤', gossip: '🗣️', confession: '🎥', arrival: '✨', recouple: '🔥', dump: '🧳', challenge: '🎯', date: '🥂', movie: '🎬', vote: '📊', final: '🏆', twist: '🌀', narrator: '' };
export function sceneHTML(S, sc, hidden) {
  const who = (sc.who || []).filter((id) => S.cast[id]).slice(0, 3);
  const isText = sc.kind === 'text';
  const isMe = S.playerId && who.includes(S.playerId);
  const body = isText
    ? `<div class="txt-opener">${esc(sc.who && sc.who[0] && S.playerId === sc.who[0] ? 'You’ve got a text!' : `${esc(P(S, sc.who[0]).name)}: “${sc.opener || 'I’ve got a text!'}”`)}</div><div class="txt-body">${hashtags(esc(sc.text))}</div>`
    : `<div class="sc-text">${esc(sc.text)}</div>`;
  return `<div class="scene k-${sc.kind} ${sc.big ? 'big' : ''} ${sc.reveal ? 'reveal' : ''} ${hidden ? 'hid' : ''} ${isMe ? 'me' : ''}">
    <div class="sc-meta"><span class="sc-where">${WHERE_LABEL[sc.where] || WHERE_LABEL.villa}</span>${KIND_ICON[sc.kind] ? `<span class="sc-kind">${KIND_ICON[sc.kind]}</span>` : ''}</div>
    <div class="sc-row">${who.length ? `<div class="sc-faces">${who.map((id) => face(P(S, id), 'sc', 44)).join('')}</div>` : ''}${body}</div>
  </div>`;
}
const hashtags = (s) => s.replace(/(#\w+)/g, '<span class="tag">$1</span>');
const HANDLES = ['villa_vixen', 'firepitfiona', 'bombshellwatch', 'casa_survivor', 'grafting_gary', 'teamloyal', 'terracegirls', 'hoodie_on_daybed', 'the_edit_knows', 'recoupling_ruth', 'notmytypeonpaper', 'ive_got_a_text', 'popcorn_pam', 'daybed_detective', 'stand_on_business', 'islandmomma', 'pool_filter_asmr', 'sundress_sunday', 'beachhut_confessions', 'villa_ceo', 'lowkeyinvested', 'thegroupchat', 'wine_and_villa', 'hearts_racing', 'mallorca_mel'];
const AVATARS = ['🌸', '🍒', '🐚', '🦩', '🌊', '🍑', '🌺', '🍹', '🦋', '🌙', '🐬', '🌴', '🍋', '🫧', '☀️'];
export function captionsHTML(ep, S) {
  if (!ep || !ep.captions || !ep.captions.length) return '';
  return `<div class="feed"><div class="feed-title">💬 What America is saying</div>
    ${ep.captions.map((c) => { const h = hashStr(c.text); return `<div class="post tone-${c.tone || 'neutral'}"><span class="post-av">${AVATARS[h % AVATARS.length]}</span><div class="post-body"><div class="post-handle">@${HANDLES[h % HANDLES.length]}${h % 7 === 0 ? ' ✓' : ''}</div><div class="post-text">${esc(c.text)}</div><div class="post-meta">♥ ${(h % 900) + 120 + (c.tone === 'spicy' ? 400 : 0)} · ↻ ${(h % 90) + 8}</div></div></div>`; }).join('')}
  </div>`;
}
export function moversHTML(S, ep) {
  if (!ep || !ep.fx) return '';
  const rows = Object.entries(ep.fx).filter(([id, d]) => S.cast[id] && d !== 0).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 4);
  if (!rows.length) return '';
  return `<div class="movers"><div class="feed-title">📈 Public mood</div>${rows.map(([id, d]) => `<div class="mover ${d > 0 ? 'up' : 'down'}">${face(P(S, id), 'xs', 30)}<span>${esc(P(S, id).name)}</span><b>${d > 0 ? '▲' : '▼'} ${Math.abs(d)}</b>${S.inVilla.includes(id) ? `<i>${popLabel(pop(S, id))}</i>` : '<i>gone</i>'}</div>`).join('')}</div>`;
}
export function dayHeader(S, o = {}) {
  const d = S.day;
  return `<div class="day-head">
    <div class="dh-top"><span class="dh-day">${o.kicker || `Day ${d}`}</span><span class="dh-ep">Episode ${d} of ${SEASON_DAYS}</span></div>
    <h2 class="dh-title">${esc(o.title || dayTitle(d))}</h2>
    ${o.sub !== undefined ? (o.sub ? `<p class="dh-sub">${esc(o.sub)}</p>` : '') : `<p class="dh-sub">${esc(dayPreview(d))}</p>`}
  </div>`;
}

/**
 * Play scenes one beat at a time. `from` skips scenes already shown earlier today.
 * Calls onDone when the last one is on screen and the player taps Continue.
 */
export function episodeScreen({ app, S, scenes, from = 0, header = '', footer = '', afterHTML = '', onDone, nextLabel = 'Continue ›', autoRevealFirst = true, backHTML = '' }) {
  const list = scenes.slice(from);
  // Reveal groups: everything up to and including the next `reveal` scene shows on one tap.
  const groups = [];
  let cur = [];
  list.forEach((sc, i) => { cur.push(i); if (sc.reveal || sc.big || cur.length >= 3) { groups.push(cur); cur = []; } });
  if (cur.length) groups.push(cur);
  let g = 0;
  app.innerHTML = `<section class="screen episode">${backHTML}${header}
    <div class="scenes" id="scenes">${list.map((sc) => sceneHTML(S, sc, true)).join('')}</div>
    <div class="ep-after" id="ep-after" hidden>${afterHTML}</div>
    <div class="ep-bar"><button class="ghost-btn slim" id="ep-skip" ${groups.length <= 1 ? 'hidden' : ''}>Skip to the end</button><button class="cta" id="ep-next">${list.length ? 'Play ▶' : nextLabel}</button></div>
    ${footer}</section>`;
  const nodes = [...app.querySelectorAll('#scenes .scene')];
  const show = (idxs) => {
    let last = null;
    for (const i of idxs) { nodes[i].classList.remove('hid'); nodes[i].classList.add('in'); last = nodes[i]; }
    if (!last) return;
    const sc = list[idxs[idxs.length - 1]];
    const mine = S.playerId && (sc.who || []).includes(S.playerId);
    if (sc.big || sc.reveal) buzz(sc.kind === 'text' ? [30, 60, 30] : 18);
    if (sc.kind === 'kiss' && (mine || S.mode === 'producer')) celebrate('fire');
    else if (sc.kind === 'final' && sc.big && sc.reveal) celebrate('win');
    else if (sc.kind === 'recouple' && mine && sc.big) celebrate('hearts');
    else if (sc.kind === 'dump' && mine) celebrate('sad');
    last.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const finish = () => { const after = document.getElementById('ep-after'); if (after) { after.hidden = false; } const b = document.getElementById('ep-next'); if (b) b.textContent = nextLabel; const sk = document.getElementById('ep-skip'); if (sk) sk.hidden = true; };
  const next = () => {
    if (g < groups.length) { show(groups[g]); g++; if (g >= groups.length) finish(); else { const b = document.getElementById('ep-next'); if (b) b.textContent = list[groups[g][groups[g].length - 1]].reveal ? 'Reveal ›' : 'Next ›'; } return; }
    onDone && onDone();
  };
  on('ep-next', next);
  on('ep-skip', () => { while (g < groups.length) { show(groups[g]); g++; } finish(); });
  if (!list.length) finish();
  else if (autoRevealFirst) next();
  top();
}

// ---------- decisions ----------
/** Render a pending question. onAnswer(choice) is called with what the engine expects. */
export function decisionScreen({ app, S, pending, onAnswer, header = '', backHTML = '' }) {
  const p = pending;
  let picked = [];
  let roles = { kiss: null, marry: null, pie: null };
  let role = 'kiss';
  let pairs = [], curGirl = null;
  const isCouples = p.type === 'couplePick';
  const isBig = ['firstCoupling', 'postcard', 'envelope'].includes(p.type);
  const optHTML = (o) => {
    if (isCouples) { const [a, b] = o.id.split('|'); const c = S.couples.find((k) => k.a === a && k.b === b) || { a, b, since: 1 }; return `<button class="opt couple-opt" data-id="${esc(o.id)}">${coupleRow(S, c, { pick: true })}</button>`; }
    if (o.who && o.who.length === 1 && S.cast[o.who[0]]) return `<button class="opt isl-opt" data-id="${esc(o.id)}">${islanderCard(S, o.who[0], { attrs: !!p.cards, bio: !!p.cards, sub: o.sub ? esc(o.sub) : '', pick: true })}</button>`;
    return `<button class="opt txt-opt ${isBig ? 'big' : ''}" data-id="${esc(o.id)}"><span class="opt-label">${esc(o.label)}</span>${o.sub ? `<span class="opt-sub">${esc(o.sub)}</span>` : ''}</button>`;
  };
  let body = '';
  if (p.type === 'pairUp') {
    body = `<div class="pair-cols"><div class="pair-col"><div class="vb-title">Girls</div>${p.girls.map((id) => `<button class="opt isl-opt girl" data-id="${esc(id)}">${islanderCard(S, id, { attrs: false, pick: true })}</button>`).join('')}</div>
      <div class="pair-col"><div class="vb-title">Boys</div>${p.boys.map((id) => `<button class="opt isl-opt boy" data-id="${esc(id)}">${islanderCard(S, id, { attrs: false, pick: true })}</button>`).join('')}</div></div>
      <div class="pairs" id="pairs"></div>`;
  } else if (p.type === 'smp') {
    body = `<div class="roles"><button class="role on" data-role="kiss">💋 Kiss</button><button class="role" data-role="marry">💍 Marry</button><button class="role" data-role="pie">🥧 Pie</button></div><div class="opts">${p.options.map(optHTML).join('')}</div>`;
  } else body = `<div class="opts ${isBig ? 'big-opts' : ''}">${p.options.map(optHTML).join('')}</div>`;
  const needsConfirm = !isBig;
  app.innerHTML = `<section class="screen decision">${backHTML}${header}
    <div class="dec-card">
      <div class="dec-kicker">${p.by === 'public' ? '📣 AMERICA DECIDES' : '💗 YOUR CALL'}</div>
      <h2 class="dec-title">${esc(p.title)}</h2>
      <p class="dec-prompt">${esc(p.prompt)}</p>
      ${body}
      ${needsConfirm ? `<button class="cta wide" id="dec-confirm" disabled>${p.multi ? `Choose ${p.multi}` : 'Lock it in'}</button>` : ''}
    </div></section>`;
  const confirm = document.getElementById('dec-confirm');
  const refresh = () => {
    document.querySelectorAll('.opt').forEach((el) => el.classList.toggle('on', picked.includes(el.dataset.id)));
    if (!confirm) return;
    if (p.type === 'smp') { confirm.disabled = !(roles.kiss && roles.marry && (roles.pie || p.options.length < 3)); confirm.textContent = 'Lock it in'; document.querySelectorAll('.isl-opt').forEach((el) => { const r = Object.entries(roles).find(([, v]) => v === el.dataset.id); el.querySelector('.isl-pick').textContent = r ? { kiss: '💋', marry: '💍', pie: '🥧' }[r[0]] : '+'; el.classList.toggle('on', !!r); }); return; }
    if (p.type === 'pairUp') { confirm.disabled = pairs.length < Math.min(p.girls.length, p.boys.length); confirm.textContent = confirm.disabled ? `${pairs.length}/${Math.min(p.girls.length, p.boys.length)} coupled` : 'Lock it in'; const el = document.getElementById('pairs'); el.innerHTML = pairs.map(([f, m]) => `<div class="pair-chip">${face(P(S, f), 'xs', 30)} ${esc(P(S, f).name)} 💗 ${esc(P(S, m).name)} ${face(P(S, m), 'xs', 30)}</div>`).join(''); document.querySelectorAll('.girl').forEach((b) => b.classList.toggle('used', pairs.some(([f]) => f === b.dataset.id))); document.querySelectorAll('.boy').forEach((b) => b.classList.toggle('used', pairs.some(([, m]) => m === b.dataset.id))); document.querySelectorAll('.girl').forEach((b) => b.classList.toggle('on', b.dataset.id === curGirl)); return; }
    if (p.multi) { confirm.disabled = picked.length !== p.multi; confirm.textContent = picked.length === p.multi ? 'Lock it in' : `Choose ${p.multi - picked.length} more`; }
    else confirm.disabled = picked.length !== 1;
  };
  onAll('.opt', (el) => {
    buzz(10);
    const id = el.dataset.id;
    if (isBig) { onAnswer({ id }); return; }
    if (p.type === 'smp') { roles[role] = id; for (const k of Object.keys(roles)) if (k !== role && roles[k] === id) roles[k] = null; role = ['kiss', 'marry', 'pie'].find((k) => !roles[k]) || role; document.querySelectorAll('.role').forEach((b) => b.classList.toggle('on', b.dataset.role === role)); refresh(); return; }
    if (p.type === 'pairUp') {
      if (el.classList.contains('girl')) { curGirl = id; pairs = pairs.filter(([f]) => f !== id); }
      else if (curGirl) { pairs = pairs.filter(([, m]) => m !== id); pairs.push([curGirl, id]); curGirl = null; }
      refresh(); return;
    }
    if (p.multi) { picked = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id].slice(-p.multi); }
    else picked = [id];
    refresh();
  });
  onAll('.role', (el) => { role = el.dataset.role; document.querySelectorAll('.role').forEach((b) => b.classList.toggle('on', b === el)); });
  if (confirm) confirm.addEventListener('click', () => {
    buzz([20, 40, 20]);
    if (p.type === 'smp') return onAnswer({ kiss: roles.kiss, marry: roles.marry, pie: roles.pie });
    if (p.type === 'pairUp') return onAnswer({ manual: true, pairs });
    if (p.multi) return onAnswer({ ids: picked });
    onAnswer({ id: picked[0] });
  });
  refresh();
  top();
}

/** The archetype picker used by both modes' create screens. */
export const archOptions = () => Object.entries(ARCHETYPES).map(([k, a]) => ({ id: k, label: `${a.emoji} ${a.label}`, sub: a.tagline }));
export const star = (p) => starPower(p);
