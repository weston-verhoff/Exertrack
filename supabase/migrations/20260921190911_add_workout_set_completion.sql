alter table public.workout_sets
  add column if not exists completed boolean;

update public.workout_sets
  set completed = false
  where completed is null;

alter table public.workout_sets
  alter column completed set default false,
  alter column completed set not null;

comment on column public.workout_sets.completed is
  'Whether the user marked this individual workout set or cardio segment complete.';
