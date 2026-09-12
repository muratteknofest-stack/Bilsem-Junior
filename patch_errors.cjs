const fs = require('fs');

let parentView = fs.readFileSync('src/components/ParentPortalView.tsx', 'utf8');
parentView = parentView.replace(/student \|\| undefined/g, 'currentStudent || undefined');
parentView = parentView.replace(/\[student\]/g, '[currentStudent]');
parentView = parentView.replace(/user=\{student\}/g, 'user={currentStudent}');
fs.writeFileSync('src/components/ParentPortalView.tsx', parentView);

let dataService = fs.readFileSync('src/services/data-service.ts', 'utf8');
dataService = dataService.replace(/\{ \.\.\.INITIAL_USER \}/g, '{ ...SYSTEM_ACCOUNTS.student }');
dataService = dataService.replace(/let parsed = JSON.parse\(raw\); if \(!parsed \|\| typeof parsed !== "object"\) parsed = \{ \.\.\.SYSTEM_ACCOUNTS.student \}; return Array.isArray\(parsed\) \? parsed : INITIAL_SKILL_MASTERIES;/g, 
  'let parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : INITIAL_SKILL_MASTERIES;');
dataService = dataService.replace(/let parsed = JSON.parse\(raw\); if \(!parsed \|\| typeof parsed !== "object"\) parsed = \{ \.\.\.SYSTEM_ACCOUNTS.student \}; const stored: MistakeItem\[\] = Array.isArray\(parsed\) \? parsed : \[\];/g, 
  'let parsed = JSON.parse(raw); const stored: MistakeItem[] = Array.isArray(parsed) ? parsed : [];');
fs.writeFileSync('src/services/data-service.ts', dataService);
