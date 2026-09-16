# 💗 The Villa

A dating-show villa you can run or live in. Cast ten strangers, pick the bombshells, send the Casa Amor postcard and vote like the public; or build yourself an islander, walk in, pull people for chats, survive the recouplings and try to make the final. Twenty-two episodes a season, a decision nearly every night, and a card at the end built to be screenshotted.

**Play it now: https://the-villa-six.vercel.app** (add it to your phone's home screen from there).

Zero build step: plain HTML, CSS and ES modules, served by any static host. No accounts. Saves live in the browser. An optional free Supabase project turns the Hall of Islanders into a global leaderboard (see [DEPLOY.md](DEPLOY.md)).

## Play it on your laptop

Double-click `start.bat`. It starts a tiny local web server (Python, already installed) and opens the game at http://localhost:8090.

Or from a terminal in this folder:

```bash
python -m http.server 8090
```

The game loads modules with `fetch`, so it needs the little server; opening `index.html` from the file system will not work. To play on your phone, open `http://<your-laptop-ip>:8090` on the same Wi-Fi.

## Two modes

| Mode | What it is |
| --- | --- |
| **Run the Villa** (Producer) | Pick 5 girls and 5 boys from a board of 24. The season sims day by day: couplings, grafting, kisses, fire-pit rows, challenges, bombshells, Casa Amor, Movie Night, public votes, the final. You are the public: you choose bombshells, hand out dates and the Hideaway, send (or hold) the postcard, vote for favorite couples and decide who goes home. The season card names the winners, the envelope result and eight awards. |
| **Be an Islander** (Career) | Name yourself, pick your energy (twelve archetypes), your job and hometown, and how you enter: day one, or as the night-one bombshell who must be picked by the first recoupling. Every day you get two moves: pull someone for a chat (three lines, each in a style; what lands depends on who they are), the Beach Hut, breakfast for your partner, a kiss, the gym, laying low, or stirring the pot. Then the day plays out around you. You choose at recouplings, in Kiss-Marry-Pie, at Casa Amor (stick or twist), in dumping votes, and in the split-or-steal envelope if you win. Get dumped and you get an Aftersun card; make the final and you might take $100,000. |

## The season (22 days)

Day 1 arrivals and the first coupling, plus a bombshell before bed. Bombshell dates, a challenge, then the first recoupling on day 4 where the unpicked islander goes home. Two bombshells (you choose them), the Hideaway, the Heart Rate challenge, a safe recoupling, then the public's first vote where the islanders decide who leaves. A late bombshell and another recoupling with a dumping. Days 13-15 are Casa Amor: the boys leave, four bombshells enter each villa, the postcard lands (if you send it), and everyone sticks or twists at the fire pit. Movie Night replays what happened. Kiss-Marry-Pie, a public dumping, two late bombshells, the last recoupling, two more public votes to reach the final four, families visit, and the final: declarations, the winners, and the envelope.

## How the sim works

- Every islander has eight hidden attributes (`src/villa/cast.js`): looks, charm, humor, loyalty, drama, game, emotional IQ, openness. Twelve archetypes bias them (The Sweetheart, The Bombshell, The Game Player, The Loyal One, The Wildcard, The Class Clown, The Slow Burner, The Hopeless Romantic, The Player, The Peacemaker, The Firecracker, The Golden Retriever) and decide which chat styles land.
- Relationships are directional (`src/villa/model.js`): A's spark for B, A's trust in B, A's tension with B. Couple strength blends mutual spark, trust, days together and tension. Popularity is the public's opinion of each islander and moves with every scene.
- The engine (`src/villa/engine.js`) writes each day as a queue of steps. A step can stop to ask a question; in Producer mode the public's questions come to you, in Islander mode your islander's do, and everyone else is simulated. Evenings pick the most notable events: check-ins, first kisses, exclusivity talks, arguments, heads turning, Beach Hut confessions and gossip that travels.
- Recouplings (`preference`): each chooser weighs spark, trust, what the other person feels back, loyalty to a current partner, and a little strategy (game players like popular islanders). Bombshells pick first.
- Casa Amor tracks a "lean" for every coupled islander from loyalty, openness, couple strength and the best bombshell on offer; the postcard pushes the other villa's leans. Movie Night pulls its clips from what actually happened.
- Public votes rank couples by average popularity and strength with noise; in Producer mode your vote is a heavy thumb on the scale, so a close race goes your way and a landslide does not.
- Text (`src/villa/text.js`) is templates filled with live names. Fan captions ("what America is saying") react to the day's actual events. The tone is the group chat, not the tabloids.
- Islander score (`playerScore`): days in the villa, popularity, kisses, times picked, sticking at Casa, dates, plus finals and winner bonuses.

## QA before shipping

```bash
python tools/check.py
```

checks imports/exports, bracket balance, the service-worker shell list and stray brand strings. If `supabase/schema.sql` changed:

```bash
python tools/sqlcheck.py
```

Then open `http://localhost:8090/?qa=1` (about 20 seconds). It runs 120 headless seasons in each mode with random decisions, checks every scene and caption for bad tokens, validates 500 generated islanders, then clicks through both modes' screens and a resume from a save. Run the same URL on the live site after every deploy.

## Layout

```
index.html  styles.css  sw.js  manifest.webmanifest  icons/
src/main.js            shell: first run, home, Hall of Islanders, share, install
src/ui.js              shared widgets: cards, couple rows, episode player, decision screen, feed
src/villa/             the engine: rng, cast, portrait, model, text, challenges, engine
src/producer/ui.js     Run the Villa
src/islander/          Be an Islander: actions.js (chats and moves), ui.js (screens)
src/league*.js         Hall of Islanders (local until Supabase is configured)
src/analytics.js       fire-and-forget product analytics (off until Supabase is configured)
src/qa.js              the ?qa=1 smoke test
supabase/schema.sql    tables and guarded functions
tools/                 check.py, sqlcheck.py, make_icons.py
```

## Notes

Islander names, jobs and stories are invented; none is a real contestant. The show format it is inspired by is a trademark of its owners; this is a fan project.
