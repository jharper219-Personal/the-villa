// The cast: who walks into the villa. Every islander is generated from the season seed with a
// name, a job, a hometown, an archetype, eight hidden attributes and a "type on paper", so a
// cast board of twenty-four never repeats and every season has its own villain, sweetheart and
// wildcard. Names are invented; none is a real contestant.
import { clamp } from './rng.js';

export const ATTRS = ['looks', 'charm', 'funny', 'loyal', 'drama', 'game', 'eq', 'open'];
export const ATTR_LABEL = { looks: 'Looks', charm: 'Charm', funny: 'Humor', loyal: 'Loyalty', drama: 'Drama', game: 'Game', eq: 'Emotional IQ', open: 'Openness' };
export const ATTR_HINT = {
  looks: 'First impressions and heart-rate challenges', charm: 'How well they graft in a chat', funny: 'Laughs win couples and the public',
  loyal: 'How likely they stick when a bombshell walks in', drama: 'How much they stir, and how loud', game: 'Strategy: they know there is a vote',
  eq: 'Reading the room, handling the hard chats', open: 'How fast they open up (and how fast their head turns)',
};

export const F_NAMES = ['Ava', 'Mia', 'Sofia', 'Leilani', 'Jasmine', 'Kendall', 'Sienna', 'Brielle', 'Layla', 'Aaliyah', 'Savannah', 'Giselle', 'Talia', 'Noor', 'Priya', 'Simone', 'Marisol', 'Tatiana', 'Kiara', 'Destiny', 'Harper', 'Reese', 'Sloane', 'Elena', 'Daniela', 'Maya', 'Nia', 'Imani', 'Skye', 'Lexi', 'Paige', 'Autumn', 'Josie', 'Camryn', 'Alessia', 'Rhea', 'Ivy', 'Gigi', 'Bianca', 'Yasmin', 'Kenzie', 'Delilah', 'Zaria', 'Monique', 'Shay', 'Whitney', 'Carmen', 'Rosalie', 'Tessa', 'Angelina', 'Vivian', 'Jordyn', 'Brooke', 'Kali', 'Amara', 'Celeste', 'Dakota', 'Emerson', 'Farrah', 'Gabriela', 'Hazel', 'Isla', 'Juliette', 'Kinsley', 'Luna', 'Mackenzie', 'Nova', 'Ophelia', 'Peyton', 'Quinn', 'Raven', 'Selena', 'Tiana', 'Valentina', 'Willa', 'Ximena', 'Yara', 'Zoe'];
export const M_NAMES = ['Jayden', 'Miles', 'Marcus', 'Dante', 'Elijah', 'Tyler', 'Kai', 'Jordan', 'Andre', 'Nico', 'Mateo', 'Rome', 'Cassius', 'Kwame', 'Devin', 'Rafael', 'Trey', 'Isaiah', 'Xavier', 'Lorenzo', 'Cole', 'Zion', 'Malik', 'Jaxon', 'Brayden', 'Christian', 'Damian', 'Ezra', 'Theo', 'Julian', 'Brody', 'Kingston', 'Reid', 'Preston', 'Tobias', 'Silas', 'Enzo', 'Dominic', 'Cruz', 'Ace', 'Knox', 'Rocco', 'Levi', 'Adrian', 'Diego', 'Omar', 'Hakeem', 'Jerome', 'Bryce', 'Chase', 'Grant', 'Tanner', 'Hunter', 'Colby', 'Amir', 'Beau', 'Caleb', 'Dez', 'Emmanuel', 'Finn', 'Gabriel', 'Hayden', 'Ike', 'Jace', 'Kellan', 'Luca', 'Micah', 'Nate', 'Otis', 'Paulo', 'Quentin', 'Roman', 'Sebastian', 'Tristan', 'Vince', 'Wes', 'Yusuf', 'Zane'];
export const L_NAMES = ['Reyes', 'Carter', 'Brooks', 'Nguyen', 'Patel', 'Okafor', 'Martinez', 'Kim', 'Thompson', 'Rivera', 'Bennett', 'Foster', 'Delgado', 'Hayes', 'Jackson', 'Moreno', 'Singh', 'Ali', 'Washington', 'Price', 'Coleman', 'Ellis', 'Torres', 'Ramos', 'Hughes', 'Sullivan', 'Rossi', 'Marshall', 'Bishop', 'Dawson', 'Vega', 'Cruz', 'Lawson', 'Barnes', 'Fletcher', 'Holloway', 'Mendes', 'Osei', 'Petrov', 'Quinn', 'Romero', 'Santos', 'Tran', 'Underwood', 'Vance', 'Whitaker', 'Young', 'Zimmerman', 'Abara', 'Beaumont', 'Castillo', 'Duval', 'Everett', 'Ferreira', 'Grier', 'Huang', 'Iverson', 'Jimenez', 'Kaur', 'Lindqvist', 'Moss', 'Navarro', 'Oduya', 'Park', 'Reddy', 'Sato', 'Thorne', 'Valdez', 'Winters'];

