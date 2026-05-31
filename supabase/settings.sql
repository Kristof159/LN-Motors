-- ===========================================================
-- LN Motors — instellingen (o.a. import calculator-tarieven)
-- Plak dit in: Supabase Dashboard → SQL Editor → New query → Run
-- ===========================================================

-- 1) Eenvoudige key/value-tabel met instellingen ---------------
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- 2) Row Level Security ---------------------------------------
alter table public.settings enable row level security;

-- Iedereen (ook bezoekers) mag instellingen LEZEN
-- (de calculator op de publieke site heeft de tarieven nodig)
drop policy if exists "Instellingen zijn publiek leesbaar" on public.settings;
create policy "Instellingen zijn publiek leesbaar"
  on public.settings for select
  using (true);

-- Enkel ingelogde (admin) gebruikers mogen toevoegen/bewerken
drop policy if exists "Ingelogde gebruikers mogen instellingen toevoegen" on public.settings;
create policy "Ingelogde gebruikers mogen instellingen toevoegen"
  on public.settings for insert
  to authenticated
  with check (true);

drop policy if exists "Ingelogde gebruikers mogen instellingen bewerken" on public.settings;
create policy "Ingelogde gebruikers mogen instellingen bewerken"
  on public.settings for update
  to authenticated
  using (true) with check (true);

-- 3) Standaardwaarden voor de import calculator ----------------
-- Vast starttarief (€), kilometerprijs (€/km) en btw-tarief (fractie).
-- De km's worden berekend als de rij-afstand tussen het ophaaladres
-- en het opleveradres die de klant zelf ingeeft.
insert into public.settings (key, value) values
  ('import_calculator', jsonb_build_object(
    'base_fee', 500,
    'price_per_km', 0.75,
    'vat_rate', 0.21
  ))
on conflict (key) do nothing;

-- ===========================================================
-- Klaar. De tarieven zijn nu aanpasbaar via /admin.html.
-- ===========================================================
