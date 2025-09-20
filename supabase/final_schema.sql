-- =========================================================
-- MedTime: Complete Supabase Postgres Schema (MVP)
-- Clean version (no RETURNING INTO / temp tables)
-- =========================================================

-- 0) Extensions & Enums
------------------------------------------------------------
create extension if not exists pgcrypto;   -- gen_random_uuid(), crypto helpers
create extension if not exists pg_trgm;    -- optional fuzzy search

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('patient','caregiver','clinician');
  end if;
  if not exists (select 1 from pg_type where typname = 'dose_status') then
    create type dose_status as enum ('pending','taken','skipped','snoozed');
  end if;
end $$;

-- 1) Core Identity & Access
------------------------------------------------------------
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  auth0_sub     text unique not null,               -- e.g., "auth0|abc123"
  role          user_role not null,
  name          text not null,
  phone_enc     text,                               -- optionally store encrypted phone
  created_at    timestamptz not null default now()
);

create table if not exists caregiver_links (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references users(id) on delete cascade,
  caregiver_id  uuid not null references users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (patient_id, caregiver_id)
);

create index if not exists idx_caregiver_links_patient on caregiver_links(patient_id);
create index if not exists idx_caregiver_links_caregiver on caregiver_links(caregiver_id);

-- 2) Medications & Schedules
------------------------------------------------------------
create table if not exists medications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  name           text not null,                    -- e.g., "Metformin"
  strength_text  text,                             -- e.g., "500 mg"
  dose_text      text,                             -- e.g., "1 tablet"
  instructions   text,                             -- e.g., "with food"
  created_at     timestamptz not null default now()
);

create index if not exists idx_meds_user on medications(user_id);

create table if not exists med_times (
  id             uuid primary key default gen_random_uuid(),
  medication_id  uuid not null references medications(id) on delete cascade,
  time_of_day    time not null
);

create index if not exists idx_med_times_med on med_times(medication_id);

-- 3) Dose Instances
------------------------------------------------------------
create table if not exists doses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  medication_id  uuid not null references medications(id) on delete cascade,
  scheduled_at   timestamptz not null,             -- concrete datetime for the dose
  status         dose_status not null default 'pending',
  taken_at       timestamptz,
  notes          text,
  created_at     timestamptz not null default now(),
  unique (medication_id, scheduled_at)
);

create index if not exists idx_doses_user_time on doses(user_id, scheduled_at);
create index if not exists idx_doses_status on doses(status);

-- 4) Alerts & Escalation
------------------------------------------------------------
create table if not exists alerts (
  id               uuid primary key default gen_random_uuid(),
  dose_id          uuid not null references doses(id) on delete cascade,
  sent_at          timestamptz not null default now(),
  ack_by_user_id   uuid references users(id),
  ack_at           timestamptz,
  meta             jsonb not null default '{}'::jsonb   -- e.g., { "twilio_sid": "..." }
);

create index if not exists idx_alerts_dose on alerts(dose_id);

create table if not exists escalation_rules (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id) on delete cascade,
  grace_minutes    int not null default 10,      -- minutes after scheduled_at to escalate
  escalate_sms     boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (user_id)
);

-- 5) AI Intake & Prediction
------------------------------------------------------------
create table if not exists intake_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  raw_input_type  text not null,                 -- 'image_label' | 'text_label'
  raw_input_ref   text,                          -- optional: storage path / URL
  gemini_model    text not null,                 -- e.g., 'gemini-1.5-flash'
  gemini_output   jsonb not null,                -- structured extraction result
  created_at      timestamptz not null default now()
);

create index if not exists idx_intake_user on intake_events(user_id);

create table if not exists risk_daily (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  for_date        date not null,
  score           smallint not null check (score between 0 and 100),
  created_at      timestamptz not null default now(),
  unique (user_id, for_date)
);

-- 6) Audit & Analytics
------------------------------------------------------------
create table if not exists audit_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id) on delete set null,
  actor_id     uuid references users(id) on delete set null, -- who performed the action
  action       text not null,            -- e.g., 'DOSE_TAKEN','MED_CREATED','ALERT_SENT'
  entity_type  text not null,            -- 'dose','med','user','alert'
  entity_id    uuid not null,
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_audit_user on audit_log(user_id, created_at desc);

-- Helpful view: next pending dose per user (for dashboard)
create or replace view v_next_dose as
select d.user_id,
       d.id as dose_id,
       d.medication_id,
       d.scheduled_at
