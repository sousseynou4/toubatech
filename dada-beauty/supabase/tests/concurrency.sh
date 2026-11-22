#!/usr/bin/env bash
# 12 réservations simultanées du même créneau pour la même employée : une seule doit réussir.
set -uo pipefail
PSQL=(psql -X -q -t -A -d "$DB")
"${PSQL[@]}" -c "select tests.setup_fixture()" >/dev/null
SVC=$("${PSQL[@]}" -c "select id from public.services where slug='soft-glam'")
START=$("${PSQL[@]}" -c "select tests.at('11:00')")
OUT=$(mktemp -d)
for i in $(seq 10 21); do
  "${PSQL[@]}" -c "select tests.as_anon(); select public.create_public_booking('$SVC', '$START', '00000000-0000-0000-0000-0000000000a1', 'Cliente $i', '7712345$i') ->> 'reference'" >"$OUT/$i" 2>&1 &
done
wait
OK=$(grep -l 'RDV-' "$OUT"/* | wc -l)
TAKEN=$(grep -l 'SLOT_UNAVAILABLE' "$OUT"/* | wc -l)
ROWS=$("${PSQL[@]}" -c "select count(*) from public.appointments where start_at = '$START' and status = 'pending'")
rm -rf "$OUT"
echo "   réussies=$OK refusées=$TAKEN en_base=$ROWS"
[[ "$OK" == "1" && "$TAKEN" == "11" && "$ROWS" == "1" ]]
