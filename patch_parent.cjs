const fs = require('fs');
let file = 'src/components/ParentPortalView.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  "import { doc, getDoc } from 'firebase/firestore';",
  "import { doc, getDoc } from 'firebase/firestore';\nimport { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';"
);

const dataSnippet = `
  const monthlyCategoryData = [
    { name: '1. Hf', 'Matris': 60, 'Görsel Algı': 65, 'Dikkat': 70, 'Sayısal': 55 },
    { name: '2. Hf', 'Matris': 65, 'Görsel Algı': 70, 'Dikkat': 72, 'Sayısal': 58 },
    { name: '3. Hf', 'Matris': 72, 'Görsel Algı': 75, 'Dikkat': 78, 'Sayısal': 64 },
    { name: '4. Hf', 'Matris': 80, 'Görsel Algı': 82, 'Dikkat': 85, 'Sayısal': 70 },
  ];
`;

c = c.replace(
  "const accuracy = strengths.length > 0 ? strengths[0].accuracy : 78;",
  "const accuracy = strengths.length > 0 ? strengths[0].accuracy : 78;\n" + dataSnippet
);

const chartSnippet = `
            {/* Monthly Categorical Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-zinc-200 dark:border-slate-700 ">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                  Kategorik Gelişim Eğrisi (Son 1 Ay)
                </h2>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyCategoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    <RechartsTooltip 
                      cursor={{ stroke: '#e4e4e7', strokeWidth: 1, strokeDasharray: '3 3' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                    <Line type="monotone" dataKey="Matris" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Görsel Algı" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Dikkat" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Sayısal" stroke="#ec4899" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
`;

c = c.replace(
  "            {/* AI Recommendations */}",
  chartSnippet + "\n            {/* AI Recommendations */}"
);

fs.writeFileSync(file, c);