from doses d
join (
  select user_id, min(scheduled_at) as next_time
  from doses
  where status = 'pending' and scheduled_at >= now()
  group by user_id
) nd on nd.user_id = d.user_id and nd.next_time = d.scheduled_at;

-- 7) Helper Functions & Triggers (dose generation)
------------------------------------------------------------
-- Generate doses for [start_date, end_date) for a specific medication
create or replace function gen_doses_for_med(
  p_med_id uuid,
  p_user_id uuid,
  p_start_date date,
  p_end_date   date
) returns void language plpgsql as $$
declare
  t record;
  d date;
  ts timestamptz;
begin
  for d in select generate_series(p_start_date, p_end_date - interval '1 day', interval '1 day')::date loop
    for t in select time_of_day from med_times where medication_id = p_med_id loop
      ts := (d::timestamptz + t.time_of_day);
      insert into doses (user_id, medication_id, scheduled_at)
      values (p_user_id, p_med_id, ts)
      on conflict (medication_id, scheduled_at) do nothing;
    end loop;
  end loop;
end $$;

-- Trigger function: after medication created OR med_times inserted/updated,
-- generate the next 7 days of doses.
create or replace function trg_med_or_time_after_change()
returns trigger language plpgsql as $$
declare
  v_med_id uuid;
  v_user_id uuid;
begin
  if tg_table_name = 'medications' then
    v_med_id := new.id;
    v_user_id := new.user_id;
  elsif tg_table_name = 'med_times' then
    select m.id, m.user_id into v_med_id, v_user_id
    from medications m
    where m.id = new.medication_id;
  end if;

  perform gen_doses_for_med(v_med_id, v_user_id, current_date, current_date + 7);
  return new;
end $$;

drop trigger if exists med_after_insert on medications;
create trigger med_after_insert
after insert on medications
for each row execute procedure trg_med_or_time_after_change();

drop trigger if exists medtimes_after_upsert on med_times;
create trigger medtimes_after_upsert
after insert or update on med_times
for each row execute procedure trg_med_or_time_after_change();

-- NOTE: If a med_times row is DELETED, re-generate future doses via backend for simplicity.

-- 8) (Optional) RLS (skip for hackathon if all access is via backend service role)
------------------------------------------------------------
-- alter table users             enable row level security;
-- alter table caregiver_links   enable row level security;
-- alter table medications       enable row level security;
-- alter table med_times         enable row level security;
-- alter table doses             enable row level security;
-- alter table alerts            enable row level security;
-- alter table escalation_rules  enable row level security;
-- alter table intake_events     enable row level security;
-- alter table risk_daily        enable row level security;
-- alter table audit_log         enable row level security;

-- 9) Demo Seed Data (NO temp tables; CTEs + DO block)
------------------------------------------------------------
-- Demo patient & caregiver (replace auth0_sub values with your test Auth0 users)
insert into users (auth0_sub, role, name)
values
  ('auth0|demo_patient',   'patient',   'Pat Demo'),
  ('auth0|demo_caregiver', 'caregiver', 'Care Demo')
on conflict (auth0_sub) do nothing;

-- Link caregiver → patient
insert into caregiver_links (patient_id, caregiver_id)
select p.id, c.id
from users p
join users c on true
where p.auth0_sub = 'auth0|demo_patient'
  and c.auth0_sub = 'auth0|demo_caregiver'
on conflict do nothing;

-- Insert a sample medication; capture its id via CTE
with pat as (
  select id as patient_id from users where auth0_sub = 'auth0|demo_patient'
),
ins_med as (
  insert into medications (user_id, name, strength_text, dose_text, instructions)
  select patient_id, 'Metformin', '500 mg', '1 tablet', 'with food' from pat
  on conflict do nothing
  returning id
)
-- Insert med times ONLY if the med row was created above (CTE has a row)
insert into med_times (medication_id, time_of_day)
select id, time '08:00' from ins_med
union all
select id, time '20:00' from ins_med;

-- Generate next 7 days of doses for that medication (if present)
do $$
declare
  v_user uuid;
  v_med  uuid;
begin
  select id into v_user from users where auth0_sub = 'auth0|demo_patient';

  -- prefer the most recent Metformin for that user
  select m.id
  into v_med
  from medications m
  where m.user_id = v_user and m.name = 'Metformin'
  order by m.created_at desc
  limit 1;

  if v_med is not null then
    perform gen_doses_for_med(v_med, v_user, current_date, current_date + 7);
  end if;
end $$;

-- 10) Optional sanity checks
------------------------------------------------------------
-- select * from v_next_dose;
-- select * from doses order by scheduled_at limit 10;
-- select * from medications;
-- select * from med_times;
