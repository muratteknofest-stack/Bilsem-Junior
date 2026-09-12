const fs = require('fs');

function replaceInFile(path, search, replace) {
  if(fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = content.replace(search, replace);
    fs.writeFileSync(path, content);
  }
}

// 1. ExamSessionView.tsx
replaceInFile('src/components/ExamSessionView.tsx', 
  "numerical: { total: 0, correct: 0 },",
  "numerical: { total: 0, correct: 0 },\n        verbal: { total: 0, correct: 0 },\n        coding: { total: 0, correct: 0 },"
);

// 2. MistakeAnalyticsPieChart.tsx
replaceInFile('src/components/MistakeAnalyticsPieChart.tsx',
  "numerical: {\n      name: 'Sayısal Muhakeme',",
  "verbal: {\n      name: 'Sözel Mantık',\n      color: '#ec4899',\n      bgLight: '#fdf2f8',\n      borderColor: '#fbcfe8',\n      advice: 'Sözel ilişkileri ve kelime mantığını pekiştirmelisin.',\n      icon: (cls) => <Brain className={cls} />\n    },\n    coding: {\n      name: 'Algoritma & Kodlama',\n      color: '#8b5cf6',\n      bgLight: '#f5f3ff',\n      borderColor: '#ede9fe',\n      advice: 'Mantıksal sıralama ve adım-adım düşünme pratiği yapmalısın.',\n      icon: (cls) => <Brain className={cls} />\n    },\n    numerical: {\n      name: 'Sayısal Muhakeme',"
);

// 3. AdminQuestionAnalyticsDashboard.tsx
replaceInFile('src/components/admin/AdminQuestionAnalyticsDashboard.tsx',
  "numerical: <Calculator className=\"w-4 h-4\" />",
  "numerical: <Calculator className=\"w-4 h-4\" />,\n    verbal: <Brain className=\"w-4 h-4\" />,\n    coding: <Brain className=\"w-4 h-4\" />"
);
replaceInFile('src/components/admin/AdminQuestionAnalyticsDashboard.tsx',
  "numerical: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' }",
  "numerical: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },\n    verbal: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-100' },\n    coding: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' }"
);

// 4. AdminQuestionManager.tsx
replaceInFile('src/components/admin/AdminQuestionManager.tsx',
  "numerical: 'Sayısal Muhakeme',",
  "numerical: 'Sayısal Muhakeme',\n    verbal: 'Sözel Mantık',\n    coding: 'Algoritma & Kodlama',"
);
replaceInFile('src/components/admin/AdminQuestionManager.tsx',
  "numerical: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', pill: 'bg-blue-100 text-blue-700' }",
  "numerical: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', pill: 'bg-blue-100 text-blue-700' },\n    verbal: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', pill: 'bg-pink-100 text-pink-700' },\n    coding: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', pill: 'bg-purple-100 text-purple-700' }"
);

// 5. data-service.ts
replaceInFile('src/services/data-service.ts',
  "numerical: { total: 0, correct: 0 },",
  "numerical: { total: 0, correct: 0 },\n      verbal: { total: 0, correct: 0 },\n      coding: { total: 0, correct: 0 },"
);

// 6. question-analytics-service.ts
replaceInFile('src/services/question-analytics-service.ts',
  "visual_perception: 'Görsel Algı',",
  "visual_perception: 'Görsel Algı',\n  verbal: 'Sözel Mantık',\n  coding: 'Kodlama',"
);

// 7. question-bank-service.ts
replaceInFile('src/services/question-bank-service.ts',
  "numerical: 0,",
  "numerical: 0,\n      verbal: 0,\n      coding: 0,"
);

