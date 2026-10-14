import test from 'node:test';
import assert from 'node:assert/strict';
import {deletionScopeSchema,deletionResultSchema,questionReviewSchema} from '../src/lib/admin-response-schemas';
const id='11111111-1111-4111-8111-111111111111';
test('destructive UI rejects incomplete, duplicate and inconsistent deletion scope/receipts',()=>{
 const valid={requestId:id,status:'pending',members:[id],count:1};
 assert.equal(deletionScopeSchema.safeParse(valid).success,true);
 for(const value of [{...valid,count:2},{...valid,members:[]},{...valid,members:[id,id],count:2},{...valid,status:'unknown'},{...valid,requestId:'not-an-id'},{...valid,status:'completed'},{...valid,count:22}])assert.equal(deletionScopeSchema.safeParse(value).success,false);
 assert.equal(deletionScopeSchema.safeParse({...valid,status:'completed',members:[]}).success,true);
 assert.equal(deletionResultSchema.safeParse({completed:true,deletedAccounts:1}).success,true);
 for(const value of [{completed:false,deletedAccounts:1},{completed:true,deletedAccounts:0},{completed:true,deletedAccounts:22},{completed:true},{}])assert.equal(deletionResultSchema.safeParse(value).success,false);
});
test('educator review counts cannot present inconsistent or duplicate grades as verified',()=>{
 const grade={grade:1,published:1000,reviewed:0,pending:1000,samples:['q-1','q-2']};
 assert.equal(questionReviewSchema.safeParse({grades:[grade]}).success,true);
 assert.equal(questionReviewSchema.safeParse({grades:[]}).success,true);
 assert.equal(questionReviewSchema.safeParse({grades:[{...grade,published:2,reviewed:2,pending:0,samples:null}]}).success,true);
 for(const grades of [[grade,grade],[{...grade,grade:5}],[{...grade,reviewed:1}],[{...grade,published:Infinity}],[{...grade,pending:-1}],[{...grade,samples:['q-1','q-1']}],[{...grade,published:0,pending:0}],[{...grade,samples:['']}],[{...grade,samples:['1','2','3','4']}]])assert.equal(questionReviewSchema.safeParse({grades}).success,false);
});
