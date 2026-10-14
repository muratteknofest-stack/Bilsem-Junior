import {z} from 'zod';

const accountCount=z.number().int().min(1).max(21);
export const deletionScopeSchema=z.object({
 requestId:z.uuid(),status:z.enum(['pending','prepared','completed']),
 members:z.array(z.uuid()).max(21),count:accountCount,
}).refine(value=>new Set(value.members).size===value.members.length&&
 (value.status==='completed'?value.members.length===0:value.members.length===value.count));
export type DeletionScope=z.infer<typeof deletionScopeSchema>;
export const deletionResultSchema=z.object({completed:z.literal(true),deletedAccounts:accountCount});

const count=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const gradeReviewSchema=z.object({
 grade:z.number().int().min(1).max(4),published:count,reviewed:count,pending:count,
 samples:z.array(z.string().trim().min(1).max(160)).max(3).nullable(),
}).refine(row=>row.reviewed+row.pending===row.published&&
 (row.samples?.length||0)<=row.pending&&new Set(row.samples||[]).size===(row.samples?.length||0));
export const questionReviewSchema=z.object({grades:z.array(gradeReviewSchema).max(4)})
 .refine(value=>new Set(value.grades.map(row=>row.grade)).size===value.grades.length);
export type GradeReview=z.infer<typeof gradeReviewSchema>;
