// The Hall of Islanders: usernames and posted islander runs.
//
// Two implementations behind one interface:
//   local  — localStorage on this device (default until Supabase is configured)
//   global — Supabase RPC functions defined in supabase/schema.sql
//
// Interface (all async):
//   check(display)                 -> { ok, reason? }
//   claim(display, token)          -> { ok, reason?, display, handle }
//   touch(handle, token)           -> { ok }
//   postRun(handle, token, run)    -> { ok, rank? }
//   board(limit)                   -> run[] best first
//   mine(handle)                   -> run[] newest first
import { LEAGUE } from './league-config.js';

const configured = !!(LEAGUE && LEAGUE.url && LEAGUE.anonKey && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(LEAGUE.url.replace(/\/$/, '')));
export const LEAGUE_MODE = configured ? 'global' : 'local';
export const validHandle = (s) => /^[A-Za-z0-9_]{3,16}$/.test(String(s || '').trim());
export const handleKey = (s) => String(s || '').trim().toLowerCase();

const H_A = ['Sunny', 'Loyal', 'Petty', 'Iconic', 'Soft', 'Chaotic', 'Golden', 'Sneaky', 'Humble', 'Glossy', 'Salty', 'Dreamy', 'Fiery', 'Cozy', 'Bold', 'Sassy', 'Lowkey', 'Vintage', 'Peachy', 'Moody'];
const H_B = ['Bombshell', 'Islander', 'Grafter', 'Firepit', 'Daybed', 'Terrace', 'Sundress', 'Villa', 'Postcard', 'Hideaway', 'Romantic', 'Wildcard', 'Snack', 'Cutie', 'Legend', 'Menace', 'Sweetie', 'Queen', 'Icon', 'Muse'];
const H_PAIRS = H_A.flatMap((a) => H_B.map((b) => `${a}${b}`)).filter((s) => s.length <= 14);
export function handleSuggestion(rng) { return `${rng.pick(H_PAIRS)}${rng.int(2, 99)}`; }

// ---------- local ----------
const LS_KEY = 'villa-runs-local-v1';
function readDb() { try { return Object.assign({ users: {}, runs: [] }, JSON.parse(localStorage.getItem(LS_KEY) || '{}')); } catch { return { users: {}, runs: [] }; } }
function writeDb(db) { try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch { /* ignore */ } }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const sortBoard = (runs) => runs.slice().sort((a, b) => b.score - a.score || b.days - a.days || String(a.created_at).localeCompare(String(b.created_at)));

const local = {
  async check(display) { await wait(40); if (!validHandle(display)) return { ok: false, reason: 'format' }; const k = handleKey(display); return readDb().users[k] ? { ok: false, reason: 'taken', recoverable: true } : { ok: true }; },
  async claim(display, token) {
    await wait(80);
    if (!validHandle(display)) return { ok: false, reason: 'format' };
    const k = handleKey(display), db = readDb(), u = db.users[k];
    if (!u) { db.users[k] = { display: String(display).trim(), token, created_at: new Date().toISOString() }; writeDb(db); return { ok: true, display: db.users[k].display, handle: k }; }
    if (u.token !== token) { u.token = token; writeDb(db); return { ok: true, display: u.display, handle: k, recovered: true }; }
    return { ok: true, display: u.display, handle: k };
  },
  async touch() { return { ok: true }; },
  async postRun(handle, token, run) {
    await wait(120);
    const db = readDb(), k = handleKey(handle);
    const row = Object.assign({}, run, { handle: k, display: (db.users[k] || {}).display || handle, created_at: new Date().toISOString(), id: `${Date.now()}` });
    db.runs.push(row); db.runs = sortBoard(db.runs).slice(0, 500); writeDb(db);
    return { ok: true, rank: sortBoard(db.runs).findIndex((r) => r.id === row.id) + 1 };
  },
  async board(limit = 100) { return sortBoard(readDb().runs).slice(0, limit); },
  async mine(handle) { const k = handleKey(handle); return readDb().runs.filter((r) => r.handle === k).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))); },
};

// ---------- global ----------
export async function rpc(fn, args) {
  const base = LEAGUE.url.replace(/\/$/, '');
  const res = await fetch(`${base}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json', apikey: LEAGUE.anonKey }, /^eyJ/.test(LEAGUE.anonKey) ? { Authorization: `Bearer ${LEAGUE.anonKey}` } : {}),
    body: JSON.stringify(args || {}),
  });
  if (!res.ok) { const text = await res.text().catch(() => ''); throw new Error(`${fn}: HTTP ${res.status} ${text.slice(0, 200)}`); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
const remote = {
  check: (display) => rpc('vl_check', { p_handle: String(display || '').trim() }),
  claim: (display, token) => rpc('vl_claim', { p_handle: String(display || '').trim(), p_token: token }),
  touch: (handle, token) => rpc('vl_touch', { p_handle: handleKey(handle), p_token: token }),
  postRun: (handle, token, run) => rpc('vl_post_run', { p_handle: handleKey(handle), p_token: token, p_run: run }),
  board: async (limit = 100) => (await rpc('vl_board', { p_limit: limit })) || [],
  mine: async (handle) => (await rpc('vl_mine', { p_handle: handleKey(handle) })) || [],
};

export const league = configured ? remote : local;
