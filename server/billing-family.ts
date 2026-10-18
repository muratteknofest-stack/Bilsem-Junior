import { getServiceClient } from './supabase-admin';
import { GooglePlayError } from './google-play-model';
export async function assertBillingFamily(parentId:string,studentId:string) {
  const db=getServiceClient();
  const [parent,student]=await Promise.all([db.from('profiles').select('id,role,linked_student_ids').eq('id',parentId).single(),
    db.from('profiles').select('id,role,linked_parent_id').eq('id',studentId).single()]);
  if(parent.error||student.error)throw new GooglePlayError('Aile bilgileri doğrulanamadı.',503);
  if(parent.data.role!=='parent'||student.data.role!=='student'||student.data.linked_parent_id!==parentId
    ||!parent.data.linked_student_ids?.includes(studentId))throw new GooglePlayError('Bu öğrenci için yetkiniz bulunmuyor.',403);
}
