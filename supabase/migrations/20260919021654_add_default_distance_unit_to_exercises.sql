alter table public.exercises
  add column if not exists default_distance_unit text;

alter table public.exercises
  drop constraint if exists exercises_default_distance_unit_check;

alter table public.exercises
  add constraint exercises_default_distance_unit_check
  check (default_distance_unit is null or default_distance_unit in ('mi', 'yd', 'km', 'm'));