export const JOBS = ['dental hygienist', 'personal trainer', 'content creator', 'ER nurse', 'real estate agent', 'pro soccer player', 'model', 'flight attendant', 'bartender', 'esthetician', 'medical device sales rep', 'firefighter', 'Pilates instructor', 'law student', 'software engineer', 'pediatric nurse', 'makeup artist', 'DJ', 'barber', 'former college football player', 'marketing coordinator', 'yoga instructor', 'hair stylist', 'aspiring actor', 'former cheerleader', 'boxer', 'financial analyst', 'wedding planner', 'vet tech', 'musician', 'entrepreneur', 'lifeguard', 'nightclub promoter', 'dog groomer', 'physical therapist', 'fashion buyer', 'chef', 'pharmacy tech', 'motorcycle mechanic', 'sneaker reseller', 'insurance broker', 'social media manager', 'kindergarten teacher', 'tattoo artist', 'basketball coach', 'skincare founder', 'construction project manager', 'radio host', 'bakery owner', 'flight nurse', 'crypto trader', 'plumber', 'ballroom dance teacher', 'travel agent', 'car salesman', 'nanny', 'accountant', 'surf instructor', 'paralegal', 'jewelry designer'];

export const HOMETOWNS = ['Miami, FL', 'Dallas, TX', 'Los Angeles, CA', 'Brooklyn, NY', 'Atlanta, GA', 'Phoenix, AZ', 'Charlotte, NC', 'Nashville, TN', 'Chicago, IL', 'Houston, TX', 'San Diego, CA', 'Boston, MA', 'Denver, CO', 'Tampa, FL', 'Las Vegas, NV', 'Philadelphia, PA', 'Detroit, MI', 'Seattle, WA', 'Orlando, FL', 'Jersey City, NJ', 'Austin, TX', 'New Orleans, LA', 'Scottsdale, AZ', 'Sacramento, CA', 'Baltimore, MD', 'Cleveland, OH', 'Minneapolis, MN', 'Salt Lake City, UT', 'Kansas City, MO', 'St. Louis, MO', 'Long Island, NY', 'Fort Lauderdale, FL', 'San Antonio, TX', 'Raleigh, NC', 'Portland, OR', 'Honolulu, HI', 'Columbus, OH', 'Richmond, VA', 'Oklahoma City, OK', 'Buffalo, NY', 'Toronto, Canada', 'London, UK', 'Sydney, Australia', 'San Juan, PR'];

export const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

