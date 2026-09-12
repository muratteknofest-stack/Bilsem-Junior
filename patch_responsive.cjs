const fs = require('fs');

function patchFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  
  // Make StudentDashboard graphs responsive (already using ResponsiveContainer but container might be fixed)
  content = content.replace(/className="[^"]*h-\[300px\][^"]*"/g, (match) => {
    if(match.includes('w-full') || match.includes('w-')) return match;
    return match.replace('h-[300px]', 'h-[300px] w-full min-w-0');
  });
  
  // Also adjust grid cols to ensure they wrap on mobile
  content = content.replace(/grid-cols-2/g, 'grid-cols-1 sm:grid-cols-2');
  content = content.replace(/grid-cols-3/g, 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3');
  content = content.replace(/grid-cols-4/g, 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4');
  
  // Ensure we don't break existing responsive classes
  content = content.replace(/grid-cols-1 sm:grid-cols-1/g, 'grid-cols-1');
  
  fs.writeFileSync(filepath, content);
}

patchFile('src/components/StudentDashboard.tsx');
patchFile('src/components/ParentPortalView.tsx');
patchFile('src/components/InstitutionalPanelTab.tsx');
patchFile('src/components/AdminPanelView.tsx');

console.log("Patched");
