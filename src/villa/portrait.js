// Flat, sunny SVG portraits built from an islander's `look`. Deterministic, so the same
// islander always has the same face on every card, feed item and leaderboard row.
import { SKIN, HAIR_COLORS, F_HAIR, M_HAIR, OUTFITS, BGS } from './cast.js';

const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, v + amt));
  return `#${((f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0')}`;
};

function hairBack(style, color) {
  switch (style) {
    case 'long': return `<path d="M22 44 C18 62 18 86 22 96 L78 96 C82 86 82 62 78 44 C70 26 30 26 22 44Z" fill="${color}"/>`;
    case 'waves': return `<path d="M20 46 C14 66 22 80 18 96 L82 96 C78 80 86 66 80 46 C72 26 28 26 20 46Z" fill="${color}"/>`;
    case 'braids': return `<path d="M24 44 C20 60 22 84 24 96 L76 96 C78 84 80 60 76 44 C70 26 30 26 24 44Z" fill="${color}"/><path d="M28 60 L28 96 M36 66 L36 96 M64 66 L64 96 M72 60 L72 96" stroke="${shade(color, 22)}" stroke-width="2" fill="none"/>`;
    case 'curls': return `<path d="M18 50 C12 66 16 84 22 92 L78 92 C84 84 88 66 82 50 C74 24 26 24 18 50Z" fill="${color}"/>`;
    case 'ponytail': return `<path d="M60 30 C82 34 88 60 80 84 C74 78 70 60 62 50Z" fill="${color}"/>`;
    case 'locs': return `<path d="M22 44 C18 62 18 84 22 92 L78 92 C82 84 82 62 78 44 C70 26 30 26 22 44Z" fill="${color}"/><path d="M30 56 L30 92 M40 60 L40 92 M50 62 L50 92 M60 60 L60 92 M70 56 L70 92" stroke="${shade(color, 26)}" stroke-width="3" fill="none"/>`;
    default: return '';
  }
}
function hairFront(style, color) {
  const c = color;
  switch (style) {
    case 'long': case 'straight': return `<path d="M24 46 C24 24 76 24 76 46 C68 40 60 36 50 36 C40 36 32 40 24 46Z" fill="${c}"/>`;
    case 'waves': return `<path d="M22 48 C22 22 78 22 78 48 C70 38 62 44 50 34 C40 44 30 38 22 48Z" fill="${c}"/>`;
    case 'bob': return `<path d="M22 46 C22 24 78 24 78 46 L78 66 C74 64 72 58 70 54 C64 42 36 42 30 54 C28 58 26 64 22 66Z" fill="${c}"/>`;
    case 'braids': return `<path d="M24 46 C24 26 76 26 76 46 C66 38 34 38 24 46Z" fill="${c}"/>`;
    case 'ponytail': return `<path d="M26 46 C26 26 74 26 74 46 C64 36 36 36 26 46Z" fill="${c}"/>`;
    case 'curls': return `<path d="M20 50 C18 22 82 22 80 50 C72 36 62 42 50 34 C38 42 28 36 20 50Z" fill="${c}"/><circle cx="24" cy="48" r="6" fill="${c}"/><circle cx="76" cy="48" r="6" fill="${c}"/>`;
    case 'bun': return `<path d="M26 46 C26 28 74 28 74 46 C64 38 36 38 26 46Z" fill="${c}"/><circle cx="50" cy="22" r="10" fill="${c}"/>`;
    case 'fade': return `<path d="M27 44 C27 28 73 28 73 44 C64 38 36 38 27 44Z" fill="${c}"/>`;
    case 'buzz': return `<path d="M28 44 C28 30 72 30 72 44 C64 39 36 39 28 44Z" fill="${c}" opacity="0.85"/>`;
    case 'curly': return `<path d="M24 46 C22 22 78 22 76 46 C70 36 62 40 50 32 C38 40 30 36 24 46Z" fill="${c}"/><circle cx="30" cy="30" r="6" fill="${c}"/><circle cx="70" cy="30" r="6" fill="${c}"/><circle cx="50" cy="24" r="6" fill="${c}"/>`;
    case 'slick': return `<path d="M26 44 C28 26 76 24 74 44 C62 34 40 40 26 44Z" fill="${c}"/>`;
    case 'quiff': return `<path d="M26 44 C24 30 44 14 64 26 C74 30 76 40 74 46 C62 36 40 40 26 44Z" fill="${c}"/>`;
    case 'locs': return `<path d="M24 46 C24 24 76 24 76 46 C66 38 34 38 24 46Z" fill="${c}"/>`;
    case 'messy': return `<path d="M24 46 C22 26 40 22 50 28 C60 20 78 26 76 46 C66 38 34 38 24 46Z" fill="${c}"/>`;
    default: return `<path d="M26 44 C26 26 74 26 74 44 C64 36 36 36 26 44Z" fill="${c}"/>`;
  }
}
function accessory(acc, skin) {
  switch (acc) {
    case 'hoops': return `<circle cx="29" cy="60" r="4" fill="none" stroke="#f5c542" stroke-width="1.6"/><circle cx="71" cy="60" r="4" fill="none" stroke="#f5c542" stroke-width="1.6"/>`;
    case 'studs': return `<circle cx="29" cy="58" r="1.8" fill="#fff"/><circle cx="71" cy="58" r="1.8" fill="#fff"/>`;
    case 'shades': return `<path d="M30 48 h16 a4 4 0 0 1 4 4 v3 a5 5 0 0 1 -5 5 h-10 a5 5 0 0 1 -5 -5 Z M54 48 h16 a4 4 0 0 1 4 4 v3 a5 5 0 0 1 -5 5 h-10 a5 5 0 0 1 -5 -5 Z" fill="#1b1b22" opacity="0.92"/><path d="M46 51 h8" stroke="#1b1b22" stroke-width="2"/>`;
    case 'cap': return `<path d="M24 40 C26 20 74 20 76 40 Z" fill="#111318"/><path d="M20 40 h60 a3 3 0 0 1 0 6 h-60 a3 3 0 0 1 0 -6Z" fill="#0a0b0e"/>`;
    case 'chain': return `<path d="M36 86 C42 96 58 96 64 86" fill="none" stroke="#f5c542" stroke-width="2"/>`;
    case 'headband': return `<path d="M25 42 C30 34 70 34 75 42" fill="none" stroke="#ff5c8a" stroke-width="4"/>`;
    default: return skin ? '' : '';
  }
}