/** Personality molds. `bias` nudges attributes; `likes` are the chat styles that land with them. */
export const ARCHETYPES = {
  sweetheart: { label: 'The Sweetheart', emoji: '🍯', bias: { loyal: 14, eq: 10, drama: -14, game: -10, open: 6 }, likes: ['honest', 'sweet'], tagline: 'Here for the right reasons, and means it.' },
  bombshell:  { label: 'The Bombshell', emoji: '💣', bias: { looks: 14, charm: 12, open: 10, loyal: -8, drama: 4 }, likes: ['flirty', 'confident'], tagline: 'Walks in, heads turn, couples wobble.' },
  gamer:      { label: 'The Game Player', emoji: '♟️', bias: { game: 18, charm: 8, eq: 6, loyal: -10, open: -4 }, likes: ['confident', 'honest'], tagline: 'Knows there is a vote. Never forgets it.' },
  loyal:      { label: 'The Loyal One', emoji: '🔒', bias: { loyal: 20, drama: -8, open: -8, game: -4, eq: 4 }, likes: ['honest', 'sweet'], tagline: 'Picks one person and plants a flag.' },
  wildcard:   { label: 'The Wildcard', emoji: '🃏', bias: { drama: 12, open: 12, funny: 8, game: -8, loyal: -6 }, likes: ['funny', 'flirty'], tagline: 'Nobody knows what happens next. Including them.' },
  clown:      { label: 'The Class Clown', emoji: '🤪', bias: { funny: 20, charm: 6, eq: -4, drama: 2, looks: -4 }, likes: ['funny', 'sweet'], tagline: 'Will not read the room. Will make the room laugh.' },
  slowburn:   { label: 'The Slow Burner', emoji: '🕯️', bias: { open: -16, loyal: 10, eq: 10, charm: -6, drama: -6 }, likes: ['honest', 'guarded'], tagline: 'Takes a week to open up. Worth it.' },
  romantic:   { label: 'The Hopeless Romantic', emoji: '🌹', bias: { open: 14, loyal: 8, eq: -6, drama: 6, game: -10 }, likes: ['sweet', 'flirty'], tagline: 'Falls fast, falls hard, writes it in the Beach Hut.' },
  player:     { label: 'The Player', emoji: '😏', bias: { charm: 14, looks: 8, loyal: -18, game: 8, open: 6 }, likes: ['flirty', 'confident'], tagline: 'Says all the right things. To everyone.' },
  peacemaker: { label: 'The Peacemaker', emoji: '🕊️', bias: { eq: 18, drama: -16, funny: 6, charm: 4, game: 2 }, likes: ['honest', 'sweet'], tagline: 'Fixes every fight at the fire pit but their own.' },
  firecracker:{ label: 'The Firecracker', emoji: '🧨', bias: { drama: 18, charm: 6, funny: 6, loyal: 4, eq: -6 }, likes: ['confident', 'funny'], tagline: 'Will pull you for a chat. Loudly.' },
  retriever:  { label: 'The Golden Retriever', emoji: '🐶', bias: { funny: 10, loyal: 10, eq: 6, game: -12, open: 8 }, likes: ['sweet', 'funny'], tagline: 'Happy to be here. Genuinely. It is a lot.' },
};
export const ARCH_KEYS = Object.keys(ARCHETYPES);

/** Chat styles the player (and the sim) can lead with. */
export const STYLES = ['flirty', 'honest', 'funny', 'sweet', 'confident', 'guarded'];
export const STYLE_LABEL = { flirty: 'Flirty', honest: 'Honest', funny: 'Funny', sweet: 'Sweet', confident: 'Confident', guarded: 'Guarded' };

/** "Type on paper" tags: what an islander has, and what they want. */
export const TAGS = {
  funny: 'makes me laugh', confident: 'confident', sweet: 'sweet', ambitious: 'ambitious', athletic: 'athletic', tall: 'tall',
  mature: 'emotionally mature', family: 'family-oriented', adventurous: 'adventurous', mysterious: 'a little mysterious', loyal: 'loyal',
  flirty: 'flirty', chill: 'chill', stylish: 'well-dressed', romantic: 'romantic', smart: 'smart', spontaneous: 'spontaneous', gym: 'a gym person',
};
const TAG_KEYS = Object.keys(TAGS);

