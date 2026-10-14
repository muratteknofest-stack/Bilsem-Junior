// Real Turkish components with isolated Auth/API fixtures. No live account or email is created.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
process.env.VITE_SUPABASE_URL='https://turkish-fixture.invalid';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_isolated_fixture';
const server=await createServer({server:{host:'127.0.0.1',port:5186,strictPort:true}});await server.listen();let browser,page;
const parentId='11111111-1111-4111-8111-111111111111',studentId='22222222-2222-4222-8222-222222222222';
const parent={id:parentId,role:'parent',name:'Pilot veli',linked_student_ids:[studentId],xp:0,level:1},student={id:studentId,role:'student',name:'Kaşif',grade:2,student_code:'EXPLORER1234',linked_parent_id:parentId,xp:0,level:1};
let activeRole='parent',requests=[],resends=0,registrationCount=0,historyFails=true,deleteAttempts=0,unconfirmed=true,previewFault='',summaryAttempts=0,successfulCompletion=false;
function session(role){const id=role==='parent'?parentId:studentId,encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');return {access_token:`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),session_id:'99999999-9999-4999-8999-999999999999',app_metadata:{provider:'email'}})}.dGVzdC1zaWduYXR1cmU`,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user:{id,aud:'authenticated',email:role==='parent'?'parent@example.invalid':'explorer1234@zekapark.com',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()}};}
try{
 browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://turkish-fixture.invalid/**',async route=>{
  const u=new URL(route.request().url());let value=[];
  if(u.pathname.includes('/auth/v1/token')){if(unconfirmed){unconfirmed=false;await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error_code:'email_not_confirmed',code:'email_not_confirmed',msg:'Email not confirmed'})});return;}value=session(activeRole);}
  else if(u.pathname.includes('/auth/v1/user'))value=session(activeRole).user;
  else if(u.pathname.includes('/auth/v1/logout'))value={};
  else if(u.pathname.includes('/rest/v1/profiles'))value=u.searchParams.get('id')===`eq.${studentId}`?student:parent;
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
  else if(u.pathname==='/api/account/deletion-request'){assert.deepEqual(body,{confirmed:true});assert.equal(activeRole,'parent');requests=[{id:'55555555-5555-4555-8555-555555555555',kind:'deletion',status:'open'}];value={id:requests[0].id};}
  else if(u.pathname==='/api/parent/student-session'){assert.equal(body.studentId,studentId);activeRole='student';const s=session(activeRole);value={studentId,access_token:s.access_token,refresh_token:s.refresh_token};}
  else if(u.pathname==='/api/parent/return-session'){activeRole='parent';const s=session(activeRole);value={parentId,verified:true,access_token:s.access_token,refresh_token:s.refresh_token};}
  else if(u.pathname==='/api/admin/question-review-summary'){summaryAttempts++;value={grades:summaryAttempts===1?[{grade:1,published:1000,reviewed:1,pending:1000,samples:null}]:summaryAttempts===2?[{grade:2,published:1000,reviewed:0,pending:1000,samples:['q-2']},{grade:1,published:1000,reviewed:1000,pending:0,samples:null}]:[]};if(summaryAttempts===4){await route.fulfill({status:503,contentType:'application/json',body:'{}'});return;}}
  else if(u.pathname.endsWith('/deletion')){value={requestId:'55555555-5555-4555-8555-555555555555',status:successfulCompletion?'completed':'pending',members:successfulCompletion?[]:[parentId,studentId],count:2};if(previewFault==='wrong-ticket')value.requestId=parentId;if(previewFault==='duplicate-members')value.members=[parentId,parentId];if(previewFault==='wrong-count')value.count=3;if(previewFault==='failed'){await route.fulfill({status:503,contentType:'application/json',body:'{"error":"Fixture unavailable"}'});return;}}
  else if(u.pathname.endsWith('/complete-deletion')){assert.deepEqual(body,{confirmed:true,retentionReviewed:true,members:[parentId,studentId]});deleteAttempts++;if(deleteAttempts===1){await route.fulfill({status:503,contentType:'application/json',body:'{"error":"Kesinti; aynı talep tekrar denenebilir."}'});return;}if(deleteAttempts===3){await route.fulfill({status:200,contentType:'application/json',body:'not-json'});return;}value=deleteAttempts===2?{completed:true,deletedAccounts:1}:{completed:true,deletedAccounts:2};if(deleteAttempts>3)successfulCompletion=true;}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});
 });
 await page.goto('http://127.0.0.1:5186/tests/browser/turkish-accounts.html');await page.getByRole('heading',{name:'Yeni bir keşif başlasın.'}).waitFor();
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
 console.log('Turkish isolated browser: registration, grade, consent, confirmation retry, unconfirmed-parent rejection, verified login, export, history failure/retry, deletion request, secure family switching clipboard denial/success, review validation/refresh/empty state and admin deletion stale-scope rejection/receipt validation/confirmed completion passed. This is not a real email/pilot acceptance record.');
}catch(error){console.error('Turkish component scenario failed:',error.message);if(page)console.error(await page.locator('body').innerText().catch(()=>'(page unavailable)'));throw error;}finally{await browser?.close();await server.close();}
