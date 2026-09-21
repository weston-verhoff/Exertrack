alter table public.exercises
  add column if not exists track_laps boolean not null default false;
