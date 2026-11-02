import assert from 'node:assert/strict';
export async function checkExamArt(page,output){
 const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
 try{
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:width<700?844:1024});await page.goto('http://127.0.0.1:5189/tests/browser/exam-questions.html');await page.locator('[data-exam-sample]').first().waitFor();await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('[data-exam-sample]').count(),23);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Exam cards fit '+width);
   for(const section of await page.locator('[data-exam-sample]').all()){
    await section.scrollIntoViewIfNeeded();const options=section.locator('.zp-answer-option');await options.first().click();
    await section.getByRole('button',{name:'Sürükle bırak',exact:true}).click();
    const token=section.locator('.zp-answer-tokens button').first();await token.click();await section.locator('[data-answer-target]').first().click();
    assert.ok(await section.locator('[data-answer-target] .bj-exam-tile').count(),'Placed card uses full SVG');
    await section.getByRole('button',{name:'Şık seç',exact:true}).click();
   }
   await page.screenshot({path:output+'/exam-'+width+'.png',fullPage:true,animations:'disabled'});
  }
  assert.deepEqual(errors,[]);console.log('Exam artwork: 23 cards × 4 widths; selection and placement passed.');
 }finally{page.off('pageerror',onError);}
}
