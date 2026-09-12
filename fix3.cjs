const fs = require('fs');

function insertBefore(file, searchStr, insertStr) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(searchStr) && !content.includes(insertStr)) {
      content = content.replace(searchStr, insertStr + searchStr);
      fs.writeFileSync(file, content);
    }
  }
}

// AdminQuestionAnalyticsDashboard
insertBefore('src/components/admin/AdminQuestionAnalyticsDashboard.tsx',
  "numerical: <Calculator className=\"w-4 h-4\" />",
  "verbal: <Brain className=\"w-4 h-4\" />,\n    coding: <Brain className=\"w-4 h-4\" />,\n    "
);
insertBefore('src/components/admin/AdminQuestionAnalyticsDashboard.tsx',
  "numerical: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' }",
  "verbal: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-100' },\n    coding: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' },\n    "
);

// AdminQuestionManager
insertBefore('src/components/admin/AdminQuestionManager.tsx',
  "numerical: 'Sayısal Muhakeme'",
  "verbal: 'Sözel Mantık',\n    coding: 'Algoritma & Kodlama',\n    "
);
insertBefore('src/components/admin/AdminQuestionManager.tsx',
  "numerical: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', pill: 'bg-blue-100 text-blue-700' }",
  "verbal: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', pill: 'bg-pink-100 text-pink-700' },\n    coding: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', pill: 'bg-purple-100 text-purple-700' },\n    "
);

// question-analytics-service
insertBefore('src/services/question-analytics-service.ts',
  "visual_perception: 'Görsel Algı'",
  "verbal: 'Sözel Mantık',\n  coding: 'Kodlama',\n  "
);