const ICKS = ['claps when the plane lands', 'says "let\'s circle back" in real life', 'runs for the bus', 'orders for the table without asking', 'wears sunglasses indoors', 'chases a ping-pong ball', 'says "nom nom" out loud', 'takes a selfie with the fish they caught', 'calls their mom "mother"', 'gets excited about a pun', 'loses at Mario Kart and takes it personally', 'walks with a lanyard on', 'sings the wrong lyrics with confidence', 'asks the DJ for requests', 'wears a fanny pack unironically', 'brings a fork to a pizza', 'says "it is what it is" as a full answer', 'cheers at a movie theater', 'holds a tiny umbrella', 'gets a haircut and says "you can\'t even tell"'];
const FLAGS = ['has never been single for more than two weeks', 'still follows every ex', 'thinks a two-hour reply time is "fast"', 'says "I\'m not a texter"', 'has a group chat named after themselves', 'believes horoscopes but only the good parts', 'has been "about to start a podcast" for three years', 'brings up their ex on the first date', 'says "I\'m brutally honest" (mostly brutal)', 'ranks their friends', 'has a five-year plan with dates', 'thinks brunch is a personality', 'has moved cities for a situationship', 'takes a "break" every October', 'cries at every dog video and no funerals', 'considers a shared Spotify playlist a commitment', 'has ghosted "for their own good"', 'says "we\'ll see" and means no', 'keeps score in arguments', 'talks about the gym like it is a person'];
const FAME = ['went viral for a wrong-order rant', 'was a background dancer in a music video', 'once made a smoothie for a famous rapper', 'has a tattoo of their own name', 'was homecoming royalty twice', 'got on the jumbotron at a Lakers game and cried', 'has a nail polish shade named after them', 'won a hot dog eating contest by accident', 'was on a billboard in their hometown for a dentist', 'has 40,000 followers, mostly for their dog', 'sang the anthem at a minor-league game', 'beat a pro in a charity boxing match', 'has a signature drink at a bar back home', 'was on a daytime game show and lost in round one', 'once dated a guy who dated a Kardashian cousin', 'has never lost a game of Uno', 'was cut from a reality show casting twice', 'ran a marathon on a dare', 'has a fan page they did not make', 'was a child model for a cereal box'];
const PLANS = ['going in with an open heart', 'grafting from day one', 'finding a genuine connection', 'not being a game player, but knowing the game', 'keeping my options open until I can\'t', 'being the friend everyone comes to', 'standing on business', 'not settling in week one', 'saying yes to every date', 'staying loyal if the loyalty is returned', 'being honest even when it is awkward', 'finding my person and locking in'];
const QUOTES = {
  sweetheart: ['I lead with my heart. Probably too much.', 'I want someone who calls their grandma.', 'I\'m not here to play games. I\'m bad at them anyway.'],
  bombshell: ['I know why they called me in.', 'I\'m not here to make friends. I\'m here to make one person very nervous.', 'If your head turns, that\'s on you.'],
  gamer: ['Everyone here has a strategy. Mine\'s just better.', 'Genuine connection and a good vote count aren\'t opposites.', 'I read the room before I walk in it.'],
  loyal: ['When I\'m in, I\'m in.', 'I don\'t need a bombshell. I need consistency.', 'I\'ve never turned my head in my life.'],
  wildcard: ['I honestly don\'t know what I\'m going to do and neither do the producers.', 'Every day is a new personality for me.', 'I get bored easily. That\'s a warning.'],
  clown: ['If you\'re not laughing, I\'m not doing my job.', 'My love language is bits.', 'Romance is just comedy with eye contact.'],
  slowburn: ['Give me a week. I\'m worth the week.', 'I don\'t do fast. I do forever.', 'Trust is earned, not grafted.'],
  romantic: ['I fell in love in the airport lounge. Twice.', 'I\'ve planned the wedding. I just need the person.', 'I feel everything at full volume.'],
  player: ['Options are a good thing. Ask anyone.', 'I have a type. It\'s everyone.', 'I\'m loyal, I just haven\'t met the reason yet.'],
  peacemaker: ['Somebody has to be the adult in the villa.', 'I fix things. It\'s a gift and a curse.', 'I don\'t do drama. Drama does me.'],
  firecracker: ['I say what everyone\'s thinking, louder.', 'I will pull you for a chat. Bring water.', 'I\'m not dramatic. I\'m accurate.'],
  retriever: ['Best day ever. Every day. So far.', 'I just want everyone to have a nice time!', 'I fall for people who are nice to me. All of them.'],
};

