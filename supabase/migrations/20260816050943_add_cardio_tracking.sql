alter table public.exercises add column if not exists exercise_type text not null default 'strength';
alter table public.exercises drop constraint if exists exercises_exercise_type_check;
alter table public.exercises add constraint exercises_exercise_type_check check (exercise_type in ('strength','cardio'));

alter table public.workout_exercises alter column reps drop not null;
alter table public.workout_exercises alter column weight drop not null;
alter table public.workout_exercises add column if not exists duration_seconds integer;
alter table public.workout_exercises add column if not exists distance_value numeric;
alter table public.workout_exercises add column if not exists distance_unit text;
alter table public.workout_exercises add column if not exists calories numeric;
alter table public.workout_exercises add column if not exists average_heart_rate integer;
alter table public.workout_exercises add column if not exists resistance numeric;
alter table public.workout_exercises add column if not exists incline numeric;

alter table public.template_exercises alter column reps drop not null;
alter table public.template_exercises add column if not exists weight numeric;
alter table public.template_exercises add column if not exists duration_seconds integer;
alter table public.template_exercises add column if not exists distance_value numeric;
alter table public.template_exercises add column if not exists distance_unit text;
alter table public.template_exercises add column if not exists calories numeric;
alter table public.template_exercises add column if not exists average_heart_rate integer;
alter table public.template_exercises add column if not exists resistance numeric;
alter table public.template_exercises add column if not exists incline numeric;

alter table public.workout_sets alter column reps drop not null;
alter table public.workout_sets alter column weight drop not null;
alter table public.workout_sets add column if not exists duration_seconds integer;
alter table public.workout_sets add column if not exists distance_value numeric;
alter table public.workout_sets add column if not exists distance_unit text;
alter table public.workout_sets add column if not exists calories numeric;
alter table public.workout_sets add column if not exists average_heart_rate integer;
alter table public.workout_sets add column if not exists resistance numeric;
alter table public.workout_sets add column if not exists incline numeric;

alter table public.workout_exercises drop constraint if exists workout_exercises_cardio_values_check;
alter table public.workout_exercises add constraint workout_exercises_cardio_values_check check (coalesce(duration_seconds,0) >= 0 and coalesce(distance_value,0) >= 0 and coalesce(calories,0) >= 0 and coalesce(average_heart_rate,0) >= 0 and coalesce(resistance,0) >= 0 and coalesce(incline,0) >= 0 and (distance_unit is null or distance_unit in ('mi','km','m','yd')));
alter table public.template_exercises drop constraint if exists template_exercises_cardio_values_check;
alter table public.template_exercises add constraint template_exercises_cardio_values_check check (coalesce(duration_seconds,0) >= 0 and coalesce(distance_value,0) >= 0 and coalesce(calories,0) >= 0 and coalesce(average_heart_rate,0) >= 0 and coalesce(resistance,0) >= 0 and coalesce(incline,0) >= 0 and (distance_unit is null or distance_unit in ('mi','km','m','yd')));
alter table public.workout_sets drop constraint if exists workout_sets_cardio_values_check;
alter table public.workout_sets add constraint workout_sets_cardio_values_check check (coalesce(duration_seconds,0) >= 0 and coalesce(distance_value,0) >= 0 and coalesce(calories,0) >= 0 and coalesce(average_heart_rate,0) >= 0 and coalesce(resistance,0) >= 0 and coalesce(incline,0) >= 0 and (distance_unit is null or distance_unit in ('mi','km','m','yd')));
