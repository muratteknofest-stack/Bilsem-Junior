import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {getServiceClient} from './supabase-admin';
import type {LessonDocument} from '../src/features/lessons/catalog';
export const LESSON_AUDIO_BUCKET='bilsem-lesson-audio';
export const LESSON_AUDIO_LIMIT=3*1024*1024;
export const audioMetadataSchema=z.object({narrator:z.string().trim().min(2).max(120),rightsReference:z.string().trim().min(12).max(500),humanRecording:z.literal(true)}).strict();
export function audioType(bytes:Buffer):{mime:string;extension:string}|null{
 if(bytes.length<32||bytes.length>LESSON_AUDIO_LIMIT)return null;
 if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WAVE')return{mime:'audio/wav',extension:'wav'};
 if(bytes.toString('ascii',0,3)==='ID3'||(bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0&&(bytes[1]&0x06)!==0))return{mime:'audio/mpeg',extension:'mp3'};
 return null;
}
export async function withLessonAudio(lesson:LessonDocument):Promise<LessonDocument>{
 const {data,error}=await getServiceClient().from('lesson_audio').select('step,narrator').eq('lesson_id',lesson.id).eq('lesson_version',lesson.version);
 if(error)throw Error('Anlatım ses bilgisi yüklenemedi.');
 const audio=[...lesson.audio];for(const row of data||[])if(Number.isInteger(row.step)&&row.step>=0&&row.step<4)audio[row.step]={narrator:row.narrator,source:'human-recording',url:`/api/student/lessons/${lesson.id}/audio/${row.step}`};
 return {...lesson,audio};
}
export async function saveLessonAudio(lesson:LessonDocument,step:number,bytes:Buffer,metadata:z.infer<typeof audioMetadataSchema>,actor:string){
 const type=audioType(bytes);if(!type)throw Error('MP3 veya WAV kaydı bekleniyor.');
 const client=getServiceClient(),path=`${lesson.id}/v${lesson.version}/${step}-${randomUUID()}.${type.extension}`;
 const upload=await client.storage.from(LESSON_AUDIO_BUCKET).upload(path,bytes,{contentType:type.mime,upsert:false});if(upload.error)throw Error('Ses kaydı yüklenemedi.');
 const write=await client.from('lesson_audio').upsert({lesson_id:lesson.id,lesson_version:lesson.version,step,object_path:path,narrator:metadata.narrator,rights_reference:metadata.rightsReference,human_recording:true,content_type:type.mime,bytes:bytes.length,uploaded_by:actor,updated_at:new Date().toISOString()},{onConflict:'lesson_id,lesson_version,step'});
 if(write.error){await client.storage.from(LESSON_AUDIO_BUCKET).remove([path]);throw Error('Ses kaydının bilgileri kaydedilemedi.');}
}
