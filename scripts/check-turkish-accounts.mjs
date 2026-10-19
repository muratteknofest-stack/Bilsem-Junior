// Real Turkish components with isolated Auth/API fixtures. No live account or email is created.
import assert from 'node:assert/strict';
async function chooseLearningTopic(page, topic) {
 await page.getByRole('button',{name:'Konu seç',exact:true}).click();
 await page.locator(`dialog[open] [data-topic="${topic}"]`).click();
}

import fs from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {generateQuestion} from '../src/features/questions/generators/index.ts';
import {LEARNING_TOPICS,topicCategory} from '../src/features/student/learning-topics.ts';
import {balancedCategoryPlan} from '../server/learning-question-selection.ts';
import {selectSessionCategory} from '../src/features/student/learning-selection.ts';
import {AVAILABLE_CATEGORIES} from '../src/features/student/available-categories.ts';
import {prepareLearningQuestions,learningView,answerLearningSession,finishLearningSession} from '../server/learning-model.ts';
import {prepareEditorialQuestion} from '../server/editorial-validation.ts';
process.env.VITE_SUPABASE_URL='https://turkish-fixture.invalid';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_isolated_fixture';
const androidStory=process.env.BILSEM_ANDROID_STORY_CHECK==='1';
const webStory=process.env.BILSEM_WEB_STORY_CHECK==='1';
if(androidStory){process.env.VITE_API_BASE_URL='https://turkish-fixture.invalid';process.env.VITE_PUBLIC_SITE_URL='https://zekapark.vercel.app';}
const server=await createServer({cacheDir:androidStory?'/tmp/bilsem-android-story-vite-cache':'/tmp/bilsem-turkish-accounts-vite-cache',...(androidStory?{mode:'android'}:{}),server:{host:'127.0.0.1',port:5186,strictPort:true}});await server.listen();let browser,page;
const parentId='11111111-1111-4111-8111-111111111111',studentId='22222222-2222-4222-8222-222222222222';
const parent={id:parentId,role:'parent',name:'Pilot veli',linked_student_ids:[studentId],xp:0,level:1},student={id:studentId,role:'student',name:'Kaşif',grade:2,student_code:'EXPLORER1234',linked_parent_id:parentId,xp:0,level:1};
const admin={...parent,role:'admin',name:'Test yöneticisi',linked_student_ids:[]};
const reviewQuestions=Array.from({length:50},(_,i)=>({...generateQuestion({type:'mirror_reflection',targetGrade:2,difficulty:3,seed:70000+i*991}),id:`fixture-review-${String(i+1).padStart(4,'0')}`,status:'published',revision:2,updatedAt:'2026-10-14T06:00:00Z',releaseAuthorization:{individualHumanReview:false},batchValidation:{editorReview:'pending'}}));
let reviewSaveAttempts=0,publishedReviewLoads=0,adminRefreshes=0,adminAal='aal1';
let archiveLibraryLoads=0,holdActiveLibrary=false,activeLibraryFailure=false;const heldLibrary=[];
const archivedQuestion={...reviewQuestions[0],id:'fixture-archived',status:'archived'};
let topicRequests=[],topicSessions=new Map(),failNextLearningAnswer=false;
let activeRole='parent',requests=[],resends=0,registrationCount=0,historyFails=true,deleteAttempts=0,unconfirmed=true,previewFault='',summaryAttempts=0,successfulCompletion=false;
function session(role){const id=role==='student'?studentId:parentId,encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url'),metadata={provider:'email',role};return {access_token:`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,role:'authenticated',aal:role==='admin'?adminAal:'aal1',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),session_id:'99999999-9999-4999-8999-999999999999',app_metadata:metadata})}.dGVzdC1zaWduYXR1cmU`,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user:{id,aud:'authenticated',email:role==='parent'?'parent@example.invalid':role==='admin'?'admin@example.invalid':'explorer1234@zekapark.com',email_confirmed_at:new Date().toISOString(),app_metadata:metadata,user_metadata:{},factors:role==='admin'?[{id:'88888888-8888-4888-8888-888888888888',factor_type:'totp',status:'verified',friendly_name:'Isolated fixture'}]:[],created_at:new Date().toISOString()}};}
try{
 browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:390,height:844}});
 await page.addInitScript(()=>{
  window.__audioTones=[];
  class FixtureAudioContext{
   state='suspended';currentTime=0;destination={};
   resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}
   createOscillator(){return{type:'sine',frequency:{setValueAtTime(f){window.__audioTones.push(f);},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}};}
   createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
  }
  window.AudioContext=FixtureAudioContext;
 });const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://screens.cdn.wordwall.net/**',route=>route.abort());
 await page.route('https://wordwall.net/**',route=>route.abort());
 await page.route('https://turkish-fixture.invalid/**',async route=>{
  const u=new URL(route.request().url());let value=[];
  if(u.pathname.includes('/auth/v1/token')){if(activeRole==='admin'&&u.searchParams.get('grant_type')==='refresh_token')adminRefreshes++;if(unconfirmed){unconfirmed=false;await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error_code:'email_not_confirmed',code:'email_not_confirmed',msg:'Email not confirmed'})});return;}value=session(activeRole);}
  else if(u.pathname.includes('/auth/v1/user'))value=session(activeRole).user;
  else if(u.pathname.includes('/auth/v1/logout'))value={};
  else if(u.pathname.includes('/rest/v1/profiles'))value=u.searchParams.get('id')===`eq.${studentId}`?student:activeRole==='admin'?admin:parent;
  else if(u.pathname.includes('/rest/v1/questions')){
   assert.equal(activeRole,'admin');if(adminAal!=='aal2'){await route.fulfill({status:403,contentType:'application/json',body:'{"message":"MFA required"}'});return;}
   const status=u.searchParams.get('status');
   if(status==='neq.archived'&&holdActiveLibrary)await new Promise(resolve=>heldLibrary.push(resolve));
   if(status==='neq.archived'&&activeLibraryFailure){await route.fulfill({status:503,contentType:'application/json',body:'{"message":"Fixture unavailable"}'});return;}
   if(status==='eq.published')publishedReviewLoads++;else if(!status)archiveLibraryLoads++;
   const candidates=status==='eq.published'?reviewQuestions:status==='neq.archived'?reviewQuestions:[...reviewQuestions,archivedQuestion];
   value=candidates.filter(q=>q.id>(u.searchParams.get('id')?.replace(/^gt\./,'')||'')).slice(0,Number(u.searchParams.get('limit')||500)).map(q=>({id:q.id,status:q.status,data:q}));
  }
  else if(u.pathname.includes('/rest/v1/user_private_state'))value={user_id:activeRole==='parent'?parentId:studentId,values:{}};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});
 });
 await page.route('**/api/**',async route=>{
  const u=new URL(route.request().url()),body=route.request().postDataJSON();let value={};
  if(u.pathname==='/api/public/platform')value={registrationOpen:true,policyVersion:'2026-10-11.4'};
  else if(u.pathname==='/api/register-family'){registrationCount++;assert.equal(body.grade,2);assert.equal(body.guardianConfirmed,true);assert.equal(body.parentEmail,'parent@example.invalid');value={success:true,parentProfile:{id:parentId,role:'parent'},student:{id:studentId,code:'EXPLORER1234',email:'explorer1234@zekapark.com'},verificationSent:false};}
  else if(u.pathname==='/api/auth/resend-confirmation'){resends++;value={success:true,message:'Uygun bir hesap varsa doğrulama bağlantısı gönderilecektir.'};}
  else if(u.pathname==='/api/account/requests'){if(historyFails){historyFails=false;await route.fulfill({status:503,contentType:'application/json',body:'{"error":"Fixture unavailable"}'});return;}value={requests};}
  else if(u.pathname==='/api/account/export')value={format:'zekapark-account-export-v1',profiles:[parent,student],learningSessions:[]};
  else if(u.pathname==='/api/learning/grade'){student.grade=body.grade;value={profile:{...student}};}
  else if(u.pathname==='/api/learning/start'){
   assert.equal(activeRole,'student');assert.equal(body.expectedGrade,student.grade);
   if(!androidStory&&!webStory){assert.ok(LEARNING_TOPICS.includes(body.topic));assert.equal(body.category,topicCategory(body.topic,'mixed'));}
   topicRequests.push(body);
   const level=body.difficulty==='mixed'?1:body.difficulty;
   const count=body.mode==='adaptive'?body.questionCount:2;
   const category=body.mode==='adaptive'&&!body.topic?selectSessionCategory(body.category,AVAILABLE_CATEGORIES.map(category=>({category,mastery:category==='numerical'?0:100})),body.mixCategories):body.category;
   const categoryPlan=category==='mixed'?balancedCategoryPlan(count,'mixed'):Array(count).fill(category);
   const questions=Array.from({length:count},(_,i)=>generateQuestion({profile:(androidStory||webStory)?'professional':'complete',targetGrade:student.grade,...((androidStory||webStory)&&!body.topic?{category:categoryPlan[i]}:{type:body.topic}),difficulty:level,seed:90000+topicRequests.length*997+i*37}));
   const s={id:crypto.randomUUID(),student_id:studentId,mode:body.mode,title:body.topic+' konu testi',questions:prepareLearningQuestions(questions),answers:{},created_at:new Date().toISOString(),expires_at:new Date(Date.now()+3600000).toISOString(),finished_at:null,result:null,revision:0,rewarded_xp:0};topicSessions.set(s.id,s);value=learningView(s);
  }
  else if(/^\/api\/learning\/[^/]+\/(answer|finish)$/.test(u.pathname)){
   const [,id,action]=u.pathname.match(/\/api\/learning\/([^/]+)\/(answer|finish)/);
   let current=topicSessions.get(id);assert.ok(current);
   if(action==='answer'){
    if(failNextLearningAnswer){failNextLearningAnswer=false;await route.fulfill({status:503,contentType:'application/json',body:'{"error":"Yalıtılmış cevap kayıt kesintisi"}'});return;}
    current=answerLearningSession(current,body.index,body.response);
   }else current=finishLearningSession(current);
   topicSessions.set(id,current);value=learningView(current);
  }
  else if(u.pathname==='/api/learning/rewards')value={claims:[]};
  else if(u.pathname==='/api/admin/questions/save'){
   assert.equal(activeRole,'admin');assert.equal(adminAal,'aal2');assert.equal(body.status,'published');assert.equal(body.confirmedReview,true);assert.equal(body.expectedRevision,2);reviewSaveAttempts++;
   if(reviewSaveAttempts===1){await route.fulfill({status:503,contentType:'application/json',body:'{"error":"Yalıtılmış kayıt kesintisi"}'});return;}
   const saved=prepareEditorialQuestion(body.question,body.status,body.expectedRevision,body.confirmedReview,parentId,reviewQuestions.filter(q=>q.id!==body.question.id));
   const i=reviewQuestions.findIndex(q=>q.id===saved.id);assert.ok(i>=0);reviewQuestions[i]=saved;value={question:saved};
  }
  else if(u.pathname==='/api/account/deletion-request'){assert.deepEqual(body,{confirmed:true});assert.equal(activeRole,'parent');requests=[{id:'55555555-5555-4555-8555-555555555555',kind:'deletion',status:'open'}];value={id:requests[0].id};}
  else if(u.pathname==='/api/parent/student-session'){assert.equal(body.studentId,studentId);activeRole='student';const s=session(activeRole);value={studentId,access_token:s.access_token,refresh_token:s.refresh_token};}
  else if(u.pathname==='/api/parent/return-session'){activeRole='parent';const s=session(activeRole);value={parentId,verified:true,access_token:s.access_token,refresh_token:s.refresh_token};}
  else if(u.pathname==='/api/admin/question-review-summary'){summaryAttempts++;value={grades:summaryAttempts===1?[{grade:1,published:1000,reviewed:1,pending:1000,samples:null}]:summaryAttempts===2?[{grade:2,published:1000,reviewed:0,pending:1000,samples:['q-2']},{grade:1,published:1000,reviewed:1000,pending:0,samples:null}]:[]};if(summaryAttempts===4){await route.fulfill({status:503,contentType:'application/json',body:'{}'});return;}}
  else if(u.pathname.endsWith('/deletion')){value={requestId:'55555555-5555-4555-8555-555555555555',status:successfulCompletion?'completed':'pending',members:successfulCompletion?[]:[parentId,studentId],count:2};if(previewFault==='wrong-ticket')value.requestId=parentId;if(previewFault==='duplicate-members')value.members=[parentId,parentId];if(previewFault==='wrong-count')value.count=3;if(previewFault==='failed'){await route.fulfill({status:503,contentType:'application/json',body:'{"error":"Fixture unavailable"}'});return;}}
  else if(u.pathname.endsWith('/complete-deletion')){assert.deepEqual(body,{confirmed:true,retentionReviewed:true,members:[parentId,studentId]});deleteAttempts++;if(deleteAttempts===1){await route.fulfill({status:503,contentType:'application/json',body:'{"error":"Kesinti; aynı talep tekrar denenebilir."}'});return;}if(deleteAttempts===3){await route.fulfill({status:200,contentType:'application/json',body:'not-json'});return;}value=deleteAttempts===2?{completed:true,deletedAccounts:1}:{completed:true,deletedAccounts:2};if(deleteAttempts>3)successfulCompletion=true;}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});
 });
 if(androidStory||webStory){activeRole='student';unconfirmed=false;await (await import('./check-android-story-flow.mjs')).checkAndroidStory(page,{student,topicSessions,native:androidStory,requests:topicRequests,failAnswer:()=>{failNextLearningAnswer=true;}});assert.deepEqual(errors,[]);}
 else {
 await page.goto('http://127.0.0.1:5186/tests/browser/turkish-accounts.html');await page.getByRole('heading',{name:'Bilsem Junior yolculuğun başlasın.'}).waitFor();
 await page.locator('#parent-email').fill('parent@example.invalid');await page.getByLabel('Veli şifresi',{exact:true}).fill('ExampleOnly123');await page.getByLabel('Veli şifresi tekrar',{exact:true}).fill('ExampleOnly123');await page.getByRole('button',{name:'Devam et',exact:true}).click();
 await page.locator('#child-alias').fill('Kaşif');await page.locator('#child-grade').selectOption('2');await page.getByLabel('Öğrenci şifresi',{exact:true}).fill('DifferentExample456');await page.getByLabel('Öğrenci şifresi tekrar',{exact:true}).fill('DifferentExample456');await page.getByRole('button',{name:'Devam et',exact:true}).click();
 for(const checkbox of await page.locator('form input[type="checkbox"]').all())await checkbox.check();await page.getByRole('button',{name:'Aile hesabını oluştur',exact:true}).click();await page.getByRole('heading',{name:'Aile hesabınız oluşturuldu'}).waitFor();assert.equal(registrationCount,1);
 await page.getByRole('button',{name:'Doğrulama e-postasını yeniden gönder',exact:true}).click();await page.getByRole('status').filter({hasText:'Uygun bir hesap varsa'}).waitFor();assert.equal(resends,1);await page.getByRole('button',{name:'Veli girişine geç',exact:true}).click();
 await page.getByLabel('Şifre',{exact:true}).fill('ExampleOnly123');await page.getByRole('button',{name:'Veli Portalı Raporlarına Gir',exact:true}).click();await page.getByText(/E-posta adresiniz|E-posta adresi/).first().waitFor();assert.equal(await page.getByRole('heading',{name:'Veli oturumu doğrulandı'}).count(),0);
 await page.getByRole('button',{name:'Veli Portalı Raporlarına Gir',exact:true}).click();await page.getByRole('heading',{name:'Veli oturumu doğrulandı'}).waitFor();
 await page.getByRole('button',{name:'Talep durumunu yeniden yükle',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Silme Talebi Oluştur',exact:true}).count(),0);await page.getByRole('button',{name:'Talep durumunu yeniden yükle',exact:true}).click();
 await page.getByRole('button',{name:'Silme Talebi Oluştur',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Silme Talebi Oluştur',exact:true}).isDisabled(),true);
 const event=page.waitForEvent('download');await page.getByRole('button',{name:'Verilerimi İndir (.json)',exact:true}).click();assert.equal((await event).suggestedFilename(),'zekapark-hesap-verilerim.json');
 await page.getByLabel(/Aile hesabım ve bağlı tüm öğrenci verilerinin/).check();await page.getByRole('button',{name:'Silme Talebi Oluştur',exact:true}).click();await page.getByText('Aktif Silme Talebi Mevcut',{exact:true}).waitFor();assert.equal(requests.length,1);
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Fixture clipboard denied');}}}));
 await page.getByRole('button',{name:'Talep numarasını kopyala',exact:true}).click();await page.getByRole('alert').filter({hasText:'Talep kodu kopyalanamadı'}).waitFor();assert.equal(await page.getByRole('button',{name:'Talep kodu kopyalandı',exact:true}).count(),0);
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.fixtureCopied=text;}}}));
 await page.getByRole('button',{name:'Talep numarasını kopyala',exact:true}).click();await page.getByRole('alert').filter({hasText:'Talep kodu panoya kopyalandı'}).waitFor();assert.equal(await page.evaluate(()=>window.fixtureCopied),requests[0].id);
 await page.getByRole('button',{name:'Bağlı öğrenciye geç',exact:true}).click();await page.getByRole('heading',{name:'Öğrenci oturumu doğrulandı'}).waitFor();await page.getByRole('button',{name:'Veli hesabına dön',exact:true}).click();await page.getByRole('heading',{name:'Veli oturumu doğrulandı'}).waitFor();
 await page.goto('http://127.0.0.1:5186/tests/browser/turkish-accounts.html?mode=review');
 await page.getByRole('alert').filter({hasText:'İnceleme sayıları yüklenemedi veya doğrulanamadı'}).waitFor();assert.equal(await page.locator('article').count(),0);
 await page.getByRole('button',{name:'İnceleme durumunu yeniden yükle',exact:true}).click();await page.getByText('1000 yayımlanan · 1000 incelenen · 0 bekleyen',{exact:true}).waitFor();assert.deepEqual(await page.locator('article h4').allTextContents(),['1. sınıf','2. sınıf']);
 await page.getByRole('button',{name:'İnceleme sayılarını yenile',exact:true}).click();await page.getByRole('status').filter({hasText:'Yayımlanmış sınıf sorusu bulunamadı'}).waitFor();assert.equal(await page.locator('article').count(),0);
 await page.getByRole('button',{name:'İnceleme sayılarını yenile',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.locator('article').count(),0);
 await page.goto('http://127.0.0.1:5186/tests/browser/turkish-accounts.html?mode=admin');
 const preview=page.getByRole('button',{name:'Silme kapsamını kontrol et',exact:true});
 const finish=page.getByRole('button',{name:'Onaylanan hesapları kalıcı sil',exact:true});
 async function approve(){await page.getByLabel('Satıcı/veri sorumlusu olarak saklama ve silme kapsamını inceledim.').check();await page.getByLabel(/2 hesabın ve bağlı uygulama verilerinin/).check();}
 for(const fault of ['failed','wrong-ticket','duplicate-members','wrong-count']){
  previewFault='';await preview.click();await page.getByText('Doğrulanan kapsam:',{exact:false}).waitFor();assert.equal(await finish.isDisabled(),true);await approve();
  previewFault=fault;await preview.click();await page.getByRole('alert').waitFor();assert.equal(await finish.count(),0);assert.equal(await page.getByRole('checkbox').count(),0);assert.equal(deleteAttempts,0);
 }
 previewFault='';await preview.click();await page.getByText('Doğrulanan kapsam:',{exact:false}).waitFor();await approve();
 for(const [width,height] of [[320,480],[390,844],[820,1180]]){await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
 await finish.click();await page.getByRole('alert').filter({hasText:'Kesinti; aynı talep tekrar denenebilir.'}).waitFor();assert.equal(await page.getByRole('heading',{name:'Silme tamamlandı'}).count(),0);
 await finish.click();await page.getByRole('alert').filter({hasText:'Silme sonucu doğrulanamadı'}).waitFor();assert.equal(await finish.count(),0);assert.equal(await page.getByRole('heading',{name:'Silme tamamlandı'}).count(),0);
 await preview.click();await page.getByText('Doğrulanan kapsam:',{exact:false}).waitFor();await approve();await finish.click();await page.getByRole('alert').filter({hasText:'Silme sonucu doğrulanamadı'}).waitFor();assert.equal(await finish.count(),0);
 await page.goto('http://127.0.0.1:5186/tests/browser/turkish-accounts.html?mode=admin&refreshFailure=1');await preview.click();await page.getByText('Doğrulanan kapsam:',{exact:false}).waitFor();await approve();await finish.click();await page.getByRole('status').filter({hasText:'Bu silme işlemi tamamlanmış.'}).waitFor();await page.getByRole('alert').filter({hasText:'Silme tamamlandı, ancak bildirim listesi yenilenemedi.'}).waitFor();assert.equal(await finish.count(),0);assert.equal(deleteAttempts,4);
 await preview.click();await page.getByRole('status').filter({hasText:'Bu silme işlemi tamamlanmış.'}).waitFor();assert.equal(await finish.count(),0);assert.deepEqual(errors,[]);
 // The real portal still requires MFA before opening the new review screen.
 await page.setViewportSize({width:390,height:844});activeRole='admin';await page.goto('http://127.0.0.1:5186/tests/browser/turkish-accounts.html?mode=workbench&section=review');
 await page.getByRole('heading',{name:'İki aşamalı yönetici doğrulaması',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Onayla ve yayımla',exact:true}).count(),0);assert.equal(reviewSaveAttempts,0);
 adminAal='aal2';await page.goto('http://127.0.0.1:5186/tests/browser/turkish-accounts.html?mode=workbench&section=review');
 await page.getByRole('heading',{name:'Eğitmen Onayı',exact:true,level:2}).waitFor();await page.getByText('50 soru, sahibinin isteğiyle',{exact:false}).waitFor();assert.ok(publishedReviewLoads>0);assert.equal(adminRefreshes,0);
 const list=page.locator('[aria-label="Soru listesi"]');assert.equal(await list.getByRole('button').count(),40);
 await page.getByRole('button',{name:'Menüyü Aç',exact:true}).click();await page.getByRole('button').filter({hasText:'Eğitmen Onayı'}).click();
 await page.getByRole('button',{name:'Sonraki sayfa',exact:true}).click();assert.equal(await list.getByRole('button').count(),10);await list.getByRole('button').first().click();await page.getByRole('heading',{name:'Öğrenci önizlemesi',exact:true}).waitFor();
 await page.waitForFunction(()=>document.activeElement?.tagName==='ARTICLE');const selected=await page.getByRole('heading',{name:'Öğrenci önizlemesi',exact:true}).boundingBox();assert.ok(selected.y>=0&&selected.y<844,'Selected question must scroll into view');
 await page.getByRole('button',{name:'Onay bölümüne git',exact:true}).click();
 const approval=page.getByRole('region',{name:'Eğitmen onayı ve yayınlama',exact:true}),publish=approval.getByRole('button',{name:'Onayla ve yayımla',exact:true});
 assert.equal(await publish.isDisabled(),true);const checks=approval.getByRole('checkbox');assert.equal(await checks.count(),3);await checks.nth(0).check();await checks.nth(1).check();assert.equal(await publish.isDisabled(),true);assert.equal(reviewSaveAttempts,0);
 await list.getByRole('button').nth(1).click();await page.getByRole('button',{name:'Onay bölümüne git',exact:true}).click();assert.equal(await checks.evaluateAll(nodes=>nodes.filter(node=>node.checked).length),0);assert.equal(await publish.isDisabled(),true);
 for(const [width,height]of [[320,480],[390,844],[820,1180]]){await page.setViewportSize({width,height});await page.getByRole('button',{name:'Onay bölümüne git',exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const heading=await approval.getByRole('heading',{name:'Eğitmen onayı ve yayınlama',exact:true}).boundingBox();assert.ok(heading.y>=0&&heading.y<height);}
 for(const checkbox of await checks.all())await checkbox.check();await publish.click();await page.getByRole('status').filter({hasText:'Kaydedilemedi.'}).waitFor();assert.equal(await page.getByText('Bu sorunun eğitmen incelemesi tamamlandı.',{exact:true}).count(),0);
 await publish.click();await page.getByRole('status').filter({hasText:'Eğitmen onayı kaydedildi. Soru yayında.'}).waitFor();await page.getByText('Bu sorunun eğitmen incelemesi tamamlandı.',{exact:true}).waitFor();assert.equal(reviewSaveAttempts,2);assert.equal(adminRefreshes,0);assert.equal(reviewQuestions.filter(q=>q.reviewedBy).length,1);await page.getByText('49 soru, sahibinin isteğiyle',{exact:false}).waitFor();assert.equal(await checks.evaluateAll(nodes=>nodes.filter(node=>node.checked).length),0);assert.deepEqual(errors,[]);
 // Scope progress uses only confirmed reviews; navigation cannot approve or carry checks forward.
 await page.getByRole('status').filter({hasText:'1/50 eğitmen incelemesi tamamlandı · 49 bekleyen.'}).waitFor();
 await page.getByLabel('İncelenecek sınıf',{exact:true}).selectOption('1');
 await page.getByRole('status').filter({hasText:'0/0 eğitmen incelemesi tamamlandı · 0 bekleyen.'}).waitFor();
 assert.equal(await list.getByRole('button').count(),0);
 assert.equal(await page.getByRole('button',{name:'Sıradaki bekleyen soru',exact:true}).isDisabled(),true);
 assert.equal(await page.getByLabel('İncelenecek zorluk',{exact:true}).locator('option').count(),3);
 await page.getByLabel('İncelenecek sınıf',{exact:true}).selectOption('2');
 await page.getByLabel('İncelenecek konu',{exact:true}).selectOption('paper_folding');
 assert.equal(await list.getByRole('button').count(),0);
 await page.getByLabel('İncelenecek konu',{exact:true}).selectOption('mirror_reflection');
 await page.getByLabel('İncelenecek zorluk',{exact:true}).selectOption('2');
 assert.equal(await list.getByRole('button').count(),0);
 await page.getByLabel('İncelenecek zorluk',{exact:true}).selectOption('3');
 assert.equal(await list.getByRole('button').count(),40);
 await page.getByRole('button',{name:'Sıradaki bekleyen soru',exact:true}).click();
 await page.waitForFunction(()=>document.activeElement?.tagName==='ARTICLE');
 await page.getByRole('button',{name:'Onay bölümüne git',exact:true}).click();
 await checks.nth(0).check();
 const firstPendingId=await page.locator('article').getByText(/^Soru: fixture-review-/).textContent();
 await page.getByRole('button',{name:'Sonraki soruyu incele',exact:true}).click();
 assert.notEqual(await page.locator('article').getByText(/^Soru: fixture-review-/).textContent(),firstPendingId);
 assert.equal(await checks.evaluateAll(nodes=>nodes.filter(node=>node.checked).length),0);
 assert.equal(await publish.isDisabled(),true);assert.equal(reviewSaveAttempts,2);
 await page.getByRole('button',{name:'Filtreleri sıfırla',exact:true}).click();
 assert.equal(await page.getByLabel('İncelenecek sınıf',{exact:true}).inputValue(),'all');
 assert.equal(await page.getByLabel('İncelenecek konu',{exact:true}).inputValue(),'all');
 assert.equal(await page.getByLabel('İncelenecek zorluk',{exact:true}).inputValue(),'all');
 for(const [width,height]of [[320,480],[390,844],[820,1180]]){await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
 // A cold/failed admin cache must never masquerade as the actual published total.
 assert.equal(archiveLibraryLoads,0);holdActiveLibrary=true;activeLibraryFailure=true;
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://127.0.0.1:5186/tests/browser/turkish-accounts.html?mode=workbench');
 await page.getByRole('button',{name:'Menüyü Aç',exact:true}).click();await page.locator('aside').getByRole('button').filter({hasText:'Soru Tasarım Stüdyosu'}).click();
 await page.getByText('Canlı soru adetleri yükleniyor…',{exact:true}).waitFor();assert.equal(await page.getByText(/soru · .*44 konu/).count(),0);
 holdActiveLibrary=false;for(const release of heldLibrary.splice(0))release();
 await page.getByRole('alert').filter({hasText:'Canlı soru adetleri yüklenemedi.'}).waitFor();activeLibraryFailure=false;await page.getByRole('button',{name:'Yeniden yükle',exact:true}).click();
 await page.getByText('1. sınıf yayımlanan banka:',{exact:false}).waitFor();
 await page.getByRole('button',{name:/2\. Sınıf|2\. sınıf/}).first().click();await page.getByText('50 soru · 1/44 konu',{exact:false}).waitFor();assert.equal(archiveLibraryLoads,0);
 // Archives require an explicit load. The full curriculum remains available in grade one.
 await page.getByRole('button',{name:'Menüyü Aç',exact:true}).click();await page.locator('aside').getByRole('button').filter({hasText:'Soru Bankası & Yönetim'}).click();
 await page.getByRole('button',{name:'Editoryal Atölye & Bulut Kütüphanesi',exact:true}).click();await page.getByLabel('Arşivlenmiş soruları da yükle').waitFor();assert.equal(archiveLibraryLoads,0);
 await page.getByLabel('Arşivlenmiş soruları da yükle').check();await page.getByText('51 kayıt',{exact:false}).waitFor();assert.ok(archiveLibraryLoads>0);
 await page.getByLabel('Arşivlenmiş soruları da yükle').uncheck();await page.getByText('50 kayıt',{exact:false}).waitFor();
 await page.getByRole('button',{name:/Üretim ve taslaklar/}).click();await page.getByLabel('Hedef sınıf').selectOption('1');await page.getByLabel('Soru ailesi').selectOption('matrix_3x3');
 assert.equal(await page.getByLabel('Soru ailesi').locator('option[value=matrix_3x3]').isDisabled(),false);
 await page.getByLabel('Adet',{exact:true}).fill('1');await page.getByRole('button',{name:'Taslak üret',exact:true}).click();await page.getByRole('status').filter({hasText:'1 taslak hazır.'}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);
 // The real parent App must keep charts, empty states and family navigation usable.
 activeRole='parent';
 await page.goto('http://127.0.0.1:5186/tests/browser/turkish-accounts.html?mode=parent-app');
 await page.getByRole('heading',{name:'Veli Portalı',exact:true}).waitFor();
 await page.locator('.bj-parent-overview').waitFor();
 await fs.mkdir('test-artifacts/student',{recursive:true});
 for(const [width,height]of [[320,568],[390,844],[820,1180],[1440,1000]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`Parent layout at ${width}`);
  assert.equal(await page.locator('.bj-parent-metrics article').count(),4);
  assert.equal(await page.locator('.bj-volume-bar[data-empty=true]').count(),7,'Empty weeks must not fabricate chart activity');
  await page.screenshot({path:`test-artifacts/student/parent-${width}.png`,animations:'disabled'});
  assert.equal(await page.locator('.bj-parent-metrics article').evaluateAll(cards=>cards.every(card=>card.querySelector('p').getBoundingClientRect().bottom<=card.querySelector('strong').getBoundingClientRect().top+1)),true,'Metric descriptions must appear above their values');
  await page.locator('.bj-parent-overview').screenshot({path:`test-artifacts/student/parent-overview-${width}.png`,animations:'disabled',style:'header,nav[aria-label$="alt menüsü"]{visibility:hidden!important}'});
 }
 const parentTabs=page.getByRole('group',{name:'Veli paneli bölümleri',exact:true}).getByRole('button');
 for(const index of [1,2,0]){await parentTabs.nth(index).click();assert.equal(await parentTabs.nth(index).getAttribute('aria-pressed'),'true');}
 await page.locator('.bj-parent-overview').waitFor();
 await page.evaluate(()=>document.documentElement.classList.add('dark'));
 await page.locator('.bj-parent-overview').screenshot({path:'test-artifacts/student/parent-overview-dark.png',animations:'disabled'});
 await page.evaluate(()=>document.documentElement.classList.remove('dark'));
 await page.getByRole('button',{name:'Öğrenci Paneline Geç',exact:true}).click();
 await page.getByRole('button',{name:'Çalışma alanım',exact:true}).click();await page.getByRole('heading',{name:'Konuya göre test çöz',exact:true}).waitFor();
 // The actual App must hand the dashboard's exact topic to the verified learning API.
 activeRole='student';
 for(const grade of [1,2,3,4]){
  student.grade=grade;
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:5186/tests/browser/turkish-accounts.html?mode=student-app');
  await page.getByRole('button',{name:'Çalışma alanım',exact:true}).click();await page.getByRole('heading',{name:'Konuya göre test çöz',exact:true}).waitFor();
  if(grade===1){
   await fs.mkdir('test-artifacts/student',{recursive:true});
   await page.getByText('Görünüm ve ses',{exact:true}).click();
   await page.getByRole('slider',{name:'Ses düzeyi',exact:true}).press('Home');
   assert.equal(await page.getByRole('button',{name:'Sesi dene',exact:true}).isDisabled(),true);
   for(let step=0;step<5;step++)await page.getByRole('slider',{name:'Ses düzeyi',exact:true}).press('ArrowRight');
   await page.getByRole('button',{name:'Hareketli efektler',exact:false}).click();
   assert.equal(await page.locator('.zp-student-pro').getAttribute('data-reduced-motion'),'true');
   assert.equal(await page.evaluate(()=>localStorage.getItem('zekapark-motion-enabled-v1')),'false');
   assert.equal(await page.evaluate(()=>localStorage.getItem('zekapark-sound-volume-v1')),'0.25');
   await page.reload();
   await page.getByRole('button',{name:'Çalışma alanım',exact:true}).click();await page.getByRole('heading',{name:'Konuya göre test çöz',exact:true}).waitFor();
   assert.equal(await page.locator('.zp-student-pro').getAttribute('data-reduced-motion'),'true');
   await page.getByText('Görünüm ve ses',{exact:true}).click();
   assert.equal(await page.getByRole('slider',{name:'Ses düzeyi',exact:true}).inputValue(),'25');
   await page.getByRole('button',{name:'Hareketli efektler',exact:false}).click();
   for(let step=0;step<4;step++)await page.getByRole('slider',{name:'Ses düzeyi',exact:true}).press('ArrowRight');
   await page.getByText('Görünüm ve ses',{exact:true}).click();
   const navigation=page.getByRole('navigation',{name:'Öğrenci paneli bölümleri',exact:true});
   assert.equal(await page.locator('.ww-library').count(),0,'The test library must stay closed until selected from the menu');
   for(const name of ['Kişisel planım','Yeteneklerim','Görevlerim','İlerlemem','Çalışma alanım']){
    await navigation.getByRole('button',{name,exact:true}).click();
    await page.getByRole('region',{name,exact:true}).waitFor();
    assert.equal(await navigation.getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true');
   }
   await page.getByRole('heading',{name:'Bugün nasıl çalışmak istersin?',exact:true}).waitFor();
   // The tactile artwork must resolve in the real bundled app, including on narrow screens.
   await page.waitForFunction(()=>{
    const image=document.querySelector('.zp-feature-art img');
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth>0;
   });
   await page.waitForFunction(()=>[...document.querySelectorAll('.zp-mode-card')].every(e=>parseFloat(getComputedStyle(e).opacity)>=.99));
   for(const [width,height]of [[320,568],[390,844],[820,1180],[1440,1000]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    assert.equal(await page.locator('.zp-mode-card').count(),4);
    assert.equal(await page.locator('.bj-mission-cards article').count(),3);
    await page.screenshot({path:`test-artifacts/student/dashboard-${width}.png`});
    assert.equal(await page.locator('.zp-mode-tool').evaluateAll(cards=>cards.every(card=>{const title=card.querySelector('h3').getBoundingClientRect(),tag=card.querySelector('.zp-tool-number').getBoundingClientRect();return title.top>=tag.bottom||title.left>=tag.right||title.right<=tag.left;})),true,'Activity names must not overlap stop badges');
    await page.locator('.zp-modes-section').screenshot({path:`test-artifacts/student/adventure-${width}.png`,animations:'disabled',style:'header,nav[aria-label$="alt menüsü"]{visibility:hidden!important}'});
    const testsButton=navigation.getByRole('button',{name:'Zeka Testleri',exact:true});
    const bounds=await testsButton.boundingBox();
    assert.ok(bounds&&bounds.width>=44&&bounds.height>=44&&bounds.x>=0&&bounds.x+bounds.width<=width,'The tests menu button must remain reachable');
    await testsButton.click();
    await page.getByRole('heading',{name:'Zeka Testleri',exact:true}).waitFor();
    assert.equal(await testsButton.getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('.zp-pro-hero').count(),0,'Test view must leave room for the library on phones');
    assert.equal(await page.locator('.ww-card').count(),12);
    assert.equal(await page.getByRole('group',{name:'Testler için sınıf seçimi',exact:true}).getByRole('button',{name:/^1\. sınıf\b/}).getAttribute('aria-pressed'),'true');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:`test-artifacts/student/tests-menu-${width}.png`,animations:'disabled'});
    if(width===320)await page.locator('.ww-node-complete-toggle').first().click();
    await page.getByRole('button',{name:'Çalışma alanıma dön',exact:true}).click();
    await page.locator('.ww-library').waitFor({state:'detached'});
    assert.equal(await page.locator('.zp-pro-hero').count(),1);
    assert.equal(await navigation.getByRole('button',{name:'Çalışma alanım',exact:true}).getAttribute('aria-pressed'),'true');
    if(width===320){
     await testsButton.click();await page.locator('.ww-card').first().waitFor();
     assert.equal(await page.locator('.ww-card[data-node-status="completed"]').count(),1,'Returning through the menu must retain student progress');
     await navigation.getByRole('button',{name:'Çalışma alanım',exact:true}).click();
     await page.locator('.ww-library').waitFor({state:'detached'});
    }
    await page.locator('.zp-grade-settings>summary').click();
    assert.equal(await page.getByRole('region',{name:'Profilimdeki sınıf',exact:true}).getByRole('combobox').locator('option').count(),4);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.locator('.zp-grade-settings>summary').click();
    await page.locator('.zp-profile-tools>summary').click();
    await page.getByTitle('Giriş kodunu kopyala',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.locator('.zp-profile-tools>summary').click();
   }
   await page.evaluate(()=>document.documentElement.classList.add('dark'));
   await page.screenshot({path:'test-artifacts/student/dashboard-dark.png',animations:'disabled'});
   await page.setViewportSize({width:390,height:844});
   await page.screenshot({path:'test-artifacts/student/dashboard-dark-mobile.png',animations:'disabled'});
   await page.evaluate(()=>document.documentElement.classList.remove('dark'));
   await page.setViewportSize({width:390,height:844});
  }
  const topics=page.getByRole('region',{name:'Konuya göre test',exact:true});
  assert.equal(await topics.getByLabel('Test konusu',{exact:true}).locator('option').count(),44);
  await topics.getByLabel('Test konusu',{exact:true}).selectOption(grade===1?'matrix_3x3':'paper_folding');
  for(const [width,height]of [[320,480],[390,844],[820,1180]]){await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
  const chosen=await topics.getByLabel('Test konusu',{exact:true}).inputValue();
  await topics.getByRole('button',{name:'Konu testini aç',exact:true}).click();
  await page.getByRole('heading',{name:'Bugün hangi alanda çalışalım?',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Konu seç',exact:true}).getAttribute('data-current-topic'),chosen);
  await page.getByRole('button',{name:'Konu seç',exact:true}).click();assert.equal(await page.locator('dialog[open] [data-topic]').count(),45);await page.getByRole('button',{name:'Konu seçimini kapat',exact:true}).click();
  for(const [width,height]of [[320,480],[390,844],[820,1180]]){await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
  await page.getByRole('button',{name:'1. seviye · Kolay',exact:true}).click();
  await page.getByRole('button',{name:'Yeni testi başlat',exact:true}).click();
  await page.getByRole('main',{name:'Soru çözme ekranı',exact:true}).waitFor();
  assert.equal(topicRequests.at(-1).topic,chosen);assert.equal(topicRequests.at(-1).expectedGrade,grade);assert.equal(topicRequests.at(-1).difficulty,1);
  await page.getByRole('button',{name:'Çalışmadan çık',exact:true}).click();
  await page.getByRole('button',{name:'Çalışma alanım',exact:true}).click();await page.getByRole('heading',{name:'Konuya göre test çöz',exact:true}).waitFor();
  await page.getByRole('button').filter({hasText:'Karışık Pratik'}).first().click();
  await page.getByRole('heading',{name:'Bugün hangi alanda çalışalım?',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Konu seç',exact:true}).getAttribute('data-current-topic'),'mixed');
  await chooseLearningTopic(page,'punch_folding');
  await page.getByRole('button',{name:'Yeni testi başlat',exact:true}).click();
  await page.getByRole('main',{name:'Soru çözme ekranı',exact:true}).waitFor();assert.equal(topicRequests.at(-1).topic,'punch_folding');
 }
 assert.equal(topicRequests.length,8);assert.deepEqual(errors,[]);
 // Correctness feedback follows the acknowledged answer; failed saves never celebrate.
 await page.setViewportSize({width:390,height:844});
 const currentSession=[...topicSessions.values()].at(-1),correctId=currentSession.questions[0].correctOptionId;
 const beforeFailure=await page.evaluate(()=>window.__audioTones.length);failNextLearningAnswer=true;
 await page.locator('#option-card-'+correctId).click();
 await page.getByRole('alert').filter({hasText:'Yalıtılmış cevap kayıt kesintisi'}).waitFor();
 assert.equal(await page.locator('.zp-feedback').count(),0);assert.equal(await page.evaluate(()=>window.__audioTones.length),beforeFailure);
 await page.getByRole('button',{name:'Yeniden gönder',exact:true}).click();
 await page.locator('.zp-feedback[data-kind=correct]').waitFor();assert.equal(await page.locator('.zp-feedback').getByText('Doğru cevap!',{exact:true}).count(),1);
 await page.waitForFunction(()=>parseFloat(getComputedStyle(document.querySelector('.zp-feedback-card')).opacity)>=.99);
 await page.screenshot({path:'/tmp/zekapark-correct-feedback.png'});
 await page.locator('.zp-focus-footer').getByText('2 / 2',{exact:true}).waitFor();
 const successTones=await page.evaluate(()=>window.__audioTones.filter(f=>f===659.25).length);assert.ok(successTones>0);
 await page.getByRole('button',{name:'‹ Önceki',exact:true}).click();assert.equal(await page.locator('.zp-feedback').count(),0);
 assert.equal(await page.evaluate(()=>window.__audioTones.filter(f=>f===659.25).length),successTones);
 await page.getByRole('button',{name:'Sonraki ›',exact:true}).click();
 await page.getByRole('button',{name:'Sorular ve çalışma araçları',exact:true}).click();
 const tools=page.getByRole('dialog',{name:'Sorular ve çalışma araçları',exact:true});
 await tools.getByRole('button',{name:'Sesi kapat',exact:true}).click();await tools.getByRole('button',{name:'Kapat ✕',exact:true}).click();
 const mutedCount=await page.evaluate(()=>window.__audioTones.length);
 const second=topicSessions.get(currentSession.id).questions[1],wrongId=second.options.find(o=>o.id!==second.correctOptionId).id;
 await page.locator('#option-card-'+wrongId).click();await page.locator('.zp-feedback[data-kind=incorrect]').waitFor();
 await page.waitForFunction(()=>parseFloat(getComputedStyle(document.querySelector('.zp-feedback-card')).opacity)>=.99);
 await page.screenshot({path:'/tmp/zekapark-wrong-feedback.png'});
 await page.getByRole('heading',{name:'Çalışman tamamlandı',exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.__audioTones.length),mutedCount);
 assert.equal(topicSessions.get(currentSession.id).result.correctAnswers,1);assert.equal(topicSessions.get(currentSession.id).result.wrongAnswers,1);
 // Mute survives a reload; reduced-motion turns off movement while keeping the message.
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:5186/tests/browser/turkish-accounts.html?mode=student-app');
 await page.getByRole('button',{name:'Çalışma alanım',exact:true}).click();await page.getByRole('heading',{name:'Konuya göre test çöz',exact:true}).waitFor();
 await page.getByRole('button',{name:'Menüyü aç',exact:true}).click();await page.getByRole('button',{name:'Sesi aç',exact:true}).waitFor();
 await page.getByRole('button',{name:'Sesi aç',exact:true}).click();await page.getByRole('button',{name:'Menüyü kapat',exact:true}).click();
 await page.getByRole('button',{name:'Konu testini aç',exact:true}).click();await page.getByRole('button',{name:'Yeni testi başlat',exact:true}).click();
 await page.getByRole('main',{name:'Soru çözme ekranı',exact:true}).waitFor();
 const reducedSession=[...topicSessions.values()].at(-1);await page.locator('#option-card-'+reducedSession.questions[0].correctOptionId).click();
 await page.locator('.zp-feedback[data-kind=correct]').waitFor();
 assert.equal(await page.locator('.zp-feedback-card').evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.equal(await page.locator('.zp-feedback-particles').evaluate(e=>getComputedStyle(e).display),'none');
 await page.locator('.zp-focus-footer').getByText('2 / 2',{exact:true}).waitFor();await page.getByRole('button',{name:'Çalışmadan çık',exact:true}).click();
 await page.getByRole('button',{name:'Çalışma alanım',exact:true}).click();await page.getByRole('heading',{name:'Konuya göre test çöz',exact:true}).waitFor();
 await page.getByRole('button').filter({hasText:'Deneme Sınavı'}).first().click();await page.getByRole('heading',{name:'Denemeni seç',exact:true}).waitFor();
 await chooseLearningTopic(page,'paper_folding');await page.getByRole('button',{name:'Yeni testi başlat',exact:true}).click();
 await page.getByRole('main',{name:'Soru çözme ekranı',exact:true}).waitFor();
 const examSession=[...topicSessions.values()].at(-1);assert.equal(examSession.mode,'exam');
 await page.locator('#option-card-'+examSession.questions[0].correctOptionId).click();await page.locator('.zp-feedback[data-kind=saved]').waitFor();
 assert.equal(await page.locator('.zp-feedback[data-kind=correct],.zp-feedback[data-kind=incorrect]').count(),0);assert.deepEqual(errors,[]);
 // Adaptive is a finite student-sized test, with a fresh draw on every re-entry.
 for(const grade of [1,2,3,4]){
  student.grade=grade;
  await page.goto('http://127.0.0.1:5186/tests/browser/turkish-accounts.html?mode=student-app');
  await page.getByRole('button',{name:'Çalışma alanım',exact:true}).click();
  await page.getByRole('button',{name:/Adaptif Test/}).click();
  await page.getByRole('heading',{name:'Sana uygun sorularla ilerle',exact:true}).waitFor();
  const count=page.getByRole('spinbutton',{name:'Soru sayısı',exact:true}),begin=page.getByRole('button',{name:'Yeni testi başlat',exact:true});
  assert.equal(await count.inputValue(),'10');
  for(const invalid of ['', '0','51','2.5']){await count.fill(invalid);assert.equal(await begin.isDisabled(),true);}
  await count.fill('3');assert.equal(await begin.isEnabled(),true);
  await chooseLearningTopic(page,'matrix_3x3');
  for(const [width,height]of [[320,480],[390,844],[820,1180]]){await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
  await begin.click();await page.getByRole('main',{name:'Soru çözme ekranı',exact:true}).waitFor();
  const adaptive=[...topicSessions.values()].at(-1),starts=topicRequests.length;
  assert.equal(adaptive.mode,'adaptive');assert.equal(adaptive.questions.length,3);assert.equal(topicRequests.at(-1).questionCount,3);
  for(let i=0;i<3;i++){
   await page.locator('.zp-focus-footer').getByText(`${i+1} / 3`,{exact:true}).waitFor();
   await page.locator('#option-card-'+adaptive.questions[i].correctOptionId).click();
  }
  await page.getByRole('heading',{name:'Çalışman tamamlandı',exact:true}).waitFor();
  assert.equal(topicRequests.length,starts,'Finishing the selected count must not start another test');
  assert.equal(topicSessions.get(adaptive.id).result.totalQuestions,3);assert.equal(topicSessions.get(adaptive.id).result.correctAnswers,3);
  await page.getByRole('button',{name:'Yeni çalışma',exact:true}).click();
  assert.equal(await count.inputValue(),'3');await count.fill('2');await begin.click();
  await page.locator('.zp-focus-footer').getByText('1 / 2',{exact:true}).waitFor();
  const fresh=[...topicSessions.values()].at(-1);assert.notEqual(fresh.id,adaptive.id);assert.notDeepEqual(fresh.questions[0].visualConfig,adaptive.questions[0].visualConfig);
  await page.getByRole('button',{name:'Çalışmadan çık',exact:true}).click();
 }
 console.log('Turkish isolated browser: registration, grade, consent, confirmation retry, unconfirmed-parent rejection, verified login, export, history failure/retry, deletion request, secure family switching clipboard denial/success, review validation/refresh/empty state admin deletion stale-scope rejection/receipt validation/confirmed completion acknowledged correct/wrong feedback, failed-save silence, muted reload, reduced motion and hidden exam correctness; adaptive count validation, finite 3-question completion and fresh 2-question restarts in grades 1–4; student App topic handoff/reset across all four grades at 320/390/820 px and actual admin portal MFA/educator review navigation/paging/three approvals/save retry passed. This is not a real email/pilot acceptance record.');
 }
}catch(error){console.error('Turkish component scenario failed:',error.message);if(page)console.error(await page.locator('body').innerText().catch(()=>'(page unavailable)'));throw error; }finally{await browser?.close();await server.close();}
