const fs = require('fs');
let dash = fs.readFileSync('src/components/StudentDashboard.tsx', 'utf8');

dash = dash.replace(
  "import { DailyGoalProgressCard } from './DailyGoalProgressCard';",
  "import { DailyGoalProgressCard } from './DailyGoalProgressCard';\nimport { BadgesSection } from './BadgesSection';"
);

const rightColumnSearch = `<DailyStreakCard user={activeUser} onUserUpdate={onUserUpdate} />`;

const rightColumnReplace = `<DailyStreakCard user={activeUser} onUserUpdate={onUserUpdate} />
          
          {/* Quick Badges View */}
          <BadgesSection />`;

dash = dash.replace(rightColumnSearch, rightColumnReplace);

fs.writeFileSync('src/components/StudentDashboard.tsx', dash);
