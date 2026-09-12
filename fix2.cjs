const fs = require('fs');

function replace(file, search, rep) {
  if (fs.existsSync(file)) {
    let c = fs.readFileSync(file, 'utf8');
    c = c.replace(search, rep);
    fs.writeFileSync(file, c);
  }
}

// 2. MistakeAnalyticsPieChart.tsx
replace('src/components/MistakeAnalyticsPieChart.tsx', 
  /numerical:\s*{\s*name:\s*'Sayısal Muhakeme',/,
  "verbal: {\n      name: 'Sözel Mantık',\n      color: '#ec4899',\n      bgLight: '#fdf2f8',\n      borderColor: '#fbcfe8',\n      advice: 'Sözel ilişkileri ve kelime mantığını pekiştirmelisin.',\n      icon: (cls) => <Brain className={cls} />\n    },\n    coding: {\n      name: 'Algoritma & Kodlama',\n      color: '#8b5cf6',\n      bgLight: '#f5f3ff',\n      borderColor: '#ede9fe',\n      advice: 'Mantıksal sıralama ve adım-adım düşünme pratiği yapmalısın.',\n      icon: (cls) => <Brain className={cls} />\n    },\n    numerical: {\n      name: 'Sayısal Muhakeme',"
);

// 3. AdminQuestionAnalyticsDashboard.tsx
replace('src/components/admin/AdminQuestionAnalyticsDashboard.tsx',
  /numerical:\s*<Calculator className="w-4 h-4"\s*\/>/,
  "numerical: <Calculator className=\"w-4 h-4\" />,\n    verbal: <Brain className=\"w-4 h-4\" />,\n    coding: <Brain className=\"w-4 h-4\" />"
);
replace('src/components/admin/AdminQuestionAnalyticsDashboard.tsx',
  /numerical:\s*{\s*bg:\s*'bg-indigo-50',\s*text:\s*'text-indigo-700',\s*border:\s*'border-indigo-100'\s*}/,
  "numerical: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },\n    verbal: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-100' },\n    coding: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' }"
);

// 4. AdminQuestionManager.tsx
replace('src/components/admin/AdminQuestionManager.tsx',
  /numerical:\s*'Sayısal Muhakeme',/,
  "numerical: 'Sayısal Muhakeme',\n    verbal: 'Sözel Mantık',\n    coding: 'Algoritma & Kodlama',"
);
replace('src/components/admin/AdminQuestionManager.tsx',
  /numerical:\s*{\s*bg:\s*'bg-blue-50',\s*text:\s*'text-blue-700',\s*border:\s*'border-blue-200',\s*pill:\s*'bg-blue-100 text-blue-700'\s*}/,
  "numerical: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', pill: 'bg-blue-100 text-blue-700' },\n    verbal: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', pill: 'bg-pink-100 text-pink-700' },\n    coding: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', pill: 'bg-purple-100 text-purple-700' }"
);

// 6. question-analytics-service.ts
replace('src/services/question-analytics-service.ts',
  /visual_perception:\s*'Görsel Algı',/,
  "visual_perception: 'Görsel Algı',\n    verbal: 'Sözel Mantık',\n    coding: 'Kodlama',"
);

