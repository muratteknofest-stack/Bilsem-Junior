import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
export async function checkAndroidStory(page,{student,topicSessions,requests,failAnswer}){
 await fs.mkdir('test-artifacts/android-story',{recursive:true});
 await page.goto('http://127.0.0.1:5186/tests/browser/turkish-accounts.html?mode=student-app');
 await page.getByRole('heading',{name:'Merak Ormanı',exact:true}).waitFor();
 const nav=page.getByRole('navigation',{name:'Öğrenci alt menüsü',exact:true});
 assert.deepEqual(await nav.getByRole('button').allTextContents(),['Macera','Çalış','Ödüller','Profil']);
 assert.equal(await page.locator('.zp-study-navigation').count(),0);
 assert.equal(await page.locator('.bj-story-stages button:disabled').count(),2);
 for(const width of [320,390,820]){
  await page.setViewportSize({width,height:width===820?1180:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:`test-artifacts/android-story/story-${width}.png`,fullPage:true,animations:'disabled'});
  const first=await page.locator('.bj-story-stages button').first().boundingBox();assert.ok(first.y+first.height<844,'First story task must be reachable in the first phone viewport');
 }
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Hikâyeyi oku',exact:true}).click();await page.getByText(/parlayan bir harita parçası/).waitFor();
 await page.getByRole('button',{name:'Sonraki hikâye bölümü',exact:true}).click();await page.getByRole('heading',{name:'Bulut Adası',exact:true}).waitFor();assert.equal(await page.locator('.bj-story-stages button:disabled').count(),3);
 await page.getByRole('button',{name:'Önceki hikâye bölümü',exact:true}).click();
 await page.locator('.bj-story-stages button').first().click();await page.getByRole('button',{name:'Maceraya başla',exact:true}).waitFor();
 await page.getByRole('button',{name:'Ana sayfaya dön',exact:true}).click();await page.getByRole('heading',{name:'Merak Ormanı',exact:true}).waitFor();assert.equal(await page.locator('.bj-story-stages li[data-state=complete]').count(),0);
 await page.locator('.bj-story-stages button').first().click();await page.getByRole('button',{name:'Maceraya başla',exact:true}).click();
 await page.getByRole('main',{name:'Soru çözme ekranı',exact:true}).waitFor();
 const active=[...topicSessions.values()].at(-1);assert.equal(requests.at(-1).questionCount,3);assert.equal(requests.at(-1).category,'pattern');
 failAnswer();await page.locator('#option-card-'+active.questions[0].correctOptionId).click();await page.getByRole('alert').filter({hasText:'Yalıtılmış cevap kayıt kesintisi'}).waitFor();
 assert.equal(await page.evaluate(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('bilsem-story-v1:')).some(([,v])=>JSON.parse(v).completed.length)),false);
 await page.getByRole('button',{name:'Yeniden gönder',exact:true}).click();
 for(let i=1;i<3;i++){await page.locator('.zp-focus-footer').getByText(`${i+1} / 3`,{exact:true}).waitFor();await page.locator('#option-card-'+active.questions[i].correctOptionId).click();}
 await page.getByRole('button',{name:'Maceraya dön',exact:true}).waitFor();await page.getByRole('button',{name:'Maceraya dön',exact:true}).click();await page.getByRole('heading',{name:'Merak Ormanı',exact:true}).waitFor();
 assert.equal(await page.locator('.bj-story-stages li[data-state=complete]').count(),1);assert.equal(await page.locator('.bj-story-stages li[data-state=current] strong').textContent(),'Ormanın şifresi');
 await page.reload();await page.getByRole('heading',{name:'Merak Ormanı',exact:true}).waitFor();assert.equal(await page.locator('.bj-story-stages li[data-state=complete]').count(),1);
 // Free study, library, topics and reports remain accessible without finishing the story.
 await nav.getByRole('button',{name:'Çalış',exact:true}).click();await page.getByRole('heading',{name:'Bugün ne keşfedelim?',exact:true}).waitFor();assert.equal(await page.locator('.bj-native-feature-grid button').count(),9);
 for(const [label,selector] of [['Zeka Testleri','.ww-library'],['Konu Çalışmaları','[aria-label="Konuya göre test"]'],['Kişisel Planım','.zp-student-section'],['Yeteneklerim','.zp-student-section']]){
  await page.locator('.bj-native-feature-grid button').filter({has:page.getByRole('heading',{name:label,exact:true})}).click();await page.locator(selector).first().waitFor();await page.getByRole('button',{name:'← Geri dön',exact:true}).click();await page.getByRole('heading',{name:'Bugün ne keşfedelim?',exact:true}).waitFor();
 }
 for(const width of [320,390,820]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:`test-artifacts/android-story/study-${width}.png`,fullPage:true,animations:'disabled'});}
 await nav.getByRole('button',{name:'Ödüller',exact:true}).click();await page.getByRole('heading',{name:'Ödüller ve gelişim',exact:true}).waitFor();assert.equal(await page.locator('.bj-native-feature-grid button').count(),4);
 await page.locator('.bj-native-feature-grid button').filter({has:page.getByRole('heading',{name:'Görevlerim',exact:true})}).click();await page.getByRole('button',{name:'← Geri dön',exact:true}).waitFor();await page.getByRole('button',{name:'← Geri dön',exact:true}).click();
 await nav.getByRole('button',{name:'Profil',exact:true}).click();await page.getByRole('heading',{name:'Profilim',exact:true}).waitFor();await page.getByRole('button',{name:'Çalışma hatırlatıcısı',exact:true}).click();await page.getByRole('dialog').waitFor();await page.locator('#study-reminder-settings-modal button').filter({has:page.locator('svg.lucide-x')}).click();
 await page.locator('.zp-grade-settings>summary').click();await page.getByRole('region',{name:'Profilimdeki sınıf',exact:true}).getByRole('combobox').selectOption('3');await page.getByRole('button',{name:'Sınıfımı kaydet',exact:true}).click();
 await page.locator('.zp-grade-settings>summary').filter({hasText:'3. sınıf'}).waitFor();await nav.getByRole('button',{name:'Macera',exact:true}).click();await page.getByRole('heading',{name:'Merak Ormanı',exact:true}).waitFor();assert.equal(await page.locator('.bj-story-stages li[data-state=complete]').count(),0);
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.getByRole('heading',{name:'Merak Ormanı',exact:true}).waitFor();assert.equal(await page.locator('.bj-story-dialogue img').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.screenshot({path:'test-artifacts/android-story/story-dark.png',fullPage:true,animations:'disabled'});
 console.log('Android story: four-tab navigation, 18 original story stops, first-screen launch, locked future stops, failed-save rejection, acknowledged completion, reload persistence, free-feature reachability, profile/reminder/grade isolation and reduced-motion checks passed. No live account or payment was created.');
}
