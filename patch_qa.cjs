const fs = require('fs');
let file = 'src/services/question-analytics-service.ts';
if (fs.existsSync(file)) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/visual_perception:\s*'Görsel Algı',/, "visual_perception: 'Görsel Algı',\n  verbal: 'Sözel Mantık',\n  coding: 'Kodlama',");
  fs.writeFileSync(file, c);
}