/** Deterministic look for the SVG portrait. */
export const SKIN = ['#f6d5c1', '#efc3a6', '#e0a983', '#c98b62', '#a86a45', '#7d4b2e', '#5a3420'];
export const HAIR_COLORS = ['#1a1412', '#3b2a20', '#6b4a2e', '#a4703d', '#d5a15c', '#e6cf9a', '#8b1d1d', '#c9573f', '#2b2b2b', '#e8e2dc'];
export const F_HAIR = ['long', 'waves', 'bob', 'braids', 'ponytail', 'curls', 'bun', 'straight'];
export const M_HAIR = ['fade', 'curly', 'slick', 'buzz', 'waves', 'locs', 'quiff', 'messy'];
export const OUTFITS = ['#ff5c8a', '#ff8a5c', '#f7c548', '#42c9a5', '#4aa3ff', '#b46cff', '#ff4d6d', '#ffffff', '#111318', '#7bd389', '#f4a3c4', '#00b8d9'];
export const BGS = ['#ffb199,#ff0844', '#f6d365,#fda085', '#a18cd1,#fbc2eb', '#84fab0,#8fd3f4', '#fccb90,#d57eeb', '#ff9a9e,#fecfef', '#f093fb,#f5576c', '#4facfe,#00f2fe', '#43e97b,#38f9d7', '#fa709a,#fee140'];
const ACCESSORIES = ['none', 'none', 'hoops', 'shades', 'cap', 'chain', 'studs', 'headband', 'none'];

function attrRoll(rng, arch) {
  const a = {};
  for (const k of ATTRS) a[k] = clamp(Math.round(rng.gauss(58, 15) + (ARCHETYPES[arch].bias[k] || 0)), 12, 98);
  return a;
}
function tagsFor(rng, arch, attrs) {
  const has = new Set();
  if (attrs.funny >= 66) has.add('funny');
  if (attrs.charm >= 66) has.add('confident');
  if (attrs.loyal >= 68) has.add('loyal');
  if (attrs.eq >= 68) has.add('mature');
  if (attrs.open >= 68) has.add('flirty');
  if (attrs.drama <= 40) has.add('chill');
  if (attrs.looks >= 74) has.add('stylish');
  if (arch === 'sweetheart' || arch === 'retriever') has.add('sweet');
  if (arch === 'romantic') has.add('romantic');
  if (arch === 'gamer') has.add('ambitious');
  if (arch === 'slowburn') has.add('mysterious');
  if (arch === 'wildcard') has.add('spontaneous');
  while (has.size < 4) has.add(rng.pick(TAG_KEYS));
  const hasArr = [...has].slice(0, 5);
  const wants = new Set();
  const pref = { sweetheart: ['loyal', 'family'], bombshell: ['confident', 'stylish'], gamer: ['ambitious', 'smart'], loyal: ['loyal', 'mature'], wildcard: ['spontaneous', 'funny'], clown: ['funny', 'chill'], slowburn: ['mature', 'loyal'], romantic: ['romantic', 'sweet'], player: ['flirty', 'gym'], peacemaker: ['mature', 'sweet'], firecracker: ['confident', 'funny'], retriever: ['sweet', 'adventurous'] }[arch];
  wants.add(rng.pick(pref));
  while (wants.size < 3) wants.add(rng.pick(TAG_KEYS));
  return { has: hasArr, wants: [...wants] };
}

let uid = 0;
export function makeIslander(rng, gender, used, opts = {}) {
  const first = pickUnique(rng, gender === 'f' ? F_NAMES : M_NAMES, used);
  const last = rng.pick(L_NAMES);
  const arch = opts.arch || rng.pick(ARCH_KEYS);
  const attrs = opts.attrs || attrRoll(rng, arch);
  const { has, wants } = tagsFor(rng, arch, attrs);
  const look = {
    skin: rng.int(0, SKIN.length - 1), hair: rng.int(0, HAIR_COLORS.length - 1),
    style: rng.int(0, (gender === 'f' ? F_HAIR : M_HAIR).length - 1), outfit: rng.int(0, OUTFITS.length - 1),
    bg: rng.int(0, BGS.length - 1), acc: rng.pick(ACCESSORIES), eye: rng.int(0, 3), brow: rng.int(0, 2), freckles: rng.chance(0.18),
  };
  return {
    id: opts.id || `${gender}${++uid}_${first.toLowerCase()}`,
    name: first, last, gender, age: opts.age || rng.int(21, 31),
    job: opts.job || rng.pick(JOBS), home: opts.home || rng.pick(HOMETOWNS), sign: rng.pick(SIGNS),
    arch, attrs, has, wants, look,
    bio: {
      ick: rng.pick(ICKS), flag: rng.pick(FLAGS), fame: rng.pick(FAME), plan: rng.pick(PLANS), quote: rng.pick(QUOTES[arch]),
    },
    bombshell: !!opts.bombshell,
    player: !!opts.player,
  };
}
function pickUnique(rng, pool, used) {
  for (let i = 0; i < 60; i++) { const n = rng.pick(pool); if (!used.has(n)) { used.add(n); return n; } }
  const n = `${rng.pick(pool)} ${rng.pick('BCDJKLMNRST'.split(''))}.`; used.add(n); return n;
}

