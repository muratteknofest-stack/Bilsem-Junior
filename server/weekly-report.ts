/** Uses a named timezone so server location cannot move the reporting week. */
export function reportDates(now = new Date()) {
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(now);
  const day=new Date(today+'T12:00:00Z');
  day.setUTCDate(day.getUTCDate()-(day.getUTCDay()+6)%7);
  return {today,weekStart:day.toISOString().slice(0,10)};
}
const count=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:0;
export function weeklyReportMetrics(student:Record<string,unknown>,values:Record<string,unknown>,now=new Date()){
  const parse=(key:string):unknown=>{try{return JSON.parse(String(values[key]||'null'));}catch{return null;}};
  const dates=reportDates(now);
  const weekly=parse('yapyap_weekly_questions_v1') as {weekStart?:string;thisWeekDays?:unknown[]}|null;
  const exams=parse('yapyap_exam_results');
  const completed=Array.isArray(exams)?exams.filter(e=>e&&count(e.totalQuestions)>0&&count(e.correctAnswers)<=count(e.totalQuestions)):[];
  const total=completed.reduce((sum,e)=>sum+count(e.totalQuestions),0);
  const correct=completed.reduce((sum,e)=>sum+count(e.correctAnswers),0);
  let lastDay='';try{lastDay=reportDates(new Date(String(student.lastActiveDate))).today;}catch{/* Missing date is not today. */}
  return {totalMinutes:lastDay===dates.today?count(student.todayMinutesSpent):0,
    totalQuestions:weekly?.weekStart===dates.weekStart&&Array.isArray(weekly.thisWeekDays)?weekly.thisWeekDays.reduce<number>((sum,n)=>sum+count(n),0):0,
    accuracy:total?Math.round(100*correct/total):null,streak:count(student.streak)};
}
