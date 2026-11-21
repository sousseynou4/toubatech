#!/usr/bin/env bash
# Applique les migrations sur un PostgreSQL local vierge puis exécute les tests SQL.
# Usage : PGHOST=localhost PGUSER=postgres ./scripts/db-test.sh
# (NE PAS pointer vers une base Supabase réelle : la base de test est supprimée.)
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${DADA_TEST_DB:-dada_beauty_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
"${PSQL[@]}" -d "$DB" -f supabase/tests/00_local_supabase_stub.sql >/dev/null
for f in supabase/migrations/*.sql; do
  echo "→ migration $(basename "$f")"
  "${PSQL[@]}" -d "$DB" -f "$f" >/dev/null
done
echo "→ seed.sql"
"${PSQL[@]}" -d "$DB" -f supabase/seed.sql >/dev/null
"${PSQL[@]}" -d "$DB" -f supabase/tests/00_helpers.sql >/dev/null
if [[ "${1:-}" == "--migrate-only" ]]; then exit 0; fi
fail=0
for t in supabase/tests/[1-9]*.sql; do
  if "${PSQL[@]}" -d "$DB" -f "$t" >/tmp/dada_test_out 2>&1; then
    echo "✔ $(basename "$t")"
  else
    echo "✘ $(basename "$t")"; cat /tmp/dada_test_out; fail=1
  fi
done
if [[ -f supabase/tests/concurrency.sh ]]; then
  if DB="$DB" bash supabase/tests/concurrency.sh; then echo "✔ concurrency.sh"; else echo "✘ concurrency.sh"; fail=1; fi
fi
exit $fail
