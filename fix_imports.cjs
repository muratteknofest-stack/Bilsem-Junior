const fs = require('fs');
let dash = fs.readFileSync('src/components/StudentDashboard.tsx', 'utf8');

dash = dash.replace(
  "import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';\nimport { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';",
  "import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';"
);

fs.writeFileSync('src/components/StudentDashboard.tsx', dash);
