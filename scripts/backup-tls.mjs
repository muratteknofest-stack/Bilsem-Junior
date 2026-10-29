import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash,X509Certificate} from 'node:crypto';

export const BACKUP_CA_PATH=fileURLToPath(new URL('./vendor/supabase-cli-2.81.3/prod-ca-bundle.crt',import.meta.url));
const expectedHash='6ecd239038a7db063a6619b71742372ecfe06c0b0ec12a9993fee4445bf0d4d6';

/** Supabase uses its own CA. Pin the reviewed official CLI bundle rather than
 * weakening verify-full or installing a provider root into global OS trust. */
export function verifyBackupCaBundle(bundle,now=Date.now()){
 try{
  if(createHash('sha256').update(bundle).digest('hex')!==expectedHash||!Number.isFinite(now))throw Error();
  const roots=bundle.toString().match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
  if(roots?.length!==2)throw Error();
  for(const pem of roots){
   const cert=new X509Certificate(pem);
   if(!cert.ca||!cert.verify(cert.publicKey)||now<Date.parse(cert.validFrom)||now>=Date.parse(cert.validTo))throw Error();
  }
  return BACKUP_CA_PATH;
 }catch{throw Error('Supabase yedek CA paketi doğrulanamadı; TLS doğrulaması gevşetilmedi.');}
}

export function backupCaPath(){return verifyBackupCaBundle(readFileSync(BACKUP_CA_PATH));}
