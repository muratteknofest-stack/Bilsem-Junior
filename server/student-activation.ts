export interface StudentActivationAdminClient {
  getUserById(id: string): Promise<{ data: { user: { email_confirmed_at?: string | null } | null }; error: any }>;
  updateUserById(id: string, attributes: { email_confirm: boolean }): Promise<{ data: any; error: any }>;
}

/**
 * Concurrently activates all unconfirmed student accounts linked to a parent
 * using Promise.all instead of sequential N+1 Auth Admin round-trips.
 */
export async function activateUnconfirmedStudents(
  children: Array<{ id: string }>,
  authAdmin: StudentActivationAdminClient,
): Promise<number> {
  if (!children.length) return 0;
  const flags = await Promise.all(
    children.map(async (child) => {
      const user = await authAdmin.getUserById(child.id);
      if (user.error) throw user.error;
      if (!user.data?.user?.email_confirmed_at) {
        const result = await authAdmin.updateUserById(child.id, { email_confirm: true });
        if (result.error) throw result.error;
        return 1;
      }
      return 0;
    }),
  );
  return flags.reduce<number>((sum, val) => sum + val, 0);
}
