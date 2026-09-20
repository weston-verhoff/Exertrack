alter table public.templates
  add column if not exists archived_at timestamptz;

comment on column public.templates.archived_at is
  'The time this template was archived; null means the template is active.';

create index if not exists templates_user_id_archived_at_idx
  on public.templates (user_id, archived_at);
