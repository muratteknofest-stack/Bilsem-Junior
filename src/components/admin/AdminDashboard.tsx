import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Users,
  Clock,
} from 'lucide-react';
import { COGNITIVE_CATEGORY_LABELS, CognitiveCategory } from '../../types';
import { loadAdminOverview, type AdminOverview } from '../../services/admin-data-service';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadAdminOverview()
      .then((value) => active && setStats(value))
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : 'Yönetim özeti alınamadı.'));
    return () => { active = false; };
  }, []);

  if (error) return <div role="alert" className="p-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 font-semibold">{error}</div>;
  if (!stats) return <div className="p-8 text-center" role="status">Canlı veriler yükleniyor...</div>;

  const progress = Math.min(100, Math.round((stats.totalQuestions / stats.targetQuestions) * 100));
  const categoryTarget = Math.max(1, Math.ceil(stats.targetQuestions / Object.keys(COGNITIVE_CATEGORY_LABELS).length));

  return (
    <div className="space-y-6">
      {/* Top Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl  border border-zinc-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Toplam Soru</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.totalQuestions}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-200 flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Hedef: {stats.targetQuestions}</span>
            <span className="text-indigo-600">% {progress}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl  border border-zinc-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Yayınlanan / Taslak</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">{stats.statusCounts.published} <span className="text-sm font-bold text-slate-400">/ {stats.statusCounts.draft + stats.statusCounts.review}</span></h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl  border border-zinc-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Raporlanan</p>
              <h3 className="text-2xl font-black text-rose-600 mt-1">{stats.openReports}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-rose-600 font-medium mt-2">İncelenmesi gereken hatalı sorular</p>
        </div>

        <div className="bg-white p-5 rounded-xl  border border-zinc-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Kayıtlı Öğrenci</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">{stats.registeredStudents}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-amber-600 font-medium mt-2">Firebase üzerinde doğrulanmış öğrenci profilleri</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl  border border-zinc-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Beceri Alanı Dağılımı
            </h3>
            <button className="text-xs font-bold text-purple-600 hover:text-purple-700 underline">Tümünü Gör</button>
          </div>
          
          <div className="space-y-4">
            {Object.keys(COGNITIVE_CATEGORY_LABELS).map(cat => {
              const count = stats.categoryCounts[cat] || 0;
              const target = categoryTarget;
              const catProgress = Math.min(100, Math.round((count / target) * 100));
              
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-700">{COGNITIVE_CATEGORY_LABELS[cat as CognitiveCategory]}</span>
                    <span className="text-slate-500">{count} / {target}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${catProgress < 50 ? 'bg-amber-500' : catProgress < 100 ? 'bg-indigo-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.max(2, catProgress)}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl  border border-zinc-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-bold text-slate-900">Son İşlemler</h3>
          </div>
          
          <div className="space-y-4">
            {stats.recentActivities.map((act) => (
              <div key={act.id} className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {act.action === 'student_reward_granted' ? 'Öğrenci ödülü tanımlandı' : (act.action || 'Yönetim işlemi')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {act.createdAt ? new Date(act.createdAt).toLocaleString('tr-TR') : 'Zaman bilgisi yok'}
                  </p>
                </div>
              </div>
            ))}
            {stats.recentActivities.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Henüz kayıtlı bir yönetim işlemi yok.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
