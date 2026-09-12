const fs = require('fs');
let file = 'src/services/question-analytics-service.ts';
if (fs.existsSync(file)) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/visual_perception:\s*'Dış sınır çizgisi benzerliği nedeniyle iç detayların atlanması',/, "visual_perception: 'Dış sınır çizgisi benzerliği nedeniyle iç detayların atlanması',\n  verbal: 'Kelime anlam ilişkilerinde yapısal değil tanımsal benzerliğe aldanma',\n  coding: 'Döngü veya koşul adımlarından birini atlama',");
  fs.writeFileSync(file, c);
}
