const fs = require('fs');

let dash = fs.readFileSync('src/components/StudentDashboard.tsx', 'utf8');

dash = dash.replace(
  "import { BadgesSection } from './BadgesSection';",
  "import { BadgesSection } from './BadgesSection';\nimport { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';"
);

const memoInsert = `const unresolvedMistakesCount = mistakes?.filter(m => !m.resolved)?.length || 0;

  const weeklyAccuracyData = useMemo(() => {
    return [
      { name: 'Pzt', dogruluk: 65 },
      { name: 'Sal', dogruluk: 68 },
      { name: 'Çar', dogruluk: 72 },
      { name: 'Per', dogruluk: 70 },
      { name: 'Cum', dogruluk: 75 },
      { name: 'Cmt', dogruluk: 82 },
      { name: 'Paz', dogruluk: 85 },
    ];
  }, []);`;

dash = dash.replace("const unresolvedMistakesCount = mistakes?.filter(m => !m.resolved)?.length || 0;", memoInsert);

const sectionInsert = `          </section>

          {/* Weekly Accuracy Chart */}
          <section className="space-y-4">
            <header>
              <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                Haftalık Doğruluk Gelişimi
              </h2>
            </header>
            <div className="p-5 bg-white border border-zinc-200 rounded-xl h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyAccuracyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(val) => \`%\${val}\`}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#e4e4e7', strokeWidth: 1, strokeDasharray: '3 3' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [\`%\${value}\`, 'Doğruluk']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="dogruluk" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>`;

dash = dash.replace(
  "          </section>\n        </div>",
  sectionInsert
);

fs.writeFileSync('src/components/StudentDashboard.tsx', dash);
