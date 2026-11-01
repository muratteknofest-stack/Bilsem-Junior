// Auth v2.197.0 contains this managed schema baseline. Source:
// https://github.com/supabase/auth/tree/v2.197.0/migrations
// Checked against source catalog metadata, without reading user records.
export const AUTH_RUNTIME_MIGRATION='20260831180000';
export const AUTH_RUNTIME_TABLES=Object.freeze(["audit_log_entries","custom_oauth_providers","flow_state","identities","instances","mfa_amr_claims","mfa_challenges","mfa_factors","mfa_recovery_code_sets","mfa_recovery_codes","oauth_authorizations","oauth_client_states","oauth_clients","oauth_consents","one_time_tokens","refresh_tokens","saml_providers","saml_relay_states","schema_migrations","scim_tokens","scim_users","sessions","sso_domains","sso_providers","users","webauthn_challenges","webauthn_credentials"]);
export const AUTH_RUNTIME_SCHEMA_SQL=`DO $bilsem_runtime$
BEGIN
 IF EXISTS (SELECT 1 FROM unnest(ARRAY[${AUTH_RUNTIME_TABLES.map(name=>"'"+name+"'").join(',')}]::text[]) AS required(name)
            WHERE to_regclass(format('auth.%I',required.name)) IS NULL) THEN
  RAISE EXCEPTION 'Managed Auth schema is older than the backup baseline';
 END IF;
 IF COALESCE((SELECT max(version) FROM auth.schema_migrations),'') < '${AUTH_RUNTIME_MIGRATION}' THEN
  RAISE EXCEPTION 'Managed Auth migrations are older than the backup baseline';
 END IF;
END $bilsem_runtime$;`;
