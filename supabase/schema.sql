-- The Villa · Hall of Islanders + analytics
-- Paste this whole file into the Supabase SQL editor and click Run. Safe to re-run.
--
-- Design: the browser holds only the public (publishable/anon) key. It cannot touch the tables
-- directly (row level security is on with no policies). Everything goes through the vl_* and
-- an_* functions below, which run as the database owner and check what matters:
--   * usernames are unique (case-insensitive) and 3-16 chars of [A-Za-z0-9_]
--   * a username is owned by whoever holds its secret token (hashed here, never stored raw);
--     a username quiet for 7 days can be taken back by whoever types it
--   * a run is posted once, by its owner, with bounded numbers

create table if not exists public.vl_users (
  handle      text primary key,                 -- lowercase key
  display     text not null,                    -- as the player typed it
  token_hash  text not null,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);
create index if not exists vl_users_last_seen on public.vl_users (last_seen);

create table if not exists public.vl_runs (
  id          bigserial primary key,
  handle      text not null references public.vl_users(handle) on delete cascade,
  name        text not null,                    -- the islander's name
  gender      text not null,                    -- f | m
  arch        text not null,
  entry       text not null default 'og',       -- og | bombshell
  days        int  not null,
  result      text not null,                    -- winner | runner-up | finalist | dumped
  score       int  not null,
  pop         int  not null default 50,
  kisses      int  not null default 0,
  look        jsonb not null default '{}'::jsonb,
  code        text,
  created_at  timestamptz not null default now()
);
create index if not exists vl_runs_board on public.vl_runs (score desc, days desc, created_at asc);
create index if not exists vl_runs_handle on public.vl_runs (handle, created_at desc);

alter table public.vl_users enable row level security;
alter table public.vl_runs  enable row level security;
revoke all on public.vl_users from anon, authenticated;
revoke all on public.vl_runs  from anon, authenticated;

create or replace function public.vl_recovery_days() returns int language sql immutable as $$ select 7 $$;

