const privateInputs = new Set(['BACKUP_ENCRYPTION_KEY', 'SUPABASE_DB_URL', 'RESTORE_DATABASE_URL', 'RESTORE_AUTH_OWNER_DATABASE_URL', 'SUPABASE_ACCESS_TOKEN']);

/** A validated URL/PGHOST alone does not override libpq's PGHOSTADDR or service
 * defaults. Start without inherited PG* settings, then add only the validated
 * local connection when restoring. Archive keys stay in the parent process.
 */
export function postgresChildEnvironment(connection = {}, inherited = process.env) {
  return {
    ...Object.fromEntries(Object.entries(inherited).filter(([name]) => !/^PG/i.test(name) && !privateInputs.has(name.toUpperCase()))),
    ...connection,
  };
}
