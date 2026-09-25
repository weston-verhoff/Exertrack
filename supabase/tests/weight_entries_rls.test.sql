begin;

insert into auth.users(id, email)
values
  ('71000000-0000-0000-0000-000000000001', 'weight-a@example.test'),
  ('71000000-0000-0000-0000-000000000002', 'weight-b@example.test');

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-0000-0000-000000000001',
  true
);

insert into public.weight_entries(user_id, weight_kg, weighed_on, created_at)
values
  (
    '71000000-0000-0000-0000-000000000001',
    80.125,
    current_date,
    '2026-09-24T08:00:00Z'
  ),
  (
    '71000000-0000-0000-0000-000000000001',
    80.000,
    current_date,
    '2026-09-24T18:00:00Z'
  );

do $$
declare
  first_id uuid;
  original_created_at timestamptz;
begin
  if (select count(*) from public.weight_entries) <> 2 then
    raise exception 'Owner cannot read both same-day entries';
  end if;

  select id, created_at
  into first_id, original_created_at
  from public.weight_entries
  order by weighed_on, created_at, id
  limit 1;

  update public.weight_entries
  set weight_kg = 79.875
  where id = first_id;

  if (select created_at from public.weight_entries where id = first_id)
     <> original_created_at then
    raise exception 'Editing changed creation order';
  end if;

  begin
    insert into public.weight_entries(user_id, weight_kg, weighed_on)
    values (
      '71000000-0000-0000-0000-000000000001',
      80,
      current_date + 1
    );
    raise exception 'Future entry accepted';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.weight_entries(user_id, weight_kg, weighed_on)
    values (
      '71000000-0000-0000-0000-000000000001',
      0,
      current_date
    );
    raise exception 'Non-positive entry accepted';
  exception when check_violation then null;
  end;
end $$;

select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-0000-0000-000000000002',
  true
);

do $$
begin
  if exists(select 1 from public.weight_entries) then
    raise exception 'Cross-user read allowed';
  end if;

  begin
    update public.weight_entries set weight_kg = 1;
    if found then raise exception 'Cross-user update allowed'; end if;
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.weight_entries;
    if found then raise exception 'Cross-user delete allowed'; end if;
  exception when insufficient_privilege then null;
  end;
end $$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);

do $$
begin
  if exists(select 1 from public.weight_entries) then
    raise exception 'Anonymous read allowed';
  end if;
exception when insufficient_privilege then null;
end $$;

rollback;
