const fs = require('fs');
let file = 'src/components/ParentPortalView.tsx';
let c = fs.readFileSync(file, 'utf8');

const newDataSnippet = `
  const monthlyCategoryData = [
    { name: '1. Hf', 'Matris': 60, 'Görsel Algı': 65, 'Dikkat': 70, 'Sayısal': 55, questions: 45, minutes: 120 },
    { name: '2. Hf', 'Matris': 65, 'Görsel Algı': 70, 'Dikkat': 72, 'Sayısal': 58, questions: 52, minutes: 135 },
    { name: '3. Hf', 'Matris': 72, 'Görsel Algı': 75, 'Dikkat': 78, 'Sayısal': 64, questions: 68, minutes: 150 },
    { name: '4. Hf', 'Matris': 80, 'Görsel Algı': 82, 'Dikkat': 85, 'Sayısal': 70, questions: 85, minutes: 190 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 min-w-[200px] z-50">
          <p className="font-bold text-slate-800 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-700 pb-2">{label} Gelişim Özeti</p>
          
          <div className="space-y-1.5 mb-3">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-600 dark:text-slate-300">{entry.name}</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-100">% {entry.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Çözülen Soru:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{data.questions}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Çalışma Süresi:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{data.minutes} dk</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };
`;

c = c.replace(
  /const monthlyCategoryData = \[[\s\S]*?\];/,
  newDataSnippet
);

const oldTooltip = `<RechartsTooltip 
                      cursor={{ stroke: '#e4e4e7', strokeWidth: 1, strokeDasharray: '3 3' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />`;

const newTooltip = `<RechartsTooltip 
                      cursor={{ stroke: '#e4e4e7', strokeWidth: 1, strokeDasharray: '3 3' }}
                      content={<CustomTooltip />}
                    />`;

c = c.replace(oldTooltip, newTooltip);

fs.writeFileSync(file, c);
