-- Retire the old checkout. Preserve migration history and the empty legacy
-- ledger so existing account-deletion retention checks remain valid.
update public.platform_settings
 set settings = settings - 'shopier', revision = revision + 1, updated_at = now()
 where id = true and settings ? 'shopier';
revoke execute on function public.claim_shopier_access(text,uuid,uuid,text,text,text) from public,anon,authenticated,service_role;
revoke execute on function public.claim_shopier_access_v2(text,uuid,uuid,text,text,text,integer) from public,anon,authenticated,service_role;
revoke insert,update,delete on public.shopier_access_orders from service_role;
