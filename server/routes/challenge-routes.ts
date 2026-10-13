import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { getServiceClient } from '../supabase-admin';
import { requireSupabaseAuth, requireVerifiedEmail, requireProfileRole, type AuthenticatedRequest } from '../security';
import { aiLimiter } from '../rate-limiters';
import { sharedRateLimit } from '../shared-rate-limit';
import { generateQuestion } from '../../src/features/questions/generators';
import { isSchoolGrade } from '../../src/features/questions/quality-policy';
import { prepareQuestionReport } from '../support-validation';
import { publicChallenge, answeredChallenge } from '../challenge-validation';
const routes = Router();
routes.use('/challenges', requireSupabaseAuth, requireVerifiedEmail, requireProfileRole('student'), sharedRateLimit('student-challenges', 60, 600), aiLimiter);

routes.get('/challenges/today', async (req: AuthenticatedRequest,res) => {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
  const { data,error } = await getServiceClient().from('daily_challenge_attempts').select('id,slot,points,answered_at')
    .eq('student_id',req.authUser!.uid).eq('day',day).order('slot');
  if (error) throw error;
  res.json({ day, limit: 3, points: data.reduce((sum,row) => sum+row.points,0), completed: data.filter(row => row.answered_at).length });
});
routes.post('/challenges/start', async (req: AuthenticatedRequest,res) => {
  if (!z.object({}).strict().safeParse(req.body || {}).success) return res.status(400).json({error:'Görev seçenekleri sunucu tarafından belirlenir.'});
  const client=getServiceClient();
  const {data:profile,error}=await client.from('profiles').select('grade').eq('id',req.authUser!.uid).single();
  if(error) throw error;
  if(!isSchoolGrade(profile.grade)) return res.status(422).json({error:'Görev için 1–4. sınıf bilgisi gerekli.'});
  const question=generateQuestion({targetGrade:profile.grade,seed:randomInt(1,2147483647)});
  const result=await client.rpc('issue_daily_challenge',{p_student:req.authUser!.uid,p_grade:profile.grade,p_question:question});
  if(result.error) throw result.error;
  if(!result.data) return res.status(409).json({error:'Bugünün üç görevi tamamlandı. Yarın yeniden görüşelim.'});
  return res.json(publicChallenge(result.data));
});
routes.post('/challenges/:id/answer', async (req: AuthenticatedRequest,res) => {
  const parsed=z.object({optionId:z.string().min(1).max(20)}).strict().safeParse(req.body);
  if(!parsed.success || !z.uuid().safeParse(req.params.id).success) return res.status(400).json({error:'Yanıt geçersiz.'});
  const client=getServiceClient();
  const current=await client.from('daily_challenge_attempts').select('id,slot,day,question').eq('id',req.params.id).eq('student_id',req.authUser!.uid).maybeSingle();
  if(current.error) throw current.error;
  if(!current.data) return res.status(404).json({error:'Görev bulunamadı.'});
  publicChallenge(current.data); // Recheck stored content before accepting an answer.
  const {data,error}=await client.rpc('answer_daily_challenge',{p_student:req.authUser!.uid,p_attempt:req.params.id,p_option:parsed.data.optionId});
  if(error?.code==='P0002') return res.status(404).json({error:'Görev bulunamadı.'});
  if(error?.code==='22023') return res.status(422).json({error:'Görevin süresi dolmuş veya seçenek geçersiz. Günün görevlerini yeniden açın.'});
  if(error) throw error;
  return res.json(answeredChallenge(data));
});
routes.post('/challenges/:id/report', async (req: AuthenticatedRequest,res) => {
  const parsed=z.object({reason:z.enum(['answer','unclear','visual','level'])}).strict().safeParse(req.body);
  if(!parsed.success || !z.uuid().safeParse(req.params.id).success) return res.status(400).json({error:'Bildirim geçersiz.'});
  const client=getServiceClient();
  const current=await client.from('daily_challenge_attempts').select('question').eq('id',req.params.id).eq('student_id',req.authUser!.uid).maybeSingle();
  if(current.error) throw current.error;
  if(!current.data) return res.status(404).json({error:'Görev bulunamadı.'});
  const report=prepareQuestionReport({reason:parsed.data.reason,question:current.data.question});
  const result=await client.rpc('submit_support_request',{p_actor:req.authUser!.uid,p_kind:'question',p_key:report.key,p_payload:{...report.payload,challengeId:req.params.id}});
  if(result.error?.code==='P0001') return res.status(429).json({error:'Günlük bildirim sınırına ulaşıldı.'});
  if(result.error) throw result.error;
  return res.status(201).json({id:result.data});
});
export default routes;
