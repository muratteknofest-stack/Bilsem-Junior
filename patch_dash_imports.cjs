const fs = require('fs');
let dash = fs.readFileSync('src/components/StudentDashboard.tsx', 'utf8');

dash = dash.replace(
  "import { dataService } from '../services/data-service';",
  "import { dataService } from '../services/data-service';\nimport { DailyStreakCard } from './DailyStreakCard';\nimport { DailyGoalProgressCard } from './DailyGoalProgressCard';"
);

// We want to add the gamification section.
// Before "Right Column", let's see where to inject.
// I'll search for {/* Right Column */} and insert the Streak Card and Goal card there.

const rightColumnSearch = `{/* Right Column */}
        <aside className="space-y-6">`;

const rightColumnReplace = `{/* Right Column */}
        <aside className="space-y-6">
          <DailyStreakCard user={activeUser} onUserUpdate={onUserUpdate} />`;

dash = dash.replace(rightColumnSearch, rightColumnReplace);

fs.writeFileSync('src/components/StudentDashboard.tsx', dash);
