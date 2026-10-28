import {z} from 'zod';

const responseSchema=z.discriminatedUnion('mode',[
 z.object({mode:z.enum(['choice','place']),optionId:z.string().nullable()}),
 z.object({mode:z.literal('number'),value:z.string()}),
 z.object({mode:z.literal('order'),slots:z.array(z.string().nullable())}),
 z.object({mode:z.literal('match'),pairs:z.record(z.string(),z.string().nullable()),total:z.string()}),
]);
const resultSchema=z.object({totalQuestions:z.number(),correctAnswers:z.number(),wrongAnswers:z.number(),blankAnswers:z.number(),scorePercentage:z.number(),xp:z.number(),totalTimeSeconds:z.number()});
const sessionSchema=z.object({id:z.string().uuid(),student_id:z.string().uuid(),mode:z.enum(['practice','adaptive','exam']),title:z.string(),created_at:z.string(),expires_at:z.string(),finished_at:z.string().nullable(),answers:z.record(z.string(),z.object({response:responseSchema,correct:z.boolean().optional(),xp:z.number().optional()})),result:resultSchema.nullable()});

/** Only the learner's submissions and released grading belong in an export. */
export function exportLearningSession(value:unknown){
 const row=sessionSchema.parse(value),reveal=row.mode!=='exam'||!!row.finished_at;
 return {...row,result:row.finished_at?row.result:null,answers:Object.fromEntries(Object.entries(row.answers).map(([index,answer])=>[index,reveal?answer:{response:answer.response}]))};
}

const supportRequestSchema=z.object({
 id:z.uuid(),actor_id:z.uuid(),kind:z.enum(['question','deletion']),
 status:z.enum(['open','reviewing','resolved','dismissed']),created_at:z.string(),updated_at:z.string(),
 payload:z.object({
  reason:z.enum(['answer','unclear','visual','level']).optional(),
  scope:z.enum(['self','family']).optional(),confirmedAt:z.string().optional(),
  question:z.object({id:z.string().max(160),type:z.string().max(80),prompt:z.string().max(4000)}).optional(),
 }),
});

/** User-facing request data only; internal reviewer notes and answer keys stay private. */
export function exportSupportRequest(value:unknown,allowedActorIds:readonly string[]){
 const row=supportRequestSchema.parse(value);
 if(!allowedActorIds.includes(row.actor_id))throw Error('Account request scope could not be verified.');
 return row;
}
