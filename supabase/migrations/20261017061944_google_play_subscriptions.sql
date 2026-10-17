-- Google-authoritative expiry, never a client 'paid' flag. Tokens are encrypted by the server.
create table public.google_play_subscriptions (
 token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),
 parent_id uuid references public.profiles(id) on delete set null,
 student_id uuid references public.profiles(id) on delete set null,
 token_ciphertext text not null check(length(token_ciphertext) between 80 and 8300 and token_ciphertext like 'v1.%'),
 package_name text not null, product_id text not null,
 base_plan_id text not null check(base_plan_id in ('monthly','quarterly','annual')),
 subscription_state text not null check(subscription_state in ('SUBSCRIPTION_STATE_PENDING','SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_PAUSED','SUBSCRIPTION_STATE_IN_GRACE_PERIOD','SUBSCRIPTION_STATE_ON_HOLD','SUBSCRIPTION_STATE_CANCELED','SUBSCRIPTION_STATE_EXPIRED','SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED')),
 expires_at timestamptz, auto_renewing boolean not null, acknowledgement_state text not null check(acknowledgement_state in ('ACKNOWLEDGEMENT_STATE_PENDING','ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED')),
 linked_token_hash text check(linked_token_hash ~ '^[a-f0-9]{64}$'), test_purchase boolean not null,
 verified_at timestamptz not null, created_at timestamptz not null default now()
);
create index google_play_student_lookup on public.google_play_subscriptions(parent_id,student_id,verified_at desc);
create index google_play_student_fk on public.google_play_subscriptions(student_id);
alter table public.google_play_subscriptions enable row level security;
revoke all on public.google_play_subscriptions from public,anon,authenticated;
grant select,insert,update on public.google_play_subscriptions to service_role;

create function public.record_google_play_subscription(p_hash text,p_parent uuid,p_student uuid,p_token text,p_package text,p_product text,p_plan text,p_state text,p_expiry timestamptz,p_renewing boolean,p_ack text,p_linked text,p_verified timestamptz,p_test boolean)
returns text language plpgsql security invoker set search_path='' as $$
declare existing public.google_play_subscriptions%rowtype; linked public.google_play_subscriptions%rowtype; changed integer;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Server verification required' using errcode='42501'; end if;
 if p_parent is null or p_student is null or p_verified is null or p_verified>now()+interval '30 seconds' or p_verified<now()-interval '5 minutes' then raise exception 'Invalid verified purchase' using errcode='22023'; end if;
 perform id from public.profiles where id in (p_parent,p_student) order by id for share;
 if not exists(select 1 from public.profiles where id=p_parent and role='parent' and not deletion_pending and p_student::text=any(linked_student_ids))
 or not exists(select 1 from public.profiles where id=p_student and role='student' and not deletion_pending and linked_parent_id=p_parent::text) then raise exception 'Family ownership mismatch' using errcode='42501'; end if;
 if not exists(select 1 from public.google_play_purchase_bindings where parent_id=p_parent and student_id=p_student) then raise exception 'Prepared binding required' using errcode='42501'; end if;
 -- Deterministic ordering also protects linked-token ownership across concurrent requests.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v,38)) from (select distinct v from unnest(array[p_hash,p_linked]) v where v is not null order by v) locked;
 select * into existing from public.google_play_subscriptions where token_hash=p_hash;
 if found and (existing.parent_id is distinct from p_parent or existing.student_id is distinct from p_student or existing.package_name is distinct from p_package or existing.product_id is distinct from p_product) then raise exception 'Purchase already assigned' using errcode='40001'; end if;
 if p_linked is not null then
  select * into linked from public.google_play_subscriptions where token_hash=p_linked;
  if found and (linked.parent_id is distinct from p_parent or linked.student_id is distinct from p_student) then raise exception 'Linked purchase already assigned' using errcode='40001'; end if;
 end if;
 insert into public.google_play_subscriptions(token_hash,parent_id,student_id,token_ciphertext,package_name,product_id,base_plan_id,subscription_state,expires_at,auto_renewing,acknowledgement_state,linked_token_hash,verified_at,test_purchase)
 values(p_hash,p_parent,p_student,p_token,p_package,p_product,p_plan,p_state,p_expiry,p_renewing,p_ack,p_linked,p_verified,p_test)
 on conflict(token_hash) do update set token_ciphertext=excluded.token_ciphertext,base_plan_id=excluded.base_plan_id,subscription_state=excluded.subscription_state,expires_at=excluded.expires_at,auto_renewing=excluded.auto_renewing,acknowledgement_state=excluded.acknowledgement_state,linked_token_hash=excluded.linked_token_hash,verified_at=excluded.verified_at,test_purchase=excluded.test_purchase
 where public.google_play_subscriptions.verified_at<excluded.verified_at;
 get diagnostics changed = row_count;
 if changed=0 then raise exception 'Stale verification, retry' using errcode='40001'; end if;
 return p_hash;
