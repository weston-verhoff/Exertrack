create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(7, 3) not null check (weight_kg > 0),
  weighed_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index weight_entries_owner_timeline_idx
  on public.weight_entries(user_id, weighed_on, created_at, id);

alter table public.weight_entries enable row level security;

revoke all on table public.weight_entries from public, anon, authenticated;
grant select, insert, update, delete on table public.weight_entries to authenticated;
grant all on table public.weight_entries to service_role;

create policy "Users can read own weight entries"
  on public.weight_entries for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own weight entries"
  on public.weight_entries for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and weighed_on <= current_date
  );

create policy "Users can update own weight entries"
  on public.weight_entries for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and weighed_on <= current_date
  );

create policy "Users can delete own weight entries"
  on public.weight_entries for delete
  to authenticated
  using ((select auth.uid()) = user_id);
