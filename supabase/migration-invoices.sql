-- ════════════════════════════════════════════════════════════════════════
-- TOUBA TECH — Facturation clients (factures + avoirs)
-- À exécuter une fois dans Supabase › SQL Editor.
--
-- Règles légales appliquées par la base elle-même :
--   • numérotation unique, chronologique et SANS TROU, par année :
--       F-2026-0001, F-2026-0002…  (avoirs : AV-2026-0001…)
--   • date d'émission = date du jour (heure de Paris), jamais antidatée
--   • une facture émise ne peut être ni modifiée ni supprimée :
--       seul le paiement (date + mode) peut être enregistré ;
--       une erreur se corrige par un avoir.
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

-- ─── Données clients : jamais accessibles avec la clé publique ─────────
alter table public.invoices enable row level security;
alter table public.invoice_counters enable row level security;

-- ─── Création atomique : numéro + facture dans la même transaction ─────
-- Si l'insertion échoue, le compteur revient en arrière → aucun trou.
create or replace function public.create_invoice(p jsonb)
returns text
language plpgsql
as $$
declare
  v_kind   text := coalesce(p->>'kind', 'invoice');
  v_today  date := (now() at time zone 'Europe/Paris')::date;
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
      'id', gen_random_uuid(),
      'number', v_number,
      'kind', v_kind,
      'issue_date', v_today,
      'created_at', now()
    )
  )).*;

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