end $$;
revoke all on function public.record_google_play_subscription(text,uuid,uuid,text,text,text,text,text,timestamptz,boolean,text,text,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.record_google_play_subscription(text,uuid,uuid,text,text,text,text,text,timestamptz,boolean,text,text,timestamptz,boolean) to service_role;

-- Match the existing billing-retention review before freezing a family for deletion.
create function public.check_google_play_deletion_retention() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.deletion_pending and not old.deletion_pending then
  if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Server deletion workflow required' using errcode='42501'; end if;
  if exists(select 1 from public.google_play_subscriptions where parent_id=new.id or student_id=new.id) then raise exception 'Billing retention review required' using errcode='P0001'; end if;
 end if;
 return new;
end $$;
revoke all on function public.check_google_play_deletion_retention() from public,anon,authenticated;
grant execute on function public.check_google_play_deletion_retention() to service_role;
create trigger check_google_play_deletion_retention before update of deletion_pending on public.profiles for each row execute function public.check_google_play_deletion_retention();

-- Prepared parent/student bindings allow RTDN recovery if the app closes before verify.
create table public.google_play_purchase_bindings (
 account_hash text not null check(account_hash ~ '^[a-f0-9]{64}$'),
 profile_hash text not null check(profile_hash ~ '^[a-f0-9]{64}$'),
 parent_id uuid not null references public.profiles(id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(account_hash,profile_hash),
 unique(parent_id,student_id)
);
create index google_play_binding_student_fk on public.google_play_purchase_bindings(student_id);
alter table public.google_play_purchase_bindings enable row level security;
revoke all on public.google_play_purchase_bindings from public,anon,authenticated;
grant select,insert on public.google_play_purchase_bindings to service_role;
create function public.prepare_google_play_binding(p_parent uuid,p_student uuid,p_account text,p_profile text) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Server binding required' using errcode='42501'; end if;
 perform id from public.profiles where id in (p_parent,p_student) order by id for share;
 if not exists(select 1 from public.profiles where id=p_parent and role='parent' and not deletion_pending and p_student::text=any(linked_student_ids))
 or not exists(select 1 from public.profiles where id=p_student and role='student' and not deletion_pending and linked_parent_id=p_parent::text) then raise exception 'Family ownership mismatch' using errcode='42501'; end if;
 insert into public.google_play_purchase_bindings(account_hash,profile_hash,parent_id,student_id) values(p_account,p_profile,p_parent,p_student)
 on conflict(account_hash,profile_hash) do nothing;
 if not exists(select 1 from public.google_play_purchase_bindings where account_hash=p_account and profile_hash=p_profile and parent_id=p_parent and student_id=p_student) then raise exception 'Binding already assigned' using errcode='40001'; end if;
 return true;
end $$;
revoke all on function public.prepare_google_play_binding(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.prepare_google_play_binding(uuid,uuid,text,text) to service_role;
