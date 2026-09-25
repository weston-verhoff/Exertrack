alter table public.templates
  add column sort_order bigint;

with ranked_templates as (
  select
    id,
    row_number() over (
      partition by user_id
      order by lower(name), id
    ) * 1024 as next_sort_order
  from public.templates
)
update public.templates as templates
set sort_order = ranked_templates.next_sort_order
from ranked_templates
where ranked_templates.id = templates.id;

alter table public.templates
  alter column sort_order set not null;

create index templates_user_sort_order_idx
  on public.templates (user_id, sort_order, id);

create function public.assign_template_sort_order()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.sort_order is null then
    select coalesce(max(templates.sort_order), 0) + 1024
      into new.sort_order
    from public.templates as templates
    where templates.user_id = new.user_id;
  end if;

  return new;
end;
$$;

revoke all on function public.assign_template_sort_order() from public, anon, authenticated;

create trigger assign_template_sort_order_before_insert
  before insert on public.templates
  for each row
  execute function public.assign_template_sort_order();

create table public.template_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint template_tags_name_length_check
    check (char_length(btrim(name)) between 1 and 30),
  constraint template_tags_name_trimmed_check
    check (name = btrim(name))
);

create unique index template_tags_user_name_ci_idx
  on public.template_tags (user_id, lower(name));

create index template_tags_user_name_idx
  on public.template_tags (user_id, name, id);

create function public.normalize_template_tag_name()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_name text := lower(btrim(new.name));
begin
  new.name := upper(left(normalized_name, 1)) || substring(normalized_name from 2);
  return new;
end;
$$;

revoke all on function public.normalize_template_tag_name() from public, anon, authenticated;

create trigger normalize_template_tag_name_before_write
  before insert or update of name on public.template_tags
  for each row
  execute function public.normalize_template_tag_name();

create table public.template_tag_links (
  template_id uuid not null references public.templates(id) on delete cascade,
  tag_id uuid not null references public.template_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (template_id, tag_id)
);

create index template_tag_links_tag_idx
  on public.template_tag_links (tag_id, template_id);

alter table public.template_tags enable row level security;
alter table public.template_tag_links enable row level security;

revoke all on table public.template_tags from public, anon, authenticated;
revoke all on table public.template_tag_links from public, anon, authenticated;
grant select, insert, update, delete on table public.template_tags to authenticated;
grant select, insert, delete on table public.template_tag_links to authenticated;
grant all on table public.template_tags to service_role;
grant all on table public.template_tag_links to service_role;

create policy "Users can read own template tags"
  on public.template_tags for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own template tags"
  on public.template_tags for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own template tags"
  on public.template_tags for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own template tags"
  on public.template_tags for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read own template tag links"
  on public.template_tag_links for select
  to authenticated
  using (
    exists (
      select 1
      from public.templates
      where templates.id = template_tag_links.template_id
        and templates.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.template_tags
      where template_tags.id = template_tag_links.tag_id
        and template_tags.user_id = (select auth.uid())
    )
  );

create policy "Users can create own template tag links"
  on public.template_tag_links for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.templates
      where templates.id = template_tag_links.template_id
        and templates.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.template_tags
      where template_tags.id = template_tag_links.tag_id
        and template_tags.user_id = (select auth.uid())
    )
  );

create policy "Users can delete own template tag links"
  on public.template_tag_links for delete
  to authenticated
  using (
    exists (
      select 1
      from public.templates
      where templates.id = template_tag_links.template_id
        and templates.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.template_tags
      where template_tags.id = template_tag_links.tag_id
        and template_tags.user_id = (select auth.uid())
    )
  );

create function public.reorder_templates(ordered_template_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  active_template_count integer;
  requested_template_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  select count(*)
    into active_template_count
  from public.templates
  where user_id = current_user_id
    and archived_at is null;

  select count(distinct requested.id)
    into requested_template_count
  from unnest(ordered_template_ids) as requested(id);

  if requested_template_count <> active_template_count
    or coalesce(array_length(ordered_template_ids, 1), 0) <> active_template_count
    or exists (
      select 1
      from unnest(ordered_template_ids) as requested(id)
      left join public.templates
        on templates.id = requested.id
        and templates.user_id = current_user_id
        and templates.archived_at is null
      where templates.id is null
    )
  then
    raise exception 'The requested order must contain every active template exactly once.';
  end if;

  with active_slots as (
    select
      sort_order,
      row_number() over (order by sort_order, id) as position
    from public.templates
    where user_id = current_user_id
      and archived_at is null
  ),
  requested_order as (
    select id, position
    from unnest(ordered_template_ids) with ordinality as requested(id, position)
  )
  update public.templates as templates
  set sort_order = active_slots.sort_order
  from requested_order
  join active_slots using (position)
  where templates.id = requested_order.id
    and templates.user_id = current_user_id
    and templates.archived_at is null;
end;
$$;

revoke all on function public.reorder_templates(uuid[]) from public, anon;
grant execute on function public.reorder_templates(uuid[]) to authenticated, service_role;

create function public.set_template_tags(target_template_id uuid, selected_tag_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  requested_tag_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not exists (
    select 1
    from public.templates
    where templates.id = target_template_id
      and templates.user_id = current_user_id
  ) then
    raise exception 'Template not found.';
  end if;

  select count(distinct requested.id)
    into requested_tag_count
  from unnest(coalesce(selected_tag_ids, array[]::uuid[])) as requested(id);

  if requested_tag_count <> coalesce(array_length(selected_tag_ids, 1), 0)
    or exists (
      select 1
      from unnest(coalesce(selected_tag_ids, array[]::uuid[])) as requested(id)
      left join public.template_tags
        on template_tags.id = requested.id
        and template_tags.user_id = current_user_id
      where template_tags.id is null
    )
  then
    raise exception 'Every selected tag must belong to the current user and appear once.';
  end if;

  delete from public.template_tag_links
  where template_id = target_template_id
    and tag_id not in (
      select id
      from unnest(coalesce(selected_tag_ids, array[]::uuid[])) as selected(id)
    );

  insert into public.template_tag_links (template_id, tag_id)
  select target_template_id, selected.id
  from unnest(coalesce(selected_tag_ids, array[]::uuid[])) as selected(id)
  on conflict do nothing;
end;
$$;

revoke all on function public.set_template_tags(uuid, uuid[]) from public, anon;
grant execute on function public.set_template_tags(uuid, uuid[]) to authenticated, service_role;
