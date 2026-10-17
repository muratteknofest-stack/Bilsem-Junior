create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
      and u.raw_app_meta_data->>'role' = 'admin'
  )
$$;
