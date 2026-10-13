-- Server-verified Shopier receipts; clients never write or read this ledger directly.
create table public.shopier_access_orders (
  order_id text primary key check (order_id ~ '^[A-Za-z0-9_-]{1,80}$'),
  parent_id uuid references public.profiles(id) on delete set null,
  student_id uuid references public.profiles(id) on delete set null,
  product_id text not null,
  plan_id text not null check (plan_id in ('monthly','quarterly')),
  duration_days integer not null check (duration_days in (30,90)),
  amount_kurus integer not null check (amount_kurus in (29900,79900)),
  buyer_email_sha256 text not null check (buyer_email_sha256 ~ '^[a-f0-9]{64}$'),
  activated_at timestamptz not null default now(),
  check ((plan_id='monthly' and duration_days=30 and amount_kurus=29900) or (plan_id='quarterly' and duration_days=90 and amount_kurus=79900))
);
alter table public.shopier_access_orders enable row level security;
revoke all on public.shopier_access_orders from public,anon,authenticated;
grant select,insert on public.shopier_access_orders to service_role;
create index shopier_access_student_idx on public.shopier_access_orders(student_id,activated_at);
create index shopier_access_parent_idx on public.shopier_access_orders(parent_id);

create function public.claim_shopier_access(p_order text,p_parent uuid,p_student uuid,p_product text,p_plan text,p_buyer_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.shopier_access_orders%rowtype; parent public.profiles%rowtype; child public.profiles%rowtype;
begin
  if coalesce((select auth.jwt()->>'role'),'')<>'service_role' then raise exception 'Server verification required' using errcode='42501'; end if;
  if p_order is null or p_order !~ '^[A-Za-z0-9_-]{1,80}$' or p_product is null or length(p_product) not between 1 and 80
    or p_plan is null or p_plan not in ('monthly','quarterly') or p_buyer_hash is null or p_buyer_hash !~ '^[a-f0-9]{64}$'
    then raise exception 'Invalid verified receipt' using errcode='22023'; end if;
  select * into parent from public.profiles where id=p_parent for share;
  select * into child from public.profiles where id=p_student for share;
  if parent.id is null or child.id is null or parent.role<>'parent' or child.role<>'student'
    or child.linked_parent_id is distinct from p_parent::text or not coalesce(p_student::text=any(parent.linked_student_ids),false)
    then raise exception 'Family ownership required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('shopier:'||p_order,0));
  select * into existing from public.shopier_access_orders where order_id=p_order;
  if found then
    if existing.parent_id is distinct from p_parent or existing.student_id is distinct from p_student
      or existing.product_id<>p_product or existing.plan_id<>p_plan or existing.buyer_email_sha256<>p_buyer_hash
      then raise exception 'Order already assigned' using errcode='40001'; end if;
    return to_jsonb(existing);
  end if;
  insert into public.shopier_access_orders(order_id,parent_id,student_id,product_id,plan_id,duration_days,amount_kurus,buyer_email_sha256)
    values(p_order,p_parent,p_student,p_product,p_plan,case p_plan when 'monthly' then 30 else 90 end,
      case p_plan when 'monthly' then 29900 else 79900 end,p_buyer_hash) returning * into existing;
  return to_jsonb(existing);
end $$;
revoke all on function public.claim_shopier_access(text,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.claim_shopier_access(text,uuid,uuid,text,text,text) to service_role;
