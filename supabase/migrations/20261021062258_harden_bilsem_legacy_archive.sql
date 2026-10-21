-- Retired functions are not client-callable. Fix their search path as well;
-- function_manifest retains the original source for audited recovery.
do $$ declare fn record; begin
  for fn in select p.proname,pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='bilsem_legacy' loop
    execute format('alter function bilsem_legacy.%I(%s) set search_path = %L',fn.proname,fn.args,'');
  end loop;
end $$;
