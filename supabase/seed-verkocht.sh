#!/usr/bin/env bash
# ===========================================================
# LN Motors — verkochte wagens importeren
# -----------------------------------------------------------
# Wat dit script doet:
#   1) Uploadt de 24 foto's (uit ./img-verkocht/) naar de
#      Supabase Storage bucket "car-images" (map: verkocht/).
#   2) Genereert supabase/seed-verkocht.sql met 24 INSERTs
#      die naar de publieke Storage-URLs verwijzen.
#
# Vereist: SUPABASE_SERVICE_ROLE_KEY in .env (root van project).
#          De service_role key staat in Supabase Dashboard →
#          Project Settings → API → service_role (secret).
#
# Gebruik:
#   bash supabase/seed-verkocht.sh
#   → daarna supabase/seed-verkocht.sql in de SQL Editor plakken & runnen
# ===========================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMG_DIR="$ROOT/supabase/img-verkocht"
SQL_OUT="$ROOT/supabase/seed-verkocht.sql"

# --- .env inlezen ---
if [[ ! -f "$ROOT/.env" ]]; then echo "FOUT: .env niet gevonden in $ROOT"; exit 1; fi
SUPABASE_URL=$(grep -E '^SUPABASE_URL=' "$ROOT/.env" | sed -E 's/^[^=]+="?([^"]*)"?$/\1/')
SERVICE_KEY=$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' "$ROOT/.env" | sed -E 's/^[^=]+="?([^"]*)"?$/\1/')

if [[ -z "${SERVICE_KEY}" ]]; then
  echo "FOUT: SUPABASE_SERVICE_ROLE_KEY is leeg in .env."
  echo "Zet hem (Dashboard → Project Settings → API → service_role) en run opnieuw."
  exit 1
fi

BUCKET="car-images"
PREFIX="verkocht"
PUBLIC_BASE="${SUPABASE_URL}/storage/v1/object/public/${BUCKET}"

echo "→ Foto's uploaden naar ${SUPABASE_URL} / ${BUCKET}/${PREFIX}/ ..."

# --- Cars-data: bestand|merk|model|bouwjaar|prijs|km|brandstof|transmissie ---
# Lege velden = onbekend (NULL in DB).
read -r -d '' CARS <<'DATA' || true
01-mercedes-a180-34380.jpg|Mercedes|A180|||34380|Benzine|
02-mini-cooper-s-67000.jpg|MINI|Cooper S|||67000|Benzine|
03-audi-a3-sline-90497.jpg|Audi|A3 S-line|||90497|Benzine|
04-mini-s-cooper-jcw-55000.jpg|MINI|Cooper S JCW|||55000|Benzine|
05-mini-cooper-50950.jpg|MINI|Cooper|||50950|Benzine|
06-mercedes-cla250e-72500.jpg|Mercedes|CLA250e|||72500|Benzine|
07-mercedes-a180-89250.jpg|Mercedes|A180|||89250|Benzine|
08-mercedes-c180-47850.jpg|Mercedes|C180|||47850|Benzine|
09-bmw-120i-msport-84490.jpg|BMW|120i M-Sport|||84490|Benzine|
10-jeep-wrangler-sahara-84490.jpg|Jeep|Wrangler Sahara|||84490|Diesel|
11-bmw-118i-sport-line.jpg|BMW|118i Sport Line|||||
12-bmw-320i-msport.jpg|BMW|320i M-Sport|||||
13-fiat-500-dolcevita.jpg|Fiat|500 Dolcevita|||||
14-mini-cooper-s-2.jpg|MINI|Cooper S|||||
15-mercedes-c43-amg.jpg|Mercedes-Benz|C43 AMG|||||
16-bmw-120i-msport-2.jpg|BMW|120i M-Sport|||||
17-mini-cooper-s-3.jpg|MINI|Cooper S|||||
18-mini-cooper-2.jpg|MINI|Cooper|||||
19-audi-a3-30tfsi.jpg|Audi|A3 30 TFSI|||||
20-fiat-500.jpg|Fiat|500|||||
21-bmw-x3-msport.jpg|BMW|X3 M-Sport|||||
22-cupra-formentor.jpg|Cupra|Formentor|||||
23-mercedes-c180-coupe.jpg|Mercedes|C180 Coupé|||||
24-hyundai-tucson.jpg|Hyundai|Tucson|||||
DATA

# --- SQL-header ---
{
  echo "-- ==========================================================="
  echo "-- LN Motors — verkochte wagens (gegenereerd door seed-verkocht.sh)"
  echo "-- Plak dit in: Supabase Dashboard → SQL Editor → New query → Run"
  echo "-- ==========================================================="
  echo ""
  echo "insert into public.cars (merk, model, bouwjaar, prijs, km, brandstof, transmissie, status, afbeeldingen) values"
} > "$SQL_OUT"

esc_sql() { printf "%s" "$1" | sed "s/'/''/g"; }
val_or_null() { [[ -z "$1" ]] && printf "null" || printf "'%s'" "$(esc_sql "$1")"; }
num_or_null() { [[ -z "$1" ]] && printf "null" || printf "%s" "$1"; }

ROWS=()
while IFS='|' read -r file merk model bouwjaar prijs km brandstof transmissie; do
  [[ -z "${file:-}" ]] && continue
  src="$IMG_DIR/$file"
  if [[ ! -f "$src" ]]; then echo "  ! ontbreekt: $file (overgeslagen)"; continue; fi

  dest_path="${PREFIX}/${file}"
  # Upload (x-upsert: overschrijft als hij al bestaat)
  http=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${SUPABASE_URL}/storage/v1/object/${BUCKET}/${dest_path}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "x-upsert: true" \
    -H "Content-Type: image/jpeg" \
    --data-binary "@${src}")
  if [[ "$http" != "200" ]]; then
    echo "  ! upload mislukt ($http): $file"; exit 1
  fi
  echo "  ✓ $file"

  url="${PUBLIC_BASE}/${dest_path}"
  ROWS+=("  ($(val_or_null "$merk"), $(val_or_null "$model"), $(num_or_null "$bouwjaar"), $(num_or_null "$prijs"), $(num_or_null "$km"), $(val_or_null "$brandstof"), $(val_or_null "$transmissie"), 'verkocht', array['$url'])")
done <<< "$CARS"

# rijen samenvoegen met komma's
{
  for i in "${!ROWS[@]}"; do
    if [[ $i -lt $((${#ROWS[@]}-1)) ]]; then echo "${ROWS[$i]},"; else echo "${ROWS[$i]};"; fi
  done
} >> "$SQL_OUT"

echo ""
echo "→ Klaar. ${#ROWS[@]} wagens geüpload."
echo "→ SQL geschreven naar: $SQL_OUT"
echo "→ Plak dat bestand nu in de Supabase SQL Editor en run het."
