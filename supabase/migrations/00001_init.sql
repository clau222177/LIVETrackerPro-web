-- LIVETrackerPro web — schema iniziale
-- Esegui questo file in Supabase SQL Editor (o via CLI: supabase db push)

create extension if not exists "pgcrypto";

-- ============================================================
-- TABELLE
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  weekly_plan jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'agency')),
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_user_unique unique (user_id)
);

create table if not exists public.tracked_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text,
  title text not null default '',
  views bigint not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tracked_videos_user_id_idx on public.tracked_videos (user_id);
create index if not exists tracked_videos_video_id_idx on public.tracked_videos (video_id);

-- ============================================================
-- AUTO-PROFILO alla registrazione
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, weekly_plan)
  values (
    new.id,
    new.email,
    '[
      {"weekday": 1, "topicID": 1},
      {"weekday": 2, "topicID": 2},
      {"weekday": 3, "topicID": 1},
      {"weekday": 4, "topicID": 2},
      {"weekday": 5, "topicID": 1},
      {"weekday": 6, "topicID": null},
      {"weekday": 7, "topicID": null}
    ]'::jsonb
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.tracked_videos enable row level security;

-- profiles: solo il proprietario
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- subscriptions: il proprietario legge il proprio piano;
-- insert/update servono all'upsert del checkout (client)
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);
create policy "subscriptions_insert_own" on public.subscriptions
  for insert with check (auth.uid() = user_id);
create policy "subscriptions_update_own" on public.subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- tracked_videos: CRUD completo del proprietario
create policy "videos_select_own" on public.tracked_videos
  for select using (auth.uid() = user_id);
create policy "videos_insert_own" on public.tracked_videos
  for insert with check (auth.uid() = user_id);
create policy "videos_update_own" on public.tracked_videos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "videos_delete_own" on public.tracked_videos
  for delete using (auth.uid() = user_id);
