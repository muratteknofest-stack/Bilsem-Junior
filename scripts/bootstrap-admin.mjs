// Run from a trusted server after configuring Auth redirects and SMTP.
// No password or service key should be passed on the command line.
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !url || !key) {
  console.error('Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/bootstrap-admin.mjs admin@example.com');
  process.exitCode = 1;
} else {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: invited, error: inviteError } = await client.auth.admin.inviteUserByEmail(email);
  if (inviteError || !invited.user) throw inviteError ?? new Error('Yönetici daveti oluşturulamadı.');

  const userId = invited.user.id;
  const { error: claimError } = await client.auth.admin.updateUserById(userId, {
    app_metadata: { ...invited.user.app_metadata, role: 'admin' },
  });
  if (claimError) throw claimError;

  const { error: profileError } = await client.from('profiles').insert({
    id: userId, email, name: 'Yönetici', role: 'admin', avatar: '🛡️',
    created_at: Date.now(), updated_at: Date.now(),
  });
  if (profileError) throw profileError;
  console.log('Yönetici daveti gönderildi. E-posta onayından sonra giriş yapabilir.');
}
