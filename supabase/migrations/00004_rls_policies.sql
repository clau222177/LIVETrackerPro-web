-- LIVETrackerPro web — Fix dashboard "still Free": policy RLS lettura/update
-- Esegui questo file in Supabase SQL Editor del progetto di PRODUZIONE
-- (quello indicato dalle env vars in Vercel, NON il progetto vuoto in .env.local)

-- ============================================================
-- PROFILES: il proprietario può leggere/creare/aggiornare il proprio record
-- ============================================================
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ============================================================
-- SUBSCRIPTIONS: il proprietario legge/aggiorna la propria subscription
-- (leggere la subscription è ciò che fa la dashboard per mostrare il piano)
-- ============================================================
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own" on public.subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own" on public.subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- IN ALTERNATIVA (sconsigliata, ma immediata per debug):
-- Decommenta le due righe sotto e ricommentale dopo aver
-- verificato il fix, poi riattiva le policy sopra.
-- ============================================================
-- alter table public.profiles disable row level security;
-- alter table public.subscriptions disable row level security;
