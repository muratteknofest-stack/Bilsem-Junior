const fs = require('fs');
let types = fs.readFileSync('src/types.ts', 'utf8');

types = types.replace(
  "| 'numerical';",
  "| 'numerical'\n  | 'verbal'\n  | 'coding';"
);

types = types.replace(
  "'numerical',",
  "'numerical',\n  'verbal',\n  'coding',"
);

types = types.replace(
  "numerical: 'Sayısal Muhakeme',",
  "numerical: 'Sayısal Muhakeme',\n  verbal: 'Sözel Mantık & Analoji',\n  coding: 'Algoritma & Kodlama',"
);

fs.writeFileSync('src/types.ts', types);
