-- PillPal core schema

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth0_sub text unique not null,
  role text not null check (role in ('patient','caregiver','clinician')),
  phone_enc text,
  created_at timestamptz not null default now()
);

create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  strength_text text,
  dose_text text,
  instructions text,
  created_at timestamptz not null default now()
);

create table if not exists med_times (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references medications(id) on delete cascade,
  time_of_day time not null
);

do $$ begin
  if not exists (select 1 from pg_type where typname = 'dose_status') then
    create type dose_status as enum ('scheduled','taken','skipped','snoozed','missed');
  end if;
end $$;

create table if not exists doses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  medication_id uuid not null references medications(id) on delete cascade,
  scheduled_at timestamptz not null,
  status dose_status not null default 'scheduled',
  taken_at timestamptz,
  notes text
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  dose_id uuid not null references doses(id) on delete cascade,
  sent_at timestamptz not null default now(),
  ack_by text,
  ack_at timestamptz
);

create table if not exists risk_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  for_date date not null,
  score int not null check (score between 0 and 100),
  unique (user_id, for_date)
);

create index if not exists idx_doses_user_time on doses(user_id, scheduled_at);
create index if not exists idx_med_times_med on med_times(medication_id);
create index if not exists idx_medications_user on medications(user_id);


