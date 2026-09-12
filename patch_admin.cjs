const fs = require('fs');
let admin = fs.readFileSync('src/components/AdminPanelView.tsx', 'utf8');

admin = admin.replace(
  "const AdminUsersTab = () => <div className=\"p-8 text-center text-slate-500\">Kullanıcı Yönetimi Yakında</div>;",
  ""
);

admin = admin.replace(
  "import { OptionRenderer } from '../features/questions/renderers/OptionRenderer';",
  "import { OptionRenderer } from '../features/questions/renderers/OptionRenderer';\nimport { InstitutionalPanelTab } from './InstitutionalPanelTab';"
);

admin = admin.replace(
  "{ id: 'users', label: 'Kullanıcılar', icon: Users },",
  "{ id: 'users', label: 'Kurumsal Yönetim', icon: Users },"
);

admin = admin.replace(
  "{activeTab === 'users' && <AdminUsersTab />}",
  "{activeTab === 'users' && <InstitutionalPanelTab />}"
);

fs.writeFileSync('src/components/AdminPanelView.tsx', admin);