create or replace function public.vl_check(p_handle text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text := lower(trim(p_handle)); u vl_users%rowtype;
begin
  if k !~ '^[a-z0-9_]{3,16}$' then return jsonb_build_object('ok', false, 'reason', 'format'); end if;
  select * into u from vl_users where handle = k;
  if found then
    return jsonb_build_object('ok', false, 'reason', 'taken',
      'recoverable', u.last_seen < now() - (vl_recovery_days() || ' days')::interval);
  end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.vl_check(text) to anon, authenticated;

create or replace function public.vl_claim(p_handle text, p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text := lower(trim(p_handle)); h text; existing vl_users%rowtype;
begin
  if k !~ '^[a-z0-9_]{3,16}$' then return jsonb_build_object('ok', false, 'reason', 'format'); end if;
  if p_token is null or length(p_token) < 16 then return jsonb_build_object('ok', false, 'reason', 'token'); end if;
  h := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  select * into existing from vl_users where handle = k;
  if found then
    if existing.token_hash = h then
      update vl_users set last_seen = now() where handle = k;
      return jsonb_build_object('ok', true, 'display', existing.display, 'handle', k);
    end if;
    if existing.last_seen >= now() - (vl_recovery_days() || ' days')::interval then
      return jsonb_build_object('ok', false, 'reason', 'taken');
    end if;
    update vl_users set token_hash = h, last_seen = now() where handle = k;
    return jsonb_build_object('ok', true, 'display', existing.display, 'handle', k, 'recovered', true);
  end if;
  insert into vl_users (handle, display, token_hash) values (k, trim(p_handle), h);
  return jsonb_build_object('ok', true, 'display', trim(p_handle), 'handle', k);
end $$;
grant execute on function public.vl_claim(text, text) to anon, authenticated;

create or replace function public.vl_touch(p_handle text, p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text := lower(trim(p_handle)); h text; hit int := 0;
begin
  if k !~ '^[a-z0-9_]{3,16}$' or p_token is null then return jsonb_build_object('ok', false); end if;
  h := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  update vl_users set last_seen = now() where handle = k and token_hash = h;
  get diagnostics hit = row_count;
  return jsonb_build_object('ok', hit > 0);
end $$;
grant execute on function public.vl_touch(text, text) to anon, authenticated;

create or replace function public.vl_run_json(r public.vl_runs, u public.vl_users) returns jsonb
language sql immutable as $$
  select jsonb_build_object('id', r.id, 'handle', r.handle, 'display', u.display, 'name', r.name, 'gender', r.gender, 'arch', r.arch,
    'entry', r.entry, 'days', r.days, 'result', r.result, 'score', r.score, 'pop', r.pop, 'kisses', r.kisses, 'look', r.look, 'code', r.code,
    'created_at', r.created_at);
$$;

-- Post one islander run. Numbers are clamped so a modified client cannot post nonsense.
create or replace function public.vl_post_run(p_handle text, p_token text, p_run jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text := lower(trim(p_handle)); h text; u vl_users%rowtype; r vl_runs%rowtype; rank int;
begin
  if k !~ '^[a-z0-9_]{3,16}$' or p_token is null then return jsonb_build_object('ok', false, 'reason', 'format'); end if;
  h := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  select * into u from vl_users where handle = k and token_hash = h;
  if not found then return jsonb_build_object('ok', false, 'reason', 'owner'); end if;
  if (select count(*) from vl_runs where handle = k and created_at > now() - interval '1 hour') >= 20 then
    return jsonb_build_object('ok', false, 'reason', 'rate');
  end if;
  insert into vl_runs (handle, name, gender, arch, entry, days, result, score, pop, kisses, look, code)
  values (k,
    left(coalesce(p_run->>'name', 'Islander'), 40),
    case when p_run->>'gender' = 'f' then 'f' else 'm' end,
    left(coalesce(p_run->>'arch', 'sweetheart'), 20),
    case when p_run->>'entry' = 'bombshell' then 'bombshell' else 'og' end,
    greatest(1, least(22, coalesce((p_run->>'days')::int, 1))),
    case when p_run->>'result' in ('winner', 'runner-up', 'finalist', 'dumped') then p_run->>'result' else 'dumped' end,
    greatest(0, least(2000, coalesce((p_run->>'score')::int, 0))),
    greatest(1, least(99, coalesce((p_run->>'pop')::int, 50))),
    greatest(0, least(60, coalesce((p_run->>'kisses')::int, 0))),
    coalesce(p_run->'look', '{}'::jsonb),
    left(p_run->>'code', 8))
  returning * into r;
  update vl_users set last_seen = now() where handle = k;
  select count(*) + 1 into rank from vl_runs x where x.score > r.score or (x.score = r.score and x.days > r.days) or (x.score = r.score and x.days = r.days and x.created_at < r.created_at);
  return jsonb_build_object('ok', true, 'rank', rank, 'run', vl_run_json(r, u));
end $$;
grant execute on function public.vl_post_run(text, text, jsonb) to anon, authenticated;

create or replace function public.vl_board(p_limit int default 100) returns jsonb
language sql security definer stable set search_path = public as $$
  select coalesce(jsonb_agg(vl_run_json(r, u) order by r.score desc, r.days desc, r.created_at asc), '[]'::jsonb)
  from (select * from vl_runs order by score desc, days desc, created_at asc limit greatest(1, least(200, p_limit))) r
  join vl_users u on u.handle = r.handle;
$$;
grant execute on function public.vl_board(int) to anon, authenticated;

create or replace function public.vl_mine(p_handle text) returns jsonb
language sql security definer stable set search_path = public as $$
  select coalesce(jsonb_agg(vl_run_json(r, u) order by r.created_at desc), '[]'::jsonb)
  from vl_runs r join vl_users u on u.handle = r.handle
  where r.handle = lower(trim(p_handle));
$$;
grant execute on function public.vl_mine(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Analytics: one events table, one ingest function, a few views.
-- ---------------------------------------------------------------------------
create table if not exists public.an_events (
  id          bigserial primary key,
  device      uuid not null,
  session     uuid,
  handle      text,
  name        text not null,
  props       jsonb not null default '{}'::jsonb,
  screen      text,
  platform    text,
  install     text,
  source      text,
  medium      text,
  campaign    text,
  referrer    text,
  version     text,
  client_at   timestamptz,
  at          timestamptz not null default now()
);
create index if not exists an_events_at on public.an_events (at desc);
create index if not exists an_events_name on public.an_events (name, at desc);
create index if not exists an_events_device on public.an_events (device, at desc);
alter table public.an_events enable row level security;
revoke all on public.an_events from anon, authenticated;

create or replace function public.an_ingest(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e jsonb; n int := 0; dev jsonb := coalesce(p->'dev', '{}'::jsonb);
begin
  if p is null or p->>'d' is null or jsonb_typeof(p->'e') <> 'array' then return jsonb_build_object('ok', false); end if;
  for e in select * from jsonb_array_elements(p->'e') limit 50 loop
    insert into an_events (device, session, handle, name, props, screen, platform, install, source, medium, campaign, referrer, version, client_at)
    values ((p->>'d')::uuid, nullif(p->>'s', '')::uuid, left(p->>'h', 16), left(coalesce(e->>'n', 'event'), 40),
      coalesce(e->'p', '{}'::jsonb), left(e->>'sc', 40), left(dev->>'platform', 12), left(dev->>'install', 12),
      left(dev->>'source', 40), left(dev->>'medium', 40), left(dev->>'campaign', 60), left(dev->>'referrer', 80),
      left(p->>'v', 16), to_timestamp(((e->>'t')::numeric) / 1000.0));
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'n', n);
end $$;
grant execute on function public.an_ingest(jsonb) to anon, authenticated;

create or replace view public.an_daily as
  select date_trunc('day', at)::date as day, count(distinct device) as devices, count(distinct session) as sessions, count(*) as events
  from an_events group by 1 order by 1 desc;
create or replace view public.an_funnel as
  select name, count(distinct device) as devices, count(*) as events from an_events where at > now() - interval '30 days' group by 1 order by 2 desc;

-- ---------------------------------------------------------------------------
-- Commissioner snippets (run by hand in the SQL editor)
-- ---------------------------------------------------------------------------
-- Rename a rude username:   update vl_users set display = 'Islander42' where handle = 'rudename';
-- Remove a run:             delete from vl_runs where id = 123;
-- Ban a username entirely:  delete from vl_users where handle = 'rudename';   (cascades to their runs)
-- Drop the empty Blitz tables that were pasted into this project by mistake on 2026-09-16
-- (only run this in The Villa's project, never in The Blitz's):
--   drop table if exists public.cb_entries, public.lb_entries, public.lb_users cascade;
