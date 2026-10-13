import {z} from 'zod';
export const historySchema=z.object({sessions:z.array(z.object({id:z.string().uuid(),mode:z.enum(['practice','adaptive','exam']),created_at:z.string(),expires_at:z.string(),finished_at:z.string().nullable(),result:z.object({totalQuestions:z.number(),correctAnswers:z.number(),wrongAnswers:z.number(),blankAnswers:z.number(),scorePercentage:z.number(),xp:z.number(),totalTimeSeconds:z.number()}).nullable(),selection:z.object({locale:z.enum(['tr','en']).optional()}).passthrough().nullable().optional()})).max(50)});
export type HistoryItem=z.infer<typeof historySchema>['sessions'][number];
export function englishAccountError(error:unknown){
 const e=error as {code?:string;status?:number;message?:string};
 const messages:Record<string,string>={invalid_credentials:'The sign-in details do not match. Check your email or student code and password.',email_not_confirmed:'Confirm your parent email before signing in. Use the confirmation link or request another email.',ACCOUNT_EXISTS:'This email already has an account. Try signing in or resetting your password.',PASSWORD_COMPROMISED:'Choose a different password. This password appeared in a known data breach.',POLICY_UPDATED:'The privacy notice changed. Refresh this page and review it again.',REGISTRATION_NOT_READY:'New accounts are currently unavailable. Existing accounts can still sign in.',INVALID_REGISTRATION:'Check the required fields and use different strong passwords for parent and student.',NETWORK_ERROR:'The server could not be reached. If you submitted registration, try signing in before creating another account.'};
 if(e.code&&messages[e.code])return messages[e.code];
 if(e.status===429||e.code==='over_request_rate_limit')return 'Too many attempts. Please wait before trying again.';
 if(e.message&&/^[\x20-\x7E’·–—]+$/.test(e.message)&&e.message.length<180&&!/token|key|SQL|fetch|JSON/i.test(e.message))return e.message;
 return 'The request could not complete. Check your connection and try again. For account help, contact zeka.kupu.test@gmail.com.';
}
