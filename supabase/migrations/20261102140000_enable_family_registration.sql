-- Enable family registration in platform_settings
update public.platform_settings
set settings = jsonb_set(
  coalesce(settings, '{}'::jsonb),
  '{release}',
  coalesce(settings->'release', '{}'::jsonb) || '{"registrationEnabled": true}'::jsonb
),
revision = revision + 1,
updated_at = now()
where id = true;
