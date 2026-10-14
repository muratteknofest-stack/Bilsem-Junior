import { Router } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getServiceClient } from '../supabase-admin';
import { requireSupabaseAuth, requireVerifiedEmail, requireProfileRole, type AuthenticatedRequest } from '../security';
import { accountSecurityLimiter, adminAiLimiter } from '../rate-limiters';
import { sharedRateLimit } from '../shared-rate-limit';
import { prepareQuestionReport, reviewRequestSchema, mayReviewRequest } from '../support-validation';
import {readQuestionPages} from '../question-pages';
import {exportLearningSession} from '../account-export';
import {deletionConfirmation, deletionPreview, executeDeletion, DeletionError} from '../account-deletion';

const routes = Router();
const access = [requireSupabaseAuth, requireVerifiedEmail];
const EXPORT_PROFILE_COLUMNS = 'id,email,name,role,student_code,linked_student_ids,linked_parent_id,grade,exam_focus,parent_phone,recovery_email,consent,avatar,level,xp,streak,longest_streak,last_active_date,today_practiced,streak_freeze_count,claimed_streak_days,weekly_streak_history,daily_goal_minutes,today_minutes_spent,daily_goal_questions,today_questions_solved,daily_goal_sessions,today_sessions_completed,sound_enabled,total_questions_solved,resolved_mistakes_count,featured_badge_ids,reminder_config,total_points,last_login_at,created_at,updated_at';

routes.post('/questions/report', ...access, requireProfileRole('student','parent','admin'), sharedRateLimit('support-report', 20, 3600), async (req: AuthenticatedRequest, res) => {
  let report;
  try { report = prepareQuestionReport(req.body); }
  catch { return res.status(400).json({ error: 'Bildirimdeki soru bilgileri geçersiz.' }); }
  const { data, error } = await getServiceClient().rpc('submit_support_request', {
    p_actor: req.authUser!.uid, p_kind: 'question', p_key: report.key, p_payload: report.payload,
  });
  if (error?.code === 'P0001') return res.status(429).json({ error: 'Günlük bildirim sınırına ulaşıldı.' });
  if (error) throw error;
  return res.status(201).json({ id: data, message: 'Bildirim inceleme kuyruğuna kaydedildi.' });
});

routes.get('/account/requests', ...access, async (req: AuthenticatedRequest, res) => {
  const { data, error } = await getServiceClient().from('support_requests')
    .select('id,kind,status,created_at,updated_at').eq('actor_id', req.authUser!.uid).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return res.json({ requests: data });
});
routes.post('/account/deletion-request', ...access, accountSecurityLimiter, requireProfileRole('parent','student'), sharedRateLimit('account-deletion', 6, 3600), async (req: AuthenticatedRequest, res) => {
  if (!z.object({ confirmed: z.literal(true) }).strict().safeParse(req.body).success)
    return res.status(400).json({ error: 'Silme talebi için onay gerekli.' });
  const client = getServiceClient();
  const { data: profile, error: profileError } = await client.from('profiles').select('role,linked_parent_id').eq('id', req.authUser!.uid).single();
  if (profileError) throw profileError;
  if (profile.linked_parent_id) return res.status(403).json({ error: 'Aile hesabı silme talebini veli oluşturmalıdır.' });
  const { data, error } = await client.rpc('submit_support_request', { p_actor: req.authUser!.uid,
    p_kind: 'deletion', p_key: createHash('sha256').update('account-deletion').digest('hex'),
    p_payload: { scope: profile.role === 'parent' ? 'family' : 'self', confirmedAt: new Date().toISOString() } });
  if (error?.code === 'P0001') return res.status(429).json({ error: 'Günlük talep sınırına ulaşıldı.' });
  if (error) throw error;
  return res.status(201).json({ id: data });
});
routes.get('/account/export', ...access, accountSecurityLimiter, sharedRateLimit('account-export', 6, 3600), async (req: AuthenticatedRequest, res) => {
  const client = getServiceClient();
  const { data: owner, error } = await client.from('profiles').select(EXPORT_PROFILE_COLUMNS).eq('id', req.authUser!.uid).single();
  if (error) throw error;
  let profiles = [owner];
  if (owner.role === 'parent' && owner.linked_student_ids?.length) {
    const children = await client.from('profiles').select(EXPORT_PROFILE_COLUMNS).in('id', owner.linked_student_ids)
      .eq('linked_parent_id', owner.id).eq('role', 'student');
    if (children.error) throw children.error;
    profiles = profiles.concat(children.data || []);
  }
  const progress = await client.from('user_private_state').select('*').in('user_id', profiles.map(p => p.id));
  if (progress.error) throw progress.error;
  const exportedAt=new Date().toISOString(),ids=profiles.map(p=>p.id);
  const challenges=await readQuestionPages<{id:string}>(async(afterId,size)=>{
    let query=client.from('daily_challenge_attempts').select('id,student_id,day,slot,grade,selected_option,correct,points,answered_at,created_at').in('student_id',ids).lte('created_at',exportedAt).order('id').limit(size);
    if(afterId)query=query.gt('id',afterId);
    return await query;
  },'Account data could not be exported completely.');
  const sessions=await readQuestionPages<{id:string}>(async(afterId,size)=>{
    let query=client.from('learning_sessions').select('id,student_id,mode,title,created_at,expires_at,finished_at,answers,result').in('student_id',ids).lte('created_at',exportedAt).order('id').limit(size);
    if(afterId)query=query.gt('id',afterId);
    return await query;
  },'Account data could not be exported completely.');
  res.setHeader('Content-Disposition', 'attachment; filename="zekapark-hesap-verilerim.json"');
  return res.json({ format: 'zekapark-account-export-v1', exportedAt, profiles, progress: progress.data, dailyChallenges: challenges, learningSessions:sessions.map(exportLearningSession) });
});

