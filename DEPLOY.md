# Publishing The Villa

The game is a static site (no build step, no server code). It is its own project, separate from
The Blitz: its own GitHub repo, its own Vercel project, its own Supabase project. Nothing here
touches the other game's saves, database or URL.

This folder is already a git repo with `main` checked out and the commit author set to
`jharper219-Personal`, which is the account Vercel accepts.

## 1. GitHub (two minutes)

1. Open https://github.com/new (signed in as **jharper219-Personal**).
2. Repository name: `the-villa`. Leave it **Public** or Private, your call.
3. Do **not** tick "Add a README", ".gitignore" or "license" (this folder already has them).
4. Click **Create repository**, then run from this folder:

```bash
git remote add origin https://github.com/jharper219-Personal/the-villa.git
```

```bash
git push -u origin main
```

A browser window may open to sign in the first time. (`bash publish.sh jharper219-Personal` does the same two steps.)

## 2. Vercel (two minutes)

1. Go to https://vercel.com/new and pick **Import Git Repository** → `the-villa`.
2. Framework preset: **Other**. Build command: **leave empty**. Output directory: **leave empty**. Root directory: leave as is.
3. Click **Deploy**.

Done on 2026-09-16: the game lives at **https://the-villa-six.vercel.app** (Vercel added `-six` because `the-villa` was taken; you can pick a nicer name under Project → Settings → Domains). Every `git push` redeploys automatically. Open https://the-villa-six.vercel.app/?qa=1 after a deploy to run the smoke test on the live site.

## 3. Supabase (five minutes, optional but recommended)

Without it the game works fully, but the Hall of Islanders only shows runs from the same phone or laptop, and there are no analytics. With it, everyone with the link posts to one board.

1. Go to https://supabase.com → **New project**. Name it `the-villa`, pick the region nearest you, set a database password (you will not need it again). Wait about a minute.
2. Left sidebar → **SQL Editor** → **New query**. Open `supabase/schema.sql` from this folder, paste all of it, click **Run**. You should see "Success. No rows returned." Re-running it later is always safe.
3. **Project Settings → API**. Copy the **Project URL** (`https://xxxx.supabase.co`) and the **publishable** key (starts `sb_publishable_`) or the legacy **anon public** key (starts `eyJ`). Never the secret / service_role key.
4. Open `src/league-config.js` and fill in both values:

```js
export const LEAGUE = {
  url: 'https://xxxx.supabase.co',
  anonKey: 'sb_publishable_...',
};
```

5. Bump `VERSION` in `sw.js` (`villa-v1` → `villa-v2`) so installed phones refresh, then:

```bash
git add -A && git commit -m "Connect the Hall of Islanders" && git push
```

Open the game: the Hall of Islanders button now says **global board**.

The key is meant to be public. It can only call the `vl_*` and `an_*` functions in the schema; row level security stops anyone reading or writing the tables directly, and every write checks the username's secret token (hashed in the database).

### What the database holds

- `vl_users`: usernames (unique, case-insensitive) and a hashed secret per device. A username quiet for 7 days can be reclaimed by whoever types it.
- `vl_runs`: one row per posted islander run: name, archetype, entry, days, result, score, popularity, kisses, the portrait look, the season code.
- `an_events`: analytics events with a random device id, session id, screen, platform, install mode and first-touch source. Views `an_daily` and `an_funnel` summarize them.

Commissioner snippets (rename a rude username, delete a run) are at the bottom of `supabase/schema.sql`.

## Put it on your phone

- **iPhone (Safari):** open the link → Share → **Add to Home Screen**.
- **Android (Chrome):** open the link → tap **Install** on the home screen, or menu → **Install app**.

It launches full screen with its own icon and works offline after the first load.

## Updating

Edit, run `python tools/check.py` and the `?qa=1` test locally, commit, push. The service worker is network-first, so players get the new version on their next launch. If you ship a change to the save shape, bump `VERSION` in `sw.js`.

## If a push does not deploy

Vercel only builds commits whose author matches the account owner. This repo commits as
`jharper219-Personal <325723743+jharper219-Personal@users.noreply.github.com>`. If it ever changes:

```bash
git config user.name "jharper219-Personal" && git config user.email "325723743+jharper219-Personal@users.noreply.github.com"
```

## Cost

Vercel Hobby is free for non-commercial projects. Supabase free tier: 500 MB database, pauses after a week without traffic (it wakes on the first request). A run is about 1 KB.
