// Keep only a bounded tail: image pull progress can otherwise hide the final
// startup error. Never return raw diagnostics from local or production tools.
export function diagnosticTail(previous,chunk){return (previous+chunk.toString()).slice(-65536);}
export function runtimeFailureCategory(diagnostic){
 return [
  ['DOCKER_UNAVAILABLE',/cannot connect to the docker daemon|docker daemon is not running|permission denied.*docker.sock/i],
  ['IMAGE_UNAVAILABLE',/pull access denied|manifest unknown|unauthorized:|authentication required/i],
  ['DISK_SPACE',/no space left on device/i],
  ['PORT_IN_USE',/port is already allocated|address already in use/i],
  ['AUTH_UNHEALTHY',/supabase_auth[^\n]*(?:unhealthy|not ready)|(?:unhealthy|not ready)[^\n]*supabase_auth/i],
  ['DB_UNHEALTHY',/supabase_db[^\n]*(?:unhealthy|not ready)|(?:unhealthy|not ready)[^\n]*supabase_db/i],
  ['HEALTH_CHECK',/unhealthy|health check|not ready/i],
  ['IMAGE_PULL',/failed to pull|toomanyrequests|error pulling image/i],
  ['NETWORK',/i\/o timeout|TLS handshake timeout|connection refused|no such host|network is unreachable/i],
  ['CONFIGURATION',/invalid config|failed to parse|unknown flag|invalid project/i],
 ].find(([,pattern])=>pattern.test(diagnostic))?.[0]||'COMMAND_FAILED';
}

// Only startup runs here, before any archive is decrypted or imported. Retry
// transport/pull failures at most twice; never ignore unhealthy services or
// turn SQL/auth/permission errors into a successful restore.
export async function startRuntimeWithRetry(start,cleanup,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))){
 for(let attempt=1;attempt<=3;attempt++){
  try{return await start();}catch(error){
   if(attempt===3||!['IMAGE_PULL','NETWORK'].includes(error?.code))throw error;
   await cleanup();
   console.log(`İzole ortam indirmesi yeniden denenecek (${attempt}/2 ${error.code}).`);
   await wait(attempt*2000);
  }
 }
}
