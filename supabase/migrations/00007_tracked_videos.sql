-- LIVETrackerPro web — 00007: crea public.tracked_videos (schema piatto allineato al form)
-- Fix: "Could not find the table 'public.tracked_videos' in the schema cache" (PostgREST)
-- Esegui questo file in Supabase SQL Editor del progetto di PRODUZIONE
-- (quello indicato dalle env vars in Vercel, NON il progetto vuoto in .env.local),
-- poi ricarica lo schema cache: Dashboard -> API Docs -> "Reload schema cache".

create extension if not exists "pgcrypto";

-- ============================================================
-- TABELLA: tracked_videos — una riga = un video del tracker
-- status usa i valori dell'app (src/lib/models.ts VideoStatus):
--   bozza | pubblicato | inRevisione | approvato | rifiutato
-- ============================================================
create table if not exists public.tracked_videos (
  id uuid primary key default gen_random_uuid(),      -- = video.id dell'app
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',                      -- TITOLO DEL VIDEO
  topic text not null default 'Topic 1',               -- ARGOMENTO Topic 1/2
  status text not null default 'bozza'
    check (status in ('bozza', 'pubblicato', 'inRevisione', 'approvato', 'rifiutato')),
  publish_date date,                                   -- DATA PUBBLICAZIONE
  views integer not null default 0,                    -- VISUALIZZAZIONI
  earnings numeric not null default 0,                 -- GUADAGNO
  tiktok_link text,                                    -- LINK TIKTOK
  notes text,                                          -- NOTE (es. motivo di rifiuto)
  checklist jsonb not null default '[]'::jsonb,        -- CHECKLIST APPROVAZIONE (5 items)
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backward-compat: se la tabella esisteva già (vecchio schema di 00001, con colonna
-- `data`/`video_id`), aggiungi le nuove colonne in modo idempotente. Niente viene cancellato.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'tracked_videos'
  ) then
    alter table public.tracked_videos add column if not exists topic text not null default 'Topic 1';
    alter table public.tracked_videos add column if not exists status text not null default 'bozza';
    alter table public.tracked_videos add column if not exists publish_date date;
    alter table public.tracked_videos add column if not exists earnings numeric not null default 0;
    alter table public.tracked_videos add column if not exists tiktok_link text;
    alter table public.tracked_videos add column if not exists notes text;
    alter table public.tracked_videos add column if not exists checklist jsonb not null default '[]'::jsonb;
    alter table public.tracked_videos add column if not exists rejection_reason text;
  end if;
end $$;

-- ============================================================
-- INDICI
-- ============================================================
create index if not exists tracked_videos_user_id_idx on public.tracked_videos (user_id);

-- Una riga per utente per link TikTok (evita duplicati), opzionale
create unique index if not exists tracked_videos_user_link_unique
  on public.tracked_videos (user_id, tiktok_link)
  where tiktok_link is not null and tiktok_link <> '';

-- ============================================================
-- ROW LEVEL SECURITY: l'utente vede/gestisce solo i propri video
-- ============================================================
alter table public.tracked_videos enable row level security;

drop policy if exists "select_own_tracked_videos" on public.tracked_videos;
create policy "select_own_tracked_videos" on public.tracked_videos
  for select using (auth.uid() = user_id);

drop policy if exists "insert_own_tracked_videos" on public.tracked_videos;
create policy "insert_own_tracked_videos" on public.tracked_videos
  for insert with check (auth.uid() = user_id);

drop policy if exists "update_own_tracked_videos" on public.tracked_videos;
create policy "update_own_tracked_videos" on public.tracked_videos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete_own_tracked_videos" on public.tracked_videos;
create policy "delete_own_tracked_videos" on public.tracked_videos
  for delete using (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tracked_videos_updated_at on public.tracked_videos;
create trigger tracked_videos_updated_at
  before update on public.tracked_videos
  for each row execute function update_updated_at();
