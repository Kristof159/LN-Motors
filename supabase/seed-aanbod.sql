-- ===========================================================
-- LN Motors — actueel aanbod (8 wagens, AutoScout24 d.d. 2026-05-31)
-- Foto's = representatieve stockbeelden (Unsplash) per merk/model.
-- Vervang later door echte foto's via admin.html of een upload-script.
-- Plak dit in: Supabase Dashboard → SQL Editor → New query → Run
-- ===========================================================

-- Optioneel: bestaande beschikbare wagens eerst wissen om dubbels te vermijden.
-- delete from public.cars where status = 'beschikbaar';

insert into public.cars (merk, model, bouwjaar, prijs, km, brandstof, transmissie, status, afbeeldingen) values
  ('BMW', '120', 2022, 26950, 43615, 'Benzine', 'Automaat', 'beschikbaar', array['https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=900&q=80']),
  ('MINI', 'Cooper S', 2023, 26950, 62450, 'Benzine', 'Automaat', 'beschikbaar', array['https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=900&q=80']),
  ('Renault', 'Clio', 2024, 17950, 43494, 'Benzine', 'Automaat', 'beschikbaar', array['https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=900&q=80']),
  ('Opel', 'Corsa', 2023, 9990, 43905, 'Benzine', 'Manueel', 'beschikbaar', array['https://images.unsplash.com/photo-1546614042-7df3c24c9e5d?auto=format&fit=crop&w=900&q=80']),
  ('Mercedes-Benz', 'A 200', 2021, 24950, 67090, 'Benzine', 'Automaat', 'beschikbaar', array['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=900&q=80']),
  ('BMW', '118', 2020, 17990, 82543, 'Benzine', 'Automaat', 'beschikbaar', array['https://images.unsplash.com/photo-1556189250-72ba954cfc2b?auto=format&fit=crop&w=900&q=80']),
  ('MINI', 'Cooper', 2021, 20490, 59257, 'Benzine', 'Automaat', 'beschikbaar', array['https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=900&q=80']),
  ('Ford', 'Ranger', 2025, 62950, 19025, 'Diesel', 'Automaat', 'beschikbaar', array['https://images.unsplash.com/photo-1605893477799-b99a3b8b3b9a?auto=format&fit=crop&w=900&q=80']);
