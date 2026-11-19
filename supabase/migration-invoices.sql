-- ════════════════════════════════════════════════════════════════════════
-- TOUBA TECH — Facturation clients (factures + avoirs)
-- À exécuter dans Supabase › SQL Editor. Peut être relancé sans risque :
-- relancer le fichier complet après chaque mise à jour.
--
-- Règles légales appliquées par la base elle-même :
--   • numérotation unique, chronologique et SANS TROU, par année :
--       F-2026-0001, F-2026-0002…  (avoirs : AV-2026-0001…)
--   • date d'émission = date du jour (heure de Paris), jamais antidatée
--   • une facture émise ne peut être ni modifiée ni supprimée :
--       seul le paiement (date + mode) peut être enregistré ;
--       une erreur se corrige par un avoir.
--   • règlements en plusieurs fois (acomptes) : jamais plus que le reste dû.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.invoice_counters (
  year        int  not null,
  kind        text not null,
  last_number int  not null,
  primary key (year, kind)
);

create table if not exists public.invoices (
  id                  uuid primary key default gen_random_uuid(),
  number              text unique not null,
  kind                text not null default 'invoice' check (kind in ('invoice', 'credit_note')),
  credit_note_for     uuid references public.invoices(id),
  issue_date          date not null,
  service_date        date not null,                 -- date de la prestation / de la vente
  due_date            date not null,
  operation_type      text not null check (operation_type in ('services', 'goods', 'mixed')),

  customer_type       text not null check (customer_type in ('individual', 'business')),
  customer_name       text not null,
  customer_company    text,
  customer_siren      text,
  customer_vat        text,
  customer_address    text not null,
  delivery_address    text,
  customer_email      text,
  customer_phone      text,

  device              text,                          -- appareil concerné (modèle, IMEI / n° de série)
  diagnostic_reference text,                         -- dossier TT-… d'origine, si la facture en vient
  lines               jsonb not null,                -- [{ description, quantity, unit_price_cents }]
  total_cents         int  not null,
  vat_mention         text not null,                 -- ex. « TVA non applicable, art. 293 B du CGI »
  seller              jsonb not null,                -- identité du vendeur figée à l'émission
  warranty            text,
  notes               text,

  paid_at             date,
  payment_method      text,
  created_at          timestamptz not null default now()
);

-- Un seul avoir par facture (l'avoir annule la facture en totalité)
create unique index if not exists invoices_one_credit_note
  on public.invoices (credit_note_for) where credit_note_for is not null;
create index if not exists invoices_issue_date_idx on public.invoices (issue_date desc);

-- ─── Règlements : acomptes et paiements en plusieurs fois ──────────────
create table if not exists public.invoice_payments (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references public.invoices(id),
  paid_at      date not null,
  amount_cents int  not null check (amount_cents > 0),   -- remboursement, pour un avoir
  method       text not null,
  created_at   timestamptz not null default now()
);
create index if not exists invoice_payments_invoice_idx on public.invoice_payments (invoice_id);

-- ─── Données clients : jamais accessibles avec la clé publique ─────────
alter table public.invoices enable row level security;
alter table public.invoice_counters enable row level security;
alter table public.invoice_payments enable row level security;

-- ─── Enregistrer un règlement (refuse de dépasser le reste dû) ─────────
-- Quand le total est atteint, la facture devient « acquittée » (paid_at).
create or replace function public.add_invoice_payment(p_invoice uuid, p_paid_at date, p_amount int, p_method text)
returns void
language plpgsql
as $$
declare
  v_total int;
  v_paid  int;
begin
  select abs(total_cents) into v_total from public.invoices where id = p_invoice for update;
  if not found then
    raise exception 'Facture introuvable.';
  end if;
  if exists (select 1 from public.invoices where credit_note_for = p_invoice) then
    raise exception 'Cette facture est annulée par un avoir : aucun règlement à enregistrer.';
  end if;
  select coalesce(sum(amount_cents), 0) into v_paid from public.invoice_payments where invoice_id = p_invoice;
  if p_amount is null or p_amount <= 0 or p_amount > v_total - v_paid then
    raise exception 'Montant invalide : il reste % € à régler.',
      replace(to_char((v_total - v_paid) / 100.0, 'FM9999990.00'), '.', ',');
  end if;

  insert into public.invoice_payments (invoice_id, paid_at, amount_cents, method)
  values (p_invoice, p_paid_at, p_amount, p_method);

  if v_paid + p_amount = v_total then
    update public.invoices
    set paid_at = p_paid_at,
        payment_method = (select string_agg(distinct method, ', ') from public.invoice_payments where invoice_id = p_invoice)
    where id = p_invoice;
  end if;
end;
$$;

revoke execute on function public.add_invoice_payment(uuid, date, int, text) from public, anon, authenticated;

-- ─── Création atomique : numéro + facture dans la même transaction ─────
-- Si l'insertion échoue, le compteur revient en arrière → aucun trou.
create or replace function public.create_invoice(p jsonb)
returns text
language plpgsql
as $$
declare
  v_kind   text := coalesce(p->>'kind', 'invoice');
  v_today  date := (now() at time zone 'Europe/Paris')::date;
  v_id     uuid := gen_random_uuid();
  v_n      int;
  v_number text;
begin
  insert into public.invoice_counters (year, kind, last_number)
  values (extract(year from v_today)::int, v_kind, 1)
  on conflict (year, kind)
    do update set last_number = public.invoice_counters.last_number + 1
  returning last_number into v_n;

  v_number := case v_kind when 'credit_note' then 'AV' else 'F' end
              || '-' || extract(year from v_today)::int
              || '-' || lpad(v_n::text, 4, '0');

  insert into public.invoices
  select (jsonb_populate_record(
    null::public.invoices,
    p || jsonb_build_object(
      'id', v_id,
      'number', v_number,
      'kind', v_kind,
      'issue_date', v_today,
      'created_at', now()
    )
  )).*;

  -- Paiement ou acompte reçu à l'émission : même transaction que la facture.
  if p->'initial_payment' is not null and jsonb_typeof(p->'initial_payment') = 'object' then
    perform public.add_invoice_payment(
      v_id, v_today,
      (p->'initial_payment'->>'amount_cents')::int,
      p->'initial_payment'->>'method'
    );
  end if;

  return v_number;
end;
$$;

revoke execute on function public.create_invoice(jsonb) from public, anon, authenticated;

-- ─── Inaltérabilité ────────────────────────────────────────────────────
create or replace function public.invoices_immutable()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Une facture émise ne peut pas être supprimée : établir un avoir.';
  end if;
  if (to_jsonb(new) - array['paid_at', 'payment_method'])
     is distinct from (to_jsonb(old) - array['paid_at', 'payment_method']) then
    raise exception 'Une facture émise ne peut pas être modifiée : seul le paiement peut être enregistré.';
  end if;
  return new;
end;
$$;

drop trigger if exists invoices_immutable on public.invoices;
create trigger invoices_immutable
  before update or delete on public.invoices
  for each row execute function public.invoices_immutable();

-- Vérification : select number, issue_date, customer_name, total_cents from invoices order by created_at desc;