export function portraitSVG(p, size = 96) {
  const L = p.look || {};
  const skin = SKIN[L.skin ?? 2], hair = HAIR_COLORS[L.hair ?? 1], outfit = OUTFITS[L.outfit ?? 0];
  const style = (p.gender === 'f' ? F_HAIR : M_HAIR)[L.style ?? 0];
  const [bg1, bg2] = (BGS[L.bg ?? 0] || BGS[0]).split(',');
  const id = `pg${(p.id || 'x').replace(/[^a-z0-9]/gi, '')}`;
  const eyeY = 54, mouth = ['M42 70 Q50 78 58 70', 'M42 71 Q50 76 58 71', 'M43 72 Q50 74 57 72', 'M41 70 Q50 80 59 70'][L.eye ?? 0];
  const lips = p.gender === 'f' ? '#d1495b' : shade(skin, -40);
  const brow = shade(hair, -10);
  const browY = [46, 45, 47][L.brow ?? 0];
  const lashes = p.gender === 'f' ? `<path d="M38 ${eyeY - 4} q5 -3 10 0 M52 ${eyeY - 4} q5 -3 10 0" stroke="#1b1b22" stroke-width="1.6" fill="none"/>` : '';
  const freck = L.freckles ? `<g fill="${shade(skin, -45)}" opacity="0.7"><circle cx="40" cy="62" r="0.9"/><circle cx="44" cy="64" r="0.9"/><circle cx="56" cy="64" r="0.9"/><circle cx="60" cy="62" r="0.9"/><circle cx="48" cy="66" r="0.9"/></g>` : '';
  const top = p.gender === 'f'
    ? `<path d="M30 100 C34 84 44 80 50 88 C56 80 66 84 70 100Z" fill="${outfit}"/><path d="M42 84 L38 100 M58 84 L62 100" stroke="${outfit}" stroke-width="3"/>`
    : `<path d="M22 100 C26 86 38 82 50 84 C62 82 74 86 78 100Z" fill="${outfit}"/><path d="M44 84 C46 90 54 90 56 84" fill="${skin}"/>`;
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="pf">
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient><clipPath id="${id}c"><circle cx="50" cy="50" r="50"/></clipPath></defs>
  <g clip-path="url(#${id}c)">
    <rect width="100" height="100" fill="url(#${id})"/>
    ${hairBack(style, hair)}
    <path d="M18 100 C20 86 32 80 50 80 C68 80 80 86 82 100Z" fill="${skin}"/>
    ${top}
    <rect x="43" y="68" width="14" height="16" fill="${skin}"/>
    <ellipse cx="50" cy="54" rx="21" ry="25" fill="${skin}"/>
    <ellipse cx="29" cy="56" rx="3.5" ry="5" fill="${skin}"/><ellipse cx="71" cy="56" rx="3.5" ry="5" fill="${skin}"/>
    ${freck}
    <path d="M36 ${browY} q6 -3 12 0 M52 ${browY} q6 -3 12 0" stroke="${brow}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <ellipse cx="42" cy="${eyeY}" rx="3.2" ry="3.6" fill="#fff"/><ellipse cx="58" cy="${eyeY}" rx="3.2" ry="3.6" fill="#fff"/>
    <circle cx="42.6" cy="${eyeY + 0.4}" r="2" fill="#2a1d18"/><circle cx="58.6" cy="${eyeY + 0.4}" r="2" fill="#2a1d18"/>
    <circle cx="43.4" cy="${eyeY - 0.6}" r="0.7" fill="#fff"/><circle cx="59.4" cy="${eyeY - 0.6}" r="0.7" fill="#fff"/>
    ${lashes}
    <path d="M50 58 q-2 5 1 6" stroke="${shade(skin, -40)}" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="${mouth}" stroke="${lips}" stroke-width="2.4" fill="${p.gender === 'f' ? lips : 'none'}" stroke-linecap="round" opacity="${p.gender === 'f' ? 0.9 : 1}"/>
    <ellipse cx="36" cy="64" rx="4" ry="2.2" fill="#ff8a94" opacity="0.28"/><ellipse cx="64" cy="64" rx="4" ry="2.2" fill="#ff8a94" opacity="0.28"/>
    ${hairFront(style, hair)}
    ${accessory(L.acc, skin)}
  </g>
</svg>`;
}
export const face = (p, cls = '', size = 96) => `<span class="pfw ${cls}">${portraitSVG(p, size)}</span>`;
