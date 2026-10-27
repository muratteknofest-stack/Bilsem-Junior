import express,{ Router } from 'express';
import {z} from 'zod';
import { requireSupabaseAuth,requireVerifiedEmail,requireProfileRole,type AuthenticatedRequest } from '../security';
import { requireLearningAccess } from '../membership-access';
import { GooglePlayError } from '../google-play-model';
import { LESSON_CATALOG } from '../../src/features/lessons/catalog';
import { lessonDocument } from '../lesson-content';
import {LESSON_AUDIO_BUCKET,LESSON_AUDIO_LIMIT,audioMetadataSchema,audioType,saveLessonAudio,withLessonAudio} from '../lesson-audio';
import {getServiceClient} from '../supabase-admin';
import {sharedRateLimit} from '../shared-rate-limit';
const routes=Router();
routes.use('/student/lessons',requireSupabaseAuth,requireVerifiedEmail,requireProfileRole('student'));
routes.get('/student/lessons/access',async(req:AuthenticatedRequest,res)=>{
 try {await requireLearningAccess(req.authUser!.uid);return res.json({fullAccess:true});}
 catch(error){if(error instanceof GooglePlayError&&error.status===403)return res.json({fullAccess:false});throw error;}
});
routes.get('/student/lessons/:id',async(req:AuthenticatedRequest,res)=>{
 const card=LESSON_CATALOG.find(item=>item.id===req.params.id);
 if(!card)return res.status(404).json({error:'Anlatım bulunamadı.'});
 if(!card.preview)try{await requireLearningAccess(req.authUser!.uid);}catch(error){if(error instanceof GooglePlayError)return res.status(error.status).json({error:error.message,code:error.status===403?'LESSON_MEMBERSHIP_REQUIRED':'LESSON_ACCESS_UNAVAILABLE'});throw error;}
 return res.json(await withLessonAudio(lessonDocument(card.id)!));
});
routes.get('/student/lessons/:id/audio/:step',async(req:AuthenticatedRequest,res)=>{
 const card=LESSON_CATALOG.find(item=>item.id===req.params.id),step=z.coerce.number().int().min(0).max(3).safeParse(req.params.step);
 if(!card||!step.success)return res.status(404).json({error:'Ses kaydı bulunamadı.'});
 if(!card.preview)try{await requireLearningAccess(req.authUser!.uid);}catch(error){if(error instanceof GooglePlayError)return res.status(error.status).json({error:error.message});throw error;}
 const lesson=lessonDocument(card.id)!,client=getServiceClient();
 const row=await client.from('lesson_audio').select('object_path,content_type').eq('lesson_id',card.id).eq('lesson_version',lesson.version).eq('step',step.data).maybeSingle();
 if(row.error)throw Error('Ses bilgisi okunamadı.');if(!row.data)return res.status(404).json({error:'Bu adımın insan seslendirmesi henüz eklenmedi.'});
 const object=await client.storage.from(LESSON_AUDIO_BUCKET).download(row.data.object_path);if(object.error||!object.data)throw Error('Ses yüklenemedi.');
 if(object.data.size>LESSON_AUDIO_LIMIT)throw Error('Ses boyutu sınırı aşıldı.');
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.type(row.data.content_type).send(Buffer.from(await object.data.arrayBuffer()));
});
routes.use('/admin/lesson-audio',requireSupabaseAuth,requireVerifiedEmail,requireProfileRole('admin'));
routes.get('/admin/lesson-audio',async(_req,res)=>{
 const result=await getServiceClient().from('lesson_audio').select('lesson_id,lesson_version,step,narrator,rights_reference,bytes,updated_at').order('lesson_id');if(result.error)throw Error('Ses kayıtları yüklenemedi.');
 res.json({recordings:result.data});
});
routes.get('/admin/lesson-audio/:id/script',async(req,res)=>{
 const lesson=lessonDocument(String(req.params.id));if(!lesson)return res.status(404).json({error:'Anlatım bulunamadı.'});return res.json(lesson);
});
routes.put('/admin/lesson-audio/:id/:step',sharedRateLimit('lesson_audio_upload',20,60),express.raw({type:'application/octet-stream',limit:LESSON_AUDIO_LIMIT}),async(req:AuthenticatedRequest,res)=>{
 const card=LESSON_CATALOG.find(item=>item.id===req.params.id),step=z.coerce.number().int().min(0).max(3).safeParse(req.params.step);
 if(!card||!step.success)return res.status(400).json({error:'Konu veya adım geçersiz.'});
 let metadata:unknown;try{metadata=JSON.parse(decodeURIComponent(req.header('X-Lesson-Metadata')||''));}catch{return res.status(400).json({error:'Anlatıcı ve kullanım hakkı bilgileri gerekli.'});}
 const parsed=audioMetadataSchema.safeParse(metadata);
 if(!parsed.success||!Buffer.isBuffer(req.body)||!audioType(req.body))return res.status(400).json({error:'En fazla 3 MB MP3/WAV, anlatıcı adı, kullanım hakkı kaydı ve insan kaydı beyanı gerekli.'});
 await saveLessonAudio(lessonDocument(card.id)!,step.data,req.body,parsed.data,req.authUser!.uid);
 return res.status(201).json({saved:true});
});
export default routes;
