// Smoke test, run inside the real page. Open the game with ?qa=1 or call window.villa.qa().
//
// Part one is volume: hundreds of headless seasons in both modes with every decision made at
// random, checking that every season ends, every string is a real string, and the numbers stay
// where they should. Part two clicks through the actual screens. Your own saves are snapshotted
// first and put back at the end.
import { makeRng } from './villa/rng.js';
import { makeBoard, makeIslander, ARCH_KEYS } from './villa/cast.js';
import { createSeason, run, answer, controlled, playerScore, computeAwards } from './villa/engine.js';
import { SEASON_DAYS } from './villa/model.js';

const KEYS = ['villa-producer-v1', 'villa-islander-v1', 'villa-stats-v1', 'villa-handle-v1', 'villa-runs-local-v1', 'villa-share-day', 'villa-welcome-done'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (sel) => document.querySelector(sel);
const has = (sel) => !!$(sel);
const click = (sel) => { const el = $(sel); if (!el) throw new Error(`missing ${sel}`); el.click(); return el; };
async function until(fn, ms = 4000, what = 'condition') {
  const t0 = performance.now();
  for (;;) { const v = fn(); if (v) return v; if (performance.now() - t0 > ms) throw new Error(`timed out waiting for ${what}`); await sleep(40); }
}
const BAD = /undefined|NaN|\[object|null(?![a-z])|\{\}|\bfunction\b/;

/** Answer any pending question at random, the way a bored tester would. */
function randomAnswer(S, p, rng) {
  switch (p.type) {
    case 'firstCoupling': return rng.chance(0.5) ? { id: 'auto' } : { id: 'manual' };
    case 'pairUp': { const gs = rng.shuffle(p.girls), bs = rng.shuffle(p.boys); return { manual: true, pairs: gs.map((g, i) => [g, bs[i]]).filter((x) => x[1]) }; }
    case 'datePicks': return { ids: rng.sample(p.options.map((o) => o.id), p.multi || 2) };
    case 'smp': { const ids = rng.shuffle(p.options.map((o) => o.id)); return { kiss: ids[0], marry: ids[1] || ids[0], pie: ids[2] || null }; }
    case 'actions': return { done: true };
    default: return { id: rng.pick(p.options).id };
  }
}

export function headlessSeason(seed, mode, rng, hooks = {}) {
  const board = makeBoard(rng, 5, 5);
  let player = null, entry = 'og';
  if (mode === 'islander') {
    const used = new Set([...board.women, ...board.men].map((p) => p.name));
    player = makeIslander(rng, rng.pick(['f', 'm']), used, { arch: rng.pick(ARCH_KEYS), id: 'me' });
    entry = rng.chance(0.3) ? 'bombshell' : 'og';
  }
  const S = createSeason({ seed, mode, women: board.women, men: board.men, player, playerEntry: entry });
  let guard = 0, decisions = 0;
  const seenTypes = new Set();
  while (S.phase !== 'done' && guard++ < 600) {
    const out = run(S);
    if (out.pending) {
      const p = out.pending;
      if (!controlled(S, p.by)) throw new Error(`uncontrolled pending leaked: ${p.type} by ${p.by}`);
      seenTypes.add(p.type);
      decisions++;
      if (hooks.onPending) hooks.onPending(S, p);
      if (mode === 'islander' && p.type === 'actions' && hooks.act) hooks.act(S, rng);
      answer(S, randomAnswer(S, p, rng));
    } else if (out.episode) {
      for (const sc of out.episode.scenes) {
        if (typeof sc.text !== 'string' || !sc.text.trim()) throw new Error(`day ${out.episode.day}: empty scene text (${sc.kind})`);
        if (BAD.test(sc.text)) throw new Error(`day ${out.episode.day}: bad token in scene: ${sc.text.slice(0, 120)}`);
      }
      for (const c of out.episode.captions) if (typeof c.text !== 'string' || BAD.test(c.text)) throw new Error(`day ${out.episode.day}: bad caption: ${String(c.text).slice(0, 100)}`);
      if (!out.episode.captions.length) throw new Error(`day ${out.episode.day}: no captions`);
      const g = S.inVilla.filter((id) => S.cast[id].gender === 'f').length, b = S.inVilla.length - g;
      if (S.phase !== 'done' && S.day < SEASON_DAYS && (g < 3 || b < 3)) throw new Error(`day ${S.day}: villa too small ${g}F/${b}M`);
      for (const c of S.couples) if (S.cast[c.a].gender !== 'f' || S.cast[c.b].gender !== 'm') throw new Error(`day ${S.day}: couple genders wrong`);
      for (const id of S.inVilla) if (S.couples.filter((c) => c.a === id || c.b === id).length > 1) throw new Error(`day ${S.day}: ${id} in two couples`);
      if (hooks.onEpisode) hooks.onEpisode(S, out.episode);
    } else if (out.done) break;
  }
  if (S.phase !== 'done') throw new Error(`season did not finish (day ${S.day}, queue ${S.queue.map((q) => q.step).join(',')}, pending ${S.pending && S.pending.type})`);
  if (mode === 'producer') {
    if (!S.winner) throw new Error('producer season ended with no winner');
    if (S.couples.length < 2 || S.couples.length > 4) throw new Error(`final had ${S.couples.length} couples`);
  } else {
    const dumped = S.dumped.some((d) => d.id === 'me');
    if (!dumped && !S.winner) throw new Error('player survived but no final was played');
    const sc = playerScore(S); if (!(sc > 0)) throw new Error(`bad player score ${sc}`);
  }
  if (!S.awards) throw new Error('no awards');
  for (const v of Object.values(S.awards)) if (v && !S.cast[v]) throw new Error('award to unknown islander');
  // Round-trip through JSON like the save does.
  JSON.parse(JSON.stringify(S));
  return { S, decisions, seenTypes, days: S.day };
}

export async function runQA(G) {
  window.__QA_RUNNING = true;
  try { (await import('./analytics.js')).pause(); } catch { /* optional */ }
  const report = [], errors = [];
  const snapshot = Object.fromEntries(KEYS.map((k) => [k, localStorage.getItem(k)]));
  const realConfirm = window.confirm, realError = console.error;
  window.confirm = () => true;
  console.error = (...a) => { errors.push(a.map(String).join(' ')); realError.apply(console, a); };
  const onErr = (e) => errors.push(e.message || String(e.reason || e));
  window.addEventListener('error', onErr); window.addEventListener('unhandledrejection', onErr);
  const step = async (name, fn) => {
    const t0 = performance.now(); const before = errors.length;
    try { const extra = await fn(); report.push({ step: name, ok: errors.length === before, ms: Math.round(performance.now() - t0), error: errors.length > before ? errors[errors.length - 1] : '', extra: extra || '' }); }
    catch (e) { report.push({ step: name, ok: false, ms: Math.round(performance.now() - t0), error: e.message || String(e) }); }
  };
  try {
    await step('volume: 120 producer seasons, random decisions', async () => {
      const rng = makeRng('qa-producer'); const types = new Set(); let dec = 0;
      for (let i = 0; i < 120; i++) { const r = headlessSeason(`qa-p-${i}`, 'producer', rng); r.seenTypes.forEach((t) => types.add(t)); dec += r.decisions; }
      for (const t of ['firstCoupling', 'bombshellPick', 'couplePick', 'postcard', 'dumpPick']) if (!types.has(t)) throw new Error(`decision type never asked: ${t}`);
      return `${Math.round(dec / 120)} decisions/season · types: ${[...types].join(', ')}`;
    });
    await step('volume: 120 islander seasons, random decisions', async () => {
      const rng = makeRng('qa-islander'); const types = new Set(); let finals = 0, dumped = 0, wins = 0;
      const { playerAct } = await import('./islander/actions.js');
      const act = (S, r) => { for (let k = 0; k < 2; k++) { const opts = playerAct.options(S); if (!opts.length) break; const o = r.pick(opts); const res = playerAct.perform(S, o.id, o.targets ? r.pick(o.targets) : null, o.styles ? r.pick(o.styles) : null); if (res && res.text && BAD.test(res.text)) throw new Error(`bad action text: ${res.text.slice(0, 100)}`); } };
      for (let i = 0; i < 120; i++) { const r = headlessSeason(`qa-i-${i}`, 'islander', rng, { act }); r.seenTypes.forEach((t) => types.add(t)); if (r.S.dumped.some((d) => d.id === 'me')) dumped++; else { finals++; if (r.S.winner && (r.S.winner.a === 'me' || r.S.winner.b === 'me')) wins++; } }
      for (const t of ['actions', 'recouplePick', 'casaPick']) if (!types.has(t)) throw new Error(`decision type never asked: ${t}`);
      if (finals === 0) throw new Error('the player never reached a final in 120 seasons');
      if (dumped === 0) throw new Error('the player was never dumped in 120 seasons');
      return `${dumped} dumped · ${finals} finals · ${wins} wins · types: ${[...types].join(', ')}`;
    });
    await step('cast: 500 islanders have valid names, jobs and portraits', async () => {
      const rng = makeRng('qa-cast'); const { portraitSVG } = await import('./villa/portrait.js');
      for (let i = 0; i < 500; i++) { const b = makeBoard(rng, 1, 1); for (const p of [...b.women, ...b.men]) { if (!/^[A-Z][a-z]+/.test(p.name)) throw new Error(`bad name ${p.name}`); const svg = portraitSVG(p); if (BAD.test(svg) || !svg.startsWith('<svg')) throw new Error('bad portrait'); for (const v of Object.values(p.attrs)) if (!(v >= 1 && v <= 99)) throw new Error('attr out of range'); } }
    });
    if (G && G.home) {
      await step('ui: home renders', async () => { G.home(); await until(() => document.querySelectorAll('.mode-card').length >= 2, 2000, 'mode cards'); });
      await step('ui: producer cast board, pick 5+5, night one, three episodes', async () => {
        localStorage.removeItem('villa-producer-v1'); G.home(); await sleep(50);
        click('#mode-producer'); await until(() => has('.cast-card'), 3000, 'cast board');
        for (const tab of ['tab-f', 'tab-m']) {
          click(`#${tab}`); await sleep(30);
          for (let i = 0; i < 5; i++) { const c = $('.cast-card:not(.picked):not(.locked)'); if (!c) break; c.click(); await sleep(30); } // every click re-renders, so re-query
        }
        await until(() => has('#cast-go') && !$('#cast-go').disabled, 3000, 'cast go');
        click('#cast-go');
        await until(() => has('#ep-next') || has('.decision'), 4000, 'first episode');
        for (let i = 0; i < 12; i++) {
          if (has('.decision .opt')) { click('.decision .opt'); await sleep(60); if (has('#dec-confirm')) { await until(() => !$('#dec-confirm').disabled, 2000, 'confirm'); click('#dec-confirm'); } await sleep(120); continue; }
          if (has('#ep-skip')) { click('#ep-skip'); await sleep(60); }
          if (has('#ep-next')) { click('#ep-next'); await sleep(150); continue; }
          if (has('#season-card')) break;
          await sleep(120);
        }
        if (!has('#ep-next') && !has('.decision') && !has('#season-card') && !has('#ep-skip')) throw new Error('producer loop lost its place');
      });
      await step('ui: producer resume from saved season', async () => { G.home(); await until(() => has('#resume-producer'), 2000, 'resume card'); click('#resume-producer'); await until(() => has('#ep-next') || has('.decision') || has('#ep-skip'), 3000, 'resumed'); });
      await step('ui: islander create, first day, actions', async () => {
        localStorage.removeItem('villa-islander-v1');
        G.home(); await until(() => has('#mode-islander'), 2000, 'home');
        click('#mode-islander'); await until(() => has('#cr-name'), 3000, 'create screen');
        $('#cr-name').value = 'QA Tester'; $('#cr-name').dispatchEvent(new Event('input'));
        if (has('.arch-opt')) click('.arch-opt');
        await until(() => !$('#cr-go').disabled, 2000, 'create go'); click('#cr-go');
        await until(() => has('#meet-go'), 3000, 'meet screen'); click('#meet-go');
        await until(() => has('#ep-next') || has('.decision') || has('.act-btn'), 4000, 'day one');
        for (let i = 0; i < 14; i++) {
          if (has('.act-btn')) { click('.act-btn'); await sleep(60); if (has('.tgt-btn')) { click('.tgt-btn'); await sleep(60); } if (has('.line-btn')) { click('.line-btn'); await sleep(60); await until(() => has('#chat-done') || has('.line-btn'), 3000, 'chat result'); if (has('.line-btn')) click('.line-btn'); await until(() => has('#chat-done'), 3000, 'chat done'); click('#chat-done'); } await sleep(120); continue; }
          if (has('#day-go')) { click('#day-go'); await sleep(150); continue; }
          if (has('.decision .opt')) { click('.decision .opt'); await sleep(60); if (has('#dec-confirm')) { await until(() => !$('#dec-confirm').disabled, 2000, 'confirm'); click('#dec-confirm'); } await sleep(120); continue; }
          if (has('#ep-skip')) { click('#ep-skip'); await sleep(60); }
          if (has('#ep-next')) { click('#ep-next'); await sleep(150); continue; }
          await sleep(120);
        }
      });
      await step('ui: islander resume', async () => { G.home(); await until(() => has('#resume-islander'), 2000, 'resume card'); click('#resume-islander'); await until(() => has('#ep-next') || has('.decision') || has('.act-btn') || has('#day-go') || has('#ep-skip'), 3000, 'resumed'); });
      await step('ui: hall of islanders opens', async () => { G.home(); await until(() => has('#home-board'), 2000, 'home'); click('#home-board'); await until(() => has('.board-screen'), 3000, 'board'); });
      await step('ui: old-shape save does not crash home', async () => { localStorage.setItem('villa-islander-v1', JSON.stringify({ v: 0, day: 3 })); G.home(); await sleep(150); if (!has('.mode-card')) throw new Error('home missing'); });
    }
  } finally {
    window.removeEventListener('error', onErr); window.removeEventListener('unhandledrejection', onErr);
    window.confirm = realConfirm; console.error = realError;
    for (const [k, v] of Object.entries(snapshot)) { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); }
    window.__QA_RUNNING = false;
  }
  const ok = report.every((r) => r.ok);
  window.__QA_REPORT = report;
  if (G && G.home) { try { G.home(); } catch { /* ignore */ } }
  renderReport(report, ok);
  return { ok, report, errors };
}
function renderReport(report, ok) {
  const el = document.createElement('div');
  el.id = 'qa-report';
  el.style.cssText = 'position:fixed;inset:12px;z-index:9999;background:#1a0b14;color:#fff;overflow:auto;padding:16px;border-radius:14px;font:13px/1.5 ui-monospace,monospace;box-shadow:0 20px 60px rgba(0,0,0,.6)';
  el.innerHTML = `<div style="font-weight:800;font-size:18px;margin-bottom:8px">${ok ? '✅ QA passed' : '❌ QA failed'} · ${report.length} steps</div>` +
    report.map((r) => `<div style="padding:6px 0;border-top:1px solid rgba(255,255,255,.12)"><span>${r.ok ? '✅' : '❌'}</span> ${r.step} <span style="opacity:.6">${r.ms}ms</span>${r.extra ? `<div style="opacity:.75">${r.extra}</div>` : ''}${r.error ? `<div style="color:#ff8a94">${String(r.error).replace(/</g, '&lt;')}</div>` : ''}</div>`).join('') +
    `<button id="qa-close" style="margin-top:12px;padding:10px 16px;border-radius:10px;border:0;background:#ff5c8a;color:#fff;font-weight:700">Close</button>`;
  document.body.appendChild(el);
  el.querySelector('#qa-close').addEventListener('click', () => el.remove());
}
