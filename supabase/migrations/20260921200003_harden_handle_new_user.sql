-- This trigger must bypass profiles RLS when Auth creates a user, but it does
-- not need to be callable through the public Data API.
alter function public.handle_new_user()
  set search_path = '';

revoke execute on function public.handle_new_user()
  from public, anon, authenticated;

-- Keep the internal Auth role explicit instead of relying on PUBLIC's default
-- execute grant.
grant execute on function public.handle_new_user()
  to supabase_auth_admin;
