#!/usr/bin/env bash
# ===========================================================
# LN Motors — nieuwe verkochte foto's importeren
# -----------------------------------------------------------
# Wat dit script doet:
#   1) Uploadt alle DSC*.jpg + image00001.jpg uit ./img/ naar de
#      Supabase Storage bucket "car-images" (map: verkocht/nieuw/).
#   2) Genereert supabase/seed-verkocht-nieuw.sql met één INSERT
#      per foto (status=verkocht, gegevens leeg/NULL).
#
# De rijen krijgen created_at = now() (default), dus ze verschijnen
# bovenaan de Verkocht-pagina (gesorteerd op created_at DESC).
# Details kun je later per wagen invullen via admin.html.
#
# Vereist: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env (project-root).
#
# Gebruik:
#   bash supabase/seed-verkocht-nieuw.sh
#   → daarna supabase/seed-verkocht-nieuw.sql in de SQL Editor plakken & runnen
# ===========================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMG_DIR="$ROOT/img"
SQL_OUT="$ROOT/supabase/seed-verkocht-nieuw.sql"

# --- .env inlezen ---
if [[ ! -f "$ROOT/.env" ]]; then echo "FOUT: .env niet gevonden in $ROOT"; exit 1; fi
SUPABASE_URL=$(grep -E '^SUPABASE_URL=' "$ROOT/.env" | sed -E 's/^[^=]+="?([^"]*)"?$/\1/')
SERVICE_KEY=$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' "$ROOT/.env" | sed -E 's/^[^=]+="?([^"]*)"?$/\1/')

if [[ -z "${SERVICE_KEY}" ]]; then
  echo "FOUT: SUPABASE_SERVICE_ROLE_KEY is leeg in .env."
  exit 1
fi

BUCKET="car-images"
PREFIX="verkocht/nieuw"
PUBLIC_BASE="${SUPABASE_URL}/storage/v1/object/public/${BUCKET}"

echo "→ Foto's uploaden naar ${SUPABASE_URL} / ${BUCKET}/${PREFIX}/ ..."

# --- Lijst van te importeren foto's (DSC*.jpg + image00001.jpg) ---
FILES=()
while IFS= read -r f; do FILES+=("$f"); done < <(cd "$IMG_DIR" && ls -1 | grep -E '^(DSC.*|image00001)\.jpg$' | sort)

# --- SQL-header ---
{
  echo "-- ==========================================================="
  echo "-- LN Motors — nieuwe verkochte foto's (gegenereerd door seed-verkocht-nieuw.sh)"
  echo "-- Plak dit in: Supabase Dashboard → SQL Editor → New query → Run"
  echo "-- ==========================================================="
  echo ""
  echo "insert into public.cars (merk, model, bouwjaar, prijs, km, brandstof, transmissie, status, afbeeldingen) values"
} > "$SQL_OUT"

ROWS=()
for file in "${FILES[@]}"; do
  src="$IMG_DIR/$file"
  if [[ ! -f "$src" ]]; then echo "  ! ontbreekt: $file (overgeslagen)"; continue; fi

  dest_path="${PREFIX}/${file}"
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
  ROWS+=("  (null, null, null, null, null, null, null, 'verkocht', array['$url'])")
done

if [[ ${#ROWS[@]} -eq 0 ]]; then
  echo "FOUT: geen foto's gevonden om te importeren."; exit 1
fi

# rijen samenvoegen met komma's
{
  for i in "${!ROWS[@]}"; do
    if [[ $i -lt $((${#ROWS[@]}-1)) ]]; then echo "${ROWS[$i]},"; else echo "${ROWS[$i]};"; fi
  done
} >> "$SQL_OUT"

echo ""
echo "→ Klaar. ${#ROWS[@]} foto's geüpload."
echo "→ SQL geschreven naar: $SQL_OUT"
echo "→ Plak dat bestand nu in de Supabase SQL Editor en run het."
