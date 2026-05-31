-- ===========================================================
-- LN Motors — Supabase database setup
-- Plak dit volledig in: Supabase Dashboard → SQL Editor → New query → Run
-- ===========================================================

-- 1) Tabel met auto's -----------------------------------------
create table if not exists public.cars (
  id            uuid primary key default gen_random_uuid(),
  merk          text not null,                 -- bv. BMW
  model         text not null,                 -- bv. 1-Reeks
  bouwjaar      int,                           -- bv. 2021
  prijs         numeric,                       -- in euro, bv. 28900
  km            int,                           -- kilometerstand
  brandstof     text,                          -- Benzine / Diesel / Elektrisch / Hybride
  transmissie   text,                          -- Manueel / Automaat
  status        text not null default 'beschikbaar', -- 'beschikbaar' of 'verkocht'
  beschrijving  text,
  afbeeldingen  text[] not null default '{}',  -- lijst met foto-URLs (Storage)
  created_at    timestamptz not null default now()
);

-- Index zodat sorteren op nieuwste snel gaat
create index if not exists cars_created_at_idx on public.cars (created_at desc);

-- 2) Row Level Security ---------------------------------------
alter table public.cars enable row level security;

-- Iedereen (ook bezoekers) mag auto's LEZEN
drop policy if exists "Auto's zijn publiek leesbaar" on public.cars;
create policy "Auto's zijn publiek leesbaar"
  on public.cars for select
  using (true);

-- Enkel ingelogde (admin) gebruikers mogen toevoegen/bewerken/verwijderen
drop policy if exists "Ingelogde gebruikers mogen toevoegen" on public.cars;
create policy "Ingelogde gebruikers mogen toevoegen"
  on public.cars for insert
  to authenticated
  with check (true);

drop policy if exists "Ingelogde gebruikers mogen bewerken" on public.cars;
create policy "Ingelogde gebruikers mogen bewerken"
  on public.cars for update
  to authenticated
  using (true) with check (true);

drop policy if exists "Ingelogde gebruikers mogen verwijderen" on public.cars;
create policy "Ingelogde gebruikers mogen verwijderen"
  on public.cars for delete
  to authenticated
  using (true);

-- 3) Storage bucket voor foto's -------------------------------
insert into storage.buckets (id, name, public)
values ('car-images', 'car-images', true)
on conflict (id) do nothing;

-- Iedereen mag foto's bekijken
drop policy if exists "Foto's publiek leesbaar" on storage.objects;
create policy "Foto's publiek leesbaar"
  on storage.objects for select
  using (bucket_id = 'car-images');

-- Enkel ingelogde gebruikers mogen foto's uploaden/verwijderen
drop policy if exists "Ingelogde gebruikers uploaden foto's" on storage.objects;
create policy "Ingelogde gebruikers uploaden foto's"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'car-images');

drop policy if exists "Ingelogde gebruikers verwijderen foto's" on storage.objects;
create policy "Ingelogde gebruikers verwijderen foto's"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'car-images');

-- ===========================================================
-- Klaar. Maak nu een admin-gebruiker aan:
--   Dashboard → Authentication → Users → Add user
--   (vul e-mail + wachtwoord in, "Auto Confirm User" aanvinken)
-- Met die login kun je straks op /admin.html auto's beheren.
-- ===========================================================
