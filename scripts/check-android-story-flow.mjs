import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { campaignStageAt, storyStorageKey, STORY_QUESTION_COUNT } from '../src/features/student/story-adventure.ts';
import { campaignsForGrade } from '../src/features/student/story-catalog.ts';
export async function checkAndroidStory(page,{student,topicSessions,requests,failAnswer,native=true}){
 const output=`test-artifacts/${native?'android':'web'}-story`;
 await fs.mkdir(output,{recursive:true});await page.emulateMedia({reducedMotion:'reduce'});
 const [story,other]=campaignsForGrade(student.grade);
 const root=page.getByRole('region',{name:'Hikâyeli macera parkuru',exact:true});
 const tabs=page.getByRole('navigation',{name:'Macera alanları',exact:true});
 const goHome=async()=>{await page.getByRole('button',{name:'Maceraya dön',exact:true}).click();await root.waitFor();};
 const solve=async({correctCount=20,alreadyStarted=false}={})=>{
  if(!alreadyStarted)await page.getByRole('button',{name:'Maceraya başla',exact:true}).click();await page.getByRole('main',{name:'Soru çözme ekranı',exact:true}).waitFor();
  const task=[...topicSessions.values()].at(-1);assert.equal(requests.at(-1).category,'mixed');assert.equal(requests.at(-1).questionCount,20);assert.equal(requests.at(-1).mixCategories,true);assert.equal(new Set(task.questions.map(q=>q.category)).size,10);
  for(let i=0;i<STORY_QUESTION_COUNT;i++){
   await page.locator('.zp-focus-footer').getByText(`${i+1} / ${STORY_QUESTION_COUNT}`,{exact:true}).waitFor();
   if(await page.getByRole('button',{name:'Deseni gizle ve cevapla',exact:true}).count())await page.getByRole('button',{name:'Deseni gizle ve cevapla',exact:true}).click();
   const answer=i<correctCount?task.questions[i].correctOptionId:task.questions[i].options.find(option=>option.id!==task.questions[i].correctOptionId).id;await page.locator('#option-card-'+answer).click();
  }
  await page.getByRole('button',{name:'Maceraya dön',exact:true}).waitFor();return task;
 };
 await page.goto('http://127.0.0.1:5186/tests/browser/turkish-accounts.html?mode=student-app');await root.waitFor();
 await root.getByRole('heading',{name:story.chapters[0].title,exact:true}).waitFor();
 if(native){const nav=page.getByRole('navigation',{name:'Öğrenci alt menüsü',exact:true});assert.deepEqual(await nav.getByRole('button').allTextContents(),['Macera','Çalış','Ödüller','Profil']);}
 assert.equal(await page.locator('.bj-story-stages button:disabled').count(),5);
 for(const width of [320,390,820]){await page.setViewportSize({width,height:width===820?1180:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:`${output}/path-${width}.png`,fullPage:true,animations:'disabled'});if(native&&width<820){const first=await page.locator('.bj-story-stages button').first().boundingBox();assert.ok(first.y+first.height<770,`First story task must be above bottom navigation: ${JSON.stringify(first)}`);}}
 await page.setViewportSize({width:390,height:844});
 await tabs.getByRole('button',{name:'Hikâyeler',exact:true}).click();assert.equal(await page.locator('.bj-journey-book').count(),4);
 for(const width of [320,390,820]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:`${output}/library-${width}.png`,fullPage:true,animations:'disabled'});}
 await tabs.getByRole('button',{name:'Parkurum',exact:true}).click();
 await page.getByRole('button',{name:'Hikâyeyi oku',exact:true}).click();await page.getByText(story.chapters[0].opening,{exact:true}).waitFor();
 await page.getByRole('button',{name:'Sonraki hikâye bölümü',exact:true}).click();assert.equal(await page.locator('.bj-story-stages button:disabled').count(),6);await page.getByRole('button',{name:'Önceki hikâye bölümü',exact:true}).click();
 await page.locator('.bj-story-stages button').first().click();await page.getByRole('button',{name:'Maceraya başla',exact:true}).waitFor();await page.getByRole('button',{name:'Ana sayfaya dön',exact:true}).click();await root.waitFor();assert.equal(await page.locator('.bj-story-stages li[data-state=complete]').count(),0);
 await page.locator('.bj-story-stages button').first().click();await page.getByRole('button',{name:'Maceraya başla',exact:true}).click();await page.getByRole('main',{name:'Soru çözme ekranı',exact:true}).waitFor();
 const active=[...topicSessions.values()].at(-1);
 if(await page.getByRole('button',{name:'Deseni gizle ve cevapla',exact:true}).count())await page.getByRole('button',{name:'Deseni gizle ve cevapla',exact:true}).click();
 failAnswer();await page.locator('#option-card-'+active.questions[0].correctOptionId).click();await page.getByRole('alert').filter({hasText:'Yalıtılmış cevap kayıt kesintisi'}).waitFor();
 const key=storyStorageKey(student.id,student.grade);
 assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'{}').campaigns?.['g2-map']||0,key),0);
 await page.getByRole('button',{name:'Yeniden gönder',exact:true}).click();
 for(let i=1;i<STORY_QUESTION_COUNT;i++){await page.locator('.zp-focus-footer').getByText(`${i+1} / ${STORY_QUESTION_COUNT}`,{exact:true}).waitFor();if(await page.getByRole('button',{name:'Deseni gizle ve cevapla',exact:true}).count())await page.getByRole('button',{name:'Deseni gizle ve cevapla',exact:true}).click();const answer=i<10?active.questions[i].correctOptionId:active.questions[i].options.find(option=>option.id!==active.questions[i].correctOptionId).id;await page.locator('#option-card-'+answer).click();}
 await page.getByText('+20 macera puanı',{exact:true}).waitFor();await page.getByText('Yeni rozet: İlk Adım',{exact:true}).waitFor();
 const stars=page.getByRole('meter',{name:'Macera yıldızları',exact:true});assert.equal(await stars.getAttribute('aria-valuenow'),'2.5');assert.equal(await page.locator('[data-celebration=orbit]').count(),1);
 for(const width of [320,390,820]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:`${output}/result-half-${width}.png`,fullPage:true,animations:'disabled'});}
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>getComputedStyle(document.querySelector('.bj-story-celebration-art i')).animationName==='bj-result-orbit');assert.equal(await page.locator('.bj-story-celebration-art i').first().evaluate(el=>getComputedStyle(el).animationName),'bj-result-orbit');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>getComputedStyle(document.querySelector('.bj-story-celebration-art i')).display==='none');assert.equal(await page.locator('.bj-story-celebration-art i').first().evaluate(el=>getComputedStyle(el).display),'none');
 await page.getByRole('button',{name:'Yeni sorularla tekrar oyna',exact:true}).click();const retry=await solve({alreadyStarted:true});assert.notEqual(retry.id,active.id);assert.equal(await stars.getAttribute('aria-valuenow'),'5');await page.getByText('En iyi sonucunu geliştirdin!',{exact:true}).waitFor();assert.equal(await page.locator('[data-celebration=perfect]').count(),1);
 await page.getByRole('button',{name:'Yeni sorularla tekrar oyna',exact:true}).click();await solve({alreadyStarted:true,correctCount:4});assert.equal(await stars.getAttribute('aria-valuenow'),'1');await page.getByText('Tekrar maceran tamamlandı. En iyi yıldızların korundu.',{exact:true}).waitFor();assert.equal(await page.locator('[data-celebration=grow]').count(),1);
 await goHome();assert.equal(await page.getByRole('meter',{name:'1. maceranın en iyi yıldızları',exact:true}).getAttribute('aria-valuenow'),'5');
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);assert.equal(saved.campaigns[story.id],1);assert.equal(saved.stageResults[`${story.id}:0`].attempts,3);assert.equal(saved.stageResults[`${story.id}:0`].bestCorrect,20);assert.equal(Object.values(saved.skillPractice).reduce((sum,n)=>sum+n,0),20);
 await page.reload();await root.waitFor();assert.equal(await page.locator('.bj-story-stages li[data-state=complete]').count(),1);assert.equal(await page.getByRole('meter',{name:'1. maceranın en iyi yıldızları',exact:true}).getAttribute('aria-valuenow'),'5');
 await page.locator('.bj-story-stages li[data-state=current] button').click();
 for(let index=1;index<7;index++){await page.getByRole('heading',{name:campaignStageAt(story.id,index).title,exact:true}).waitFor();await solve();await page.getByText(`+${index===5?80:20} macera puanı`,{exact:true}).waitFor();if(index===5)await page.getByText(story.chapters[0].discovery,{exact:true}).waitFor();if(index<6)await page.getByRole('button',{name:'Sıradaki keşfe geç',exact:true}).click();else await goHome();}
 await root.getByRole('heading',{name:story.chapters[1].title,exact:true}).waitFor();
 // Near-finale storage is a deliberate fixture. Real server sessions above verify every UI boundary.
 await page.evaluate(({key,id})=>{const p=JSON.parse(localStorage.getItem(key));p.campaigns[id]=47;localStorage.setItem(key,JSON.stringify(p));},{key,id:story.id});
 await page.reload();await root.waitFor();await page.getByRole('button',{name:'Keşfe devam et',exact:true}).click();await solve();await page.getByText('+320 macera puanı',{exact:true}).waitFor();await page.getByText(`Yeni rozet: ${story.relic}`,{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Sıradaki keşfe geç',exact:true}).count(),0);await goHome();await page.getByRole('heading',{name:`${story.relic} senin!`,exact:true}).waitFor();
 await tabs.getByRole('button',{name:'Koleksiyonum',exact:true}).click();assert.equal(await page.locator('.bj-journey-badges article[data-earned=true]').count(),5);assert.equal(await page.locator('.bj-journey-skills article').count(),10);
 for(const width of [320,390,820]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:`${output}/collection-${width}.png`,fullPage:true,animations:'disabled'});}
 await tabs.getByRole('button',{name:'Hikâyeler',exact:true}).click();await page.locator('.bj-journey-book').filter({has:page.getByRole('heading',{name:other.title,exact:true})}).getByRole('button').click();assert.equal(await page.locator('.bj-story-stages li[data-state=complete]').count(),0);
 await page.reload();await root.waitFor();await page.getByText(other.title,{exact:true}).waitFor();
 assert.equal(await page.evaluate(({key,id})=>JSON.parse(localStorage.getItem(key)).campaigns[id],{key,id:story.id}),48);
 await page.getByRole('button',{name:'Keşfe devam et',exact:true}).click();await solve({correctCount:16});assert.equal(await stars.getAttribute('aria-valuenow'),'4');assert.equal(await page.locator('[data-celebration=sparkle]').count(),1);await goHome();assert.equal(await page.locator('.bj-story-stages li[data-state=complete]').count(),1);
 await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.screenshot({path:`${output}/dark.png`,fullPage:true,animations:'disabled'});await page.evaluate(()=>document.documentElement.classList.remove('dark'));
 if(native){
  const nav=page.getByRole('navigation',{name:'Öğrenci alt menüsü',exact:true});await nav.getByRole('button',{name:'Çalış',exact:true}).click();await page.getByRole('heading',{name:'Bugün ne keşfedelim?',exact:true}).waitFor();
  const groups=page.getByRole('navigation',{name:'Çalışma alanı grupları',exact:true}),found=new Set();for(const group of ['Testler','Araçlar','Gelişim']){await groups.getByRole('button',{name:group,exact:true}).click();for(const label of await page.locator('.bj-native-feature-grid h2').allTextContents())found.add(label);}assert.equal(found.size,9);
  await nav.getByRole('button',{name:'Ödüller',exact:true}).click();await page.getByRole('heading',{name:'Ödüller ve gelişim',exact:true}).waitFor();assert.equal(await page.locator('.bj-native-feature-grid button').count(),4);
  await nav.getByRole('button',{name:'Profil',exact:true}).click();await page.getByRole('heading',{name:'Profilim',exact:true}).waitFor();await page.locator('.zp-grade-settings>summary').click();await page.getByRole('region',{name:'Profilimdeki sınıf',exact:true}).getByRole('combobox').selectOption('3');await page.getByRole('button',{name:'Sınıfımı kaydet',exact:true}).click();await page.locator('.zp-grade-settings>summary').filter({hasText:'3. sınıf'}).waitFor();await nav.getByRole('button',{name:'Macera',exact:true}).click();await root.waitFor();await root.getByRole('heading',{name:campaignsForGrade(3)[0].chapters[0].title,exact:true}).waitFor();assert.equal(await page.locator('.bj-story-stages li[data-state=complete]').count(),0);
 }else{await page.getByRole('button',{name:'Serbest çalışmayı aç',exact:true}).click();await page.getByRole('heading',{name:'Konuya göre test çöz',exact:true}).waitFor();await page.getByRole('button',{name:'Maceram',exact:true}).click();await root.waitFor();}
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await root.waitFor();assert.equal(await page.locator('.bj-story-dialogue img').evaluate(el=>getComputedStyle(el).animationName),'none');
 console.log(JSON.stringify({platform:native?'android':'web',actualCompletedSessions:11,questionsPerAdventure:20,proportionalStarsAndBestReplay:true,chaptersCrossed:1,finaleAndRewardReceipt:true,nearFinaleUsesSeededFixture:true,storySwitchPersists:true,gradeIsolation:native,viewports:[320,390,820],liveWrites:false}));
}