routes.get('/admin/question-review-summary', ...access, requireProfileRole('admin'), adminAiLimiter, async(_req,res)=>{
  const result=await getServiceClient().rpc('question_review_summary');
  if(result.error)throw result.error;
  return res.json({grades:result.data});
});
routes.get('/admin/support-requests', ...access, adminAiLimiter, requireProfileRole('admin'), async (req, res) => {
  const status = z.enum(['open','reviewing','resolved','dismissed']).safeParse(req.query.status || 'open');
  if (!status.success) return res.status(400).json({ error: 'Geçersiz durum.' });
  const { data, error } = await getServiceClient().from('support_requests').select('*').eq('status', status.data).order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return res.json({ requests: data });
});
routes.get('/admin/support-requests/:id/deletion', ...access, requireProfileRole('admin'), accountSecurityLimiter, async(req,res)=>{
  const id=z.uuid().safeParse(req.params.id);
  if(!id.success)return res.status(400).json({error:'Talep kimliği geçersiz.'});
  try{return res.json(await deletionPreview(id.data));}
  catch(error){if(error instanceof DeletionError)return res.status(error.status).json({error:error.message});throw error;}
});
routes.post('/admin/support-requests/:id/complete-deletion', ...access, requireProfileRole('admin'), accountSecurityLimiter, sharedRateLimit('account-deletion-complete',6,3600), async(req:AuthenticatedRequest,res)=>{
  const parsed=deletionConfirmation.safeParse(req.body);
  const id=z.uuid().safeParse(req.params.id);
  if(!parsed.success||!id.success)return res.status(400).json({error:'Silme kapsamı ve saklama incelemesi açıkça onaylanmalı.'});
  try{return res.json(await executeDeletion(id.data,req.authUser!.uid,parsed.data.members));}
  catch(error){if(error instanceof DeletionError)return res.status(error.status).json({error:error.message});throw error;}
});
routes.post('/admin/support-requests/:id', ...access, adminAiLimiter, requireProfileRole('admin'), sharedRateLimit('admin-support-review', 60, 600), async (req: AuthenticatedRequest, res) => {
  const parsed = reviewRequestSchema.safeParse(req.body);
  if (!parsed.success || !z.uuid().safeParse(req.params.id).success) return res.status(400).json({ error: 'İnceleme bilgileri geçersiz.' });
  const client = getServiceClient();
  const current = await client.from('support_requests').select('kind').eq('id', req.params.id).maybeSingle();
  if (current.error) throw current.error;
  if (!current.data) return res.status(404).json({ error: 'Talep bulunamadı.' });
  if (!mayReviewRequest(current.data.kind, parsed.data.status)) return res.status(422).json({ error: 'Hesap silme, veri ve saklama kapsamı kontrol edilerek ayrı işlemle tamamlanmalıdır. Buradan yalnızca incelemeye alınabilir.' });
  const { error } = await client.from('support_requests').update({ ...parsed.data, reviewed_by: req.authUser!.uid, updated_at: new Date().toISOString() }).eq('id', req.params.id);
  if (error) throw error;
  return res.json({ success: true });
});
export default routes;
