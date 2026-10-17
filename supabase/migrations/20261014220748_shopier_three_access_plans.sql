-- Three launch plans. Keep historical 799 TL quarterly receipts and the legacy
-- server-only function valid while old deployments finish draining.
set lock_timeout = '5s';
alter table public.shopier_access_orders
  drop constraint shopier_access_orders_plan_id_check,
  drop constraint shopier_access_orders_duration_days_check,
  drop constraint shopier_access_orders_amount_kurus_check,
  drop constraint shopier_access_orders_check,
  add constraint shopier_access_orders_plan_id_check check (plan_id in ('monthly','quarterly','annual')),
  add constraint shopier_access_orders_duration_days_check check (duration_days in (30,90,365)),
  add constraint shopier_access_orders_amount_kurus_check check (amount_kurus in (29900,69900,79900,149900)),
  add constraint shopier_access_orders_check check (
    (plan_id='monthly' and duration_days=30 and amount_kurus=29900)
    or (plan_id='quarterly' and duration_days=90 and amount_kurus in (69900,79900))
    or (plan_id='annual' and duration_days=365 and amount_kurus=149900)
  );

-- A unique RPC name avoids PostgREST overload ambiguity. Only the backend can
-- submit a verified amount; browser requests still contain only order/student IDs.
create function public.claim_shopier_access_v2(p_order text,p_parent uuid,p_student uuid,p_product text,p_plan text,p_buyer_hash text,p_amount integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.shopier_access_orders%rowtype; parent public.profiles%rowtype; child public.profiles%rowtype; days integer; expected_amount integer;
begin
  if coalesce((select auth.jwt()->>'role'),'')<>'service_role' then raise exception 'Server verification required' using errcode='42501'; end if;
  if p_order is null or p_order !~ '^[A-Za-z0-9_-]{1,80}$' or p_product is null or length(p_product) not between 1 and 80
    or p_plan is null or p_plan not in ('monthly','quarterly','annual') or p_buyer_hash is null or p_buyer_hash !~ '^[a-f0-9]{64}$'
    then raise exception 'Invalid verified receipt' using errcode='22023'; end if;
  days := case p_plan when 'monthly' then 30 when 'quarterly' then 90 else 365 end;
  expected_amount := case p_plan when 'monthly' then 29900 when 'quarterly' then 69900 else 149900 end;
  if p_amount is null or p_amount<>expected_amount then raise exception 'Verified amount mismatch' using errcode='22023'; end if;
  select * into parent from public.profiles where id=p_parent for share;
  select * into child from public.profiles where id=p_student for share;
  if parent.id is null or child.id is null or parent.role<>'parent' or child.role<>'student'
    or child.linked_parent_id is distinct from p_parent::text or not coalesce(p_student::text=any(parent.linked_student_ids),false)
    then raise exception 'Family ownership required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('shopier:'||p_order,0));
  select * into existing from public.shopier_access_orders where order_id=p_order;
  if found then
    if existing.parent_id is distinct from p_parent or existing.student_id is distinct from p_student
      or existing.product_id<>p_product or existing.plan_id<>p_plan or existing.amount_kurus<>p_amount or existing.duration_days<>days or existing.buyer_email_sha256<>p_buyer_hash
      then raise exception 'Order already assigned' using errcode='40001'; end if;
    return to_jsonb(existing);
  end if;
  insert into public.shopier_access_orders(order_id,parent_id,student_id,product_id,plan_id,duration_days,amount_kurus,buyer_email_sha256)
    values(p_order,p_parent,p_student,p_product,p_plan,days,p_amount,p_buyer_hash) returning * into existing;
  return to_jsonb(existing);
end $$;
revoke all on function public.claim_shopier_access_v2(text,uuid,uuid,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.claim_shopier_access_v2(text,uuid,uuid,text,text,text,integer) to service_role;
