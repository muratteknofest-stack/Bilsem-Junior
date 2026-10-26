import { checkedDeploymentDatabase, vercelEnvironment } from '../shared/supabase-environment.mjs';

try {
  const target = vercelEnvironment(process.env);
  if (target) checkedDeploymentDatabase(process.env, { requireServerKey: true });
  console.log('Deployment database isolation: configuration accepted.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Deployment database isolation: configuration rejected.');
  process.exitCode = 1;
}