/** A board to cast from: `nf` women and `nm` men, archetypes spread so every board has range. */
export function makeBoard(rng, nf, nm) {
  const used = new Set();
  const spread = (n) => { const ks = rng.shuffle(ARCH_KEYS); const out = []; for (let i = 0; i < n; i++) out.push(ks[i % ks.length]); return rng.shuffle(out); };
  const fa = spread(nf), ma = spread(nm);
  return {
    women: fa.map((arch) => makeIslander(rng, 'f', used, { arch })),
    men: ma.map((arch) => makeIslander(rng, 'm', used, { arch })),
  };
}
/** Bombshells are cast to be a little more striking than the OGs. */
export function makeBombshell(rng, gender, used, opts = {}) {
  const arch = opts.arch || rng.weighted([[3, 'bombshell'], [2, 'player'], [2, 'wildcard'], [1, 'firecracker'], [1, 'romantic'], [1, 'gamer'], [1, 'sweetheart'], [1, 'clown']]);
  const b = makeIslander(rng, gender, used, Object.assign({ arch, bombshell: true }, opts));
  b.attrs.looks = clamp(b.attrs.looks + 8, 12, 99);
  b.attrs.charm = clamp(b.attrs.charm + 5, 12, 99);
  return b;
}

/** How well A's wants line up with what B has, 0..1. */
export function typeMatch(a, b) {
  const hit = a.wants.filter((w) => b.has.includes(w)).length;
  return hit / a.wants.length;
}
/** A's initial pull toward B, 0..100. Looks, type on paper, charm, and a little chaos. */
export function initialSpark(rng, a, b) {
  const base = 22 + b.attrs.looks * 0.28 + b.attrs.charm * 0.14 + typeMatch(a, b) * 26 + (a.attrs.open - 50) * 0.12;
  return clamp(Math.round(base + rng.gauss(0, 9)), 8, 92);
}
/** Overall "villa rating" shown on cards: a blend the public would feel. */
export function starPower(p) {
  const a = p.attrs;
  return Math.round(a.looks * 0.3 + a.charm * 0.25 + a.funny * 0.2 + a.eq * 0.1 + a.drama * 0.08 + a.game * 0.07);
}
export const fullName = (p) => `${p.name} ${p.last}`;
export const pronoun = (p) => (p.gender === 'f' ? { they: 'she', them: 'her', their: 'her', theirs: 'hers', They: 'She', Them: 'Her', Their: 'Her', plural: false } : { they: 'he', them: 'him', their: 'his', theirs: 'his', They: 'He', Them: 'Him', Their: 'His', plural: false });
export const noun = (p) => (p.gender === 'f' ? 'girl' : 'boy');
export const nounPl = (g) => (g === 'f' ? 'girls' : 'boys');
export const other = (g) => (g === 'f' ? 'm' : 'f');
export const typeOnPaper = (p) => p.wants.map((w) => TAGS[w]).join(', ');
/** The three attributes worth showing on a card, best first. */
export function topAttrs(p, n = 3) { return ATTRS.slice().sort((x, y) => p.attrs[y] - p.attrs[x]).slice(0, n); }
export const archLabel = (p) => ARCHETYPES[p.arch].label;
export const archEmoji = (p) => ARCHETYPES[p.arch].emoji;
export const tier = (v) => (v >= 85 ? 'elite' : v >= 72 ? 'great' : v >= 58 ? 'good' : v >= 44 ? 'avg' : 'low');
