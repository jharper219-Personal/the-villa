// Product analytics. Fire-and-forget: every call is wrapped, nothing is awaited on a path the
// player waits for, and a dead network or a missing table costs one silent catch. Events batch
// in memory and flush every few seconds, when the tab hides, and on the next load if needed.
//
// What leaves the device: a random device id, a session id, event names with small property
// bags, first-touch acquisition (utm / referrer host), coarse platform, and the player's public
// username once they claim one. No names, emails, IPs or raw user agents.
import { LEAGUE } from './league-config.js';

const DEV_KEY = 'villa-an-device', SES_KEY = 'villa-an-session', QUEUE_KEY = 'villa-an-queue', ACQ_KEY = 'villa-an-acq', OFF_KEY = 'villa-an-off';
const SESSION_GAP_MS = 30 * 60 * 1000, FLUSH_MS = 12000, FLUSH_AT = 20, MAX_QUEUE = 200;
const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }, del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } } };
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));

let on = false, version = '', handle = null, deviceId = null, session = null, acq = null, queue = [], timer = null, lastScreen = '', hardFails = 0, paused = false;

function platform() { const ua = navigator.userAgent || ''; if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'; if (/Android/i.test(ua)) return 'android'; if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) return 'desktop'; return 'other'; }
const installMode = () => ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone ? 'standalone' : 'browser');
function acquisition() {
  const saved = ls.get(ACQ_KEY); if (saved) { try { return JSON.parse(saved); } catch { /* re-derive */ } }
  let q = new URLSearchParams(); try { q = new URLSearchParams(location.search); } catch { /* ignore */ }
  let referrer = ''; try { referrer = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : ''; } catch { referrer = ''; }
  if (referrer === location.hostname) referrer = '';
  const a = { source: (q.get('utm_source') || (referrer || 'direct')).slice(0, 40), medium: (q.get('utm_medium') || (referrer ? 'referral_web' : 'none')).slice(0, 40), campaign: (q.get('utm_campaign') || '').slice(0, 60), referrer };
  ls.set(ACQ_KEY, JSON.stringify(a)); return a;
}
function openSession() {
  const now = Date.now(); let s = null; try { s = JSON.parse(ls.get(SES_KEY) || 'null'); } catch { s = null; }
  if (!s || !s.id || now - (s.last || 0) > SESSION_GAP_MS) s = { id: uuid(), started: now, last: now, fresh: true }; else s.fresh = false;
  s.last = now; session = s; ls.set(SES_KEY, JSON.stringify({ id: s.id, started: s.started, last: s.last })); return s;
}
const loadQueue = () => { try { const q = JSON.parse(ls.get(QUEUE_KEY) || '[]'); return Array.isArray(q) ? q.slice(-MAX_QUEUE) : []; } catch { return []; } };
const saveQueue = () => (queue.length ? ls.set(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE))) : ls.del(QUEUE_KEY));
const envelope = (events) => ({ d: deviceId, s: session ? session.id : null, v: version, h: handle || null, dev: Object.assign({ platform: platform(), install: installMode(), tz: -new Date().getTimezoneOffset() }, acq), e: events });
async function send(events, keepalive) {
  const base = String(LEAGUE.url || '').replace(/\/$/, '');
  const res = await fetch(`${base}/rest/v1/rpc/an_ingest`, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', apikey: LEAGUE.anonKey }, /^eyJ/.test(LEAGUE.anonKey) ? { Authorization: `Bearer ${LEAGUE.anonKey}` } : {}), body: JSON.stringify({ p: envelope(events) }), keepalive: !!keepalive, cache: 'no-store' });
  if (!res.ok) throw new Error(`an_ingest ${res.status}`);
}
export async function flush(keepalive = false) {
  if (!on || !queue.length || hardFails >= 3) return;
  const batch = queue.splice(0, 50); saveQueue();
  try { await send(batch, keepalive); hardFails = 0; }
  catch { queue = batch.concat(queue).slice(-MAX_QUEUE); saveQueue(); hardFails++; }
}
export function track(name, props = {}) {
  if (!on || paused) return;
  try {
    const clean = {}; for (const [k, v] of Object.entries(props || {})) if (v != null && (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string')) clean[k.slice(0, 32)] = typeof v === 'string' ? v.slice(0, 80) : v;
    queue.push({ n: String(name).slice(0, 40), p: clean, t: Date.now(), sc: lastScreen });
    if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
    saveQueue();
    if (queue.length >= FLUSH_AT) flush(); else if (!timer) timer = setTimeout(() => { timer = null; flush(); }, FLUSH_MS);
  } catch { /* never let analytics break the game */ }
}
export function screen(name) { if (name === lastScreen) return; lastScreen = name; track('screen', { name }); }
export function setHandle(h) { handle = h ? String(h).slice(0, 16) : null; }
export function pause() { paused = true; }
export function resume() { paused = false; }
export function init({ version: v = '', handle: h = null } = {}) {
  try {
    if (ls.get(OFF_KEY) === '1' || !LEAGUE.url || !LEAGUE.anonKey || window.__QA_RUNNING) return;
    version = v; handle = h && h.key ? h.key : (typeof h === 'string' ? h : null);
    deviceId = ls.get(DEV_KEY) || (ls.set(DEV_KEY, uuid()), ls.get(DEV_KEY));
    acq = acquisition(); openSession(); queue = loadQueue(); on = true;
    track(session.fresh ? 'session_start' : 'session_resume', { install: installMode() });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true); });
    window.addEventListener('pagehide', () => flush(true));
  } catch { on = false; }
}
