-- Re-enable only the current server-verified RPC. Browsers retain no ledger access.
set lock_timeout = '5s';
revoke all on public.shopier_access_orders from public, anon, authenticated;
grant select, insert on public.shopier_access_orders to service_role;
revoke all on function public.claim_shopier_access_v2(text,uuid,uuid,text,text,text,integer) from public, anon, authenticated;
grant execute on function public.claim_shopier_access_v2(text,uuid,uuid,text,text,text,integer) to service_role;
-- The legacy RPC remains retired; no status or duration can be submitted by a browser.
