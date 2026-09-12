const fs = require('fs');

let content = fs.readFileSync('src/components/StudentDashboard.tsx', 'utf8');

// Find insertion point before Quick Modes
const insertionPoint = `          {/* Quick Modes */}`;

const recommendationComponent = `          {/* Adaptive Recommendation */}
          {safeMasteries.length > 0 && (
            <section className="space-y-4">
              <header className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-amber-500" />
                  Yapay Zeka Önerisi
                </h2>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-medium rounded-md border border-amber-200/50">
                  Adaptif Analiz
                </span>
              </header>
              {(() => {
                const weakest = [...safeMasteries].sort((a, b) => (a.mastery || 0) - (b.mastery || 0))[0];
                if (!weakest) return null;
                const label = COGNITIVE_CATEGORY_LABELS[weakest.category] || weakest.category;
                return (
                  <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                      <Brain className="w-24 h-24 text-amber-600" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-amber-700 tracking-wider uppercase">Zayıf Yön Tespiti</span>
                      </div>
                      <h3 className="text-lg font-bold text-amber-900 mb-1">{label} Eksikliğin Var</h3>
                      <p className="text-sm text-amber-800 mb-5 leading-relaxed max-w-lg">
                        Son testlerdeki analizimize göre <strong>{label}</strong> kategorisindeki başarı oranın %{Math.round(weakest.mastery || 0)}. Bu alanı geliştirmek için sana özel hazırlanmış kısa bir antrenman yapalım mı?
                      </p>
                      <button
                        onClick={() => {
                          sound.playClick();
                          onStartPractice(weakest.category);
                        }}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-amber-500/20 flex items-center gap-2"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        {label} Antrenmanına Başla
                      </button>
                    </div>
                  </div>
                );
              })()}
            </section>
          )}
          
          {/* Quick Modes */}`;

content = content.replace(insertionPoint, recommendationComponent);

fs.writeFileSync('src/components/StudentDashboard.tsx', content);
