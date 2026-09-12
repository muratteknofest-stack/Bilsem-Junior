import React, { useState } from 'react';
import { UserProfile, SkillMastery } from '../types';
import { 
  Users, Building, Search, Filter, ChevronRight, 
  TrendingUp, AlertCircle, CheckCircle2, BarChart2, 
  GraduationCap, Target, Brain, ArrowUpRight
} from 'lucide-react';
import { sound } from '../lib/sound';

interface StudentRow extends UserProfile {
  masteryAvg: number;
  questionsSolvedThisWeek: number;
  weakestCategory: string;
}

const DEMO_STUDENTS: StudentRow[] = [
  {
    id: 's1', name: 'Demir Yılmaz', role: 'student', level: 4, avatar: '🦊', grade: 3, xp: 1200, streak: 5, lastActiveDate: '2026-09-12',
    masteryAvg: 78, questionsSolvedThisWeek: 45, weakestCategory: 'Matris', dailyGoalMinutes: 15, todayMinutesSpent: 5, soundEnabled: true
  },
  {
    id: 's2', name: 'Zeynep Kaya', role: 'student', level: 3, avatar: '🦄', grade: 3, xp: 950, streak: 2, lastActiveDate: '2026-09-11',
    masteryAvg: 65, questionsSolvedThisWeek: 20, weakestCategory: 'Görsel Algı', dailyGoalMinutes: 15, todayMinutesSpent: 5, soundEnabled: true
  },
  {
    id: 's3', name: 'Can Tekin', role: 'student', level: 5, avatar: '🦁', grade: 4, xp: 2100, streak: 12, lastActiveDate: '2026-09-12',
    masteryAvg: 88, questionsSolvedThisWeek: 110, weakestCategory: 'Dikkat', dailyGoalMinutes: 15, todayMinutesSpent: 5, soundEnabled: true
  },
  {
    id: 's4', name: 'Ayşe Yıldız', role: 'student', level: 2, avatar: '🦋', grade: 2, xp: 400, streak: 1, lastActiveDate: '2026-09-10',
    masteryAvg: 55, questionsSolvedThisWeek: 15, weakestCategory: 'Sözel Mantık', dailyGoalMinutes: 15, todayMinutesSpent: 5, soundEnabled: true
  },
  {
    id: 's5', name: 'Ali Vefa', role: 'student', level: 4, avatar: '🚀', grade: 3, xp: 1500, streak: 7, lastActiveDate: '2026-09-12',
    masteryAvg: 82, questionsSolvedThisWeek: 60, weakestCategory: 'Kodlama', dailyGoalMinutes: 15, todayMinutesSpent: 5, soundEnabled: true
  }
];

export const InstitutionalPanelTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);

  const filteredStudents = DEMO_STUDENTS.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = selectedGrade === 'all' || s.grade === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-7 h-7 text-indigo-600" />
            Kurumsal Eğitim Paneli
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Öğrencilerinizin bilişsel gelişimini izleyin ve analiz edin.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2 transition-colors">
            <Users className="w-4 h-4" /> Sınıf Yönetimi
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
          <div className="flex items-center gap-3 text-slate-600 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Toplam Öğrenci</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{DEMO_STUDENTS.length}</p>
        </div>
        
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
          <div className="flex items-center gap-3 text-slate-600 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Ortalama Doğruluk</span>
          </div>
          <p className="text-3xl font-black text-slate-900">%73</p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
          <div className="flex items-center gap-3 text-slate-600 mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Target className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Haftalık Çözülen Soru</span>
          </div>
          <p className="text-3xl font-black text-slate-900">
            {DEMO_STUDENTS.reduce((acc, curr) => acc + curr.questionsSolvedThisWeek, 0)}
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
          <div className="flex items-center gap-3 text-slate-600 mb-2">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Kritik Uyarılar</span>
          </div>
          <p className="text-3xl font-black text-slate-900">2</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Left: Student List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-500" />
              Öğrenci Listesi
            </h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Öğrenci Ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select 
                value={selectedGrade} 
                onChange={(e) => setSelectedGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tüm Sınıflar</option>
                <option value={2}>2. Sınıf</option>
                <option value={3}>3. Sınıf</option>
                <option value={4}>4. Sınıf</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3 border-b border-slate-200">Öğrenci</th>
                  <th className="px-4 py-3 border-b border-slate-200 text-center">Sınıf</th>
                  <th className="px-4 py-3 border-b border-slate-200 text-center">Bilişsel Skor</th>
                  <th className="px-4 py-3 border-b border-slate-200 text-center">Haftalık Soru</th>
                  <th className="px-4 py-3 border-b border-slate-200 text-center">Zayıf Alan</th>
                  <th className="px-4 py-3 border-b border-slate-200 text-right">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr 
                    key={s.id} 
                    onClick={() => {
                      sound.playClick();
                      setSelectedStudent(s);
                    }}
                    className={`hover:bg-indigo-50/50 transition-colors cursor-pointer \${selectedStudent?.id === s.id ? 'bg-indigo-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-lg shadow-sm">
                          {s.avatar}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{s.name}</p>
                          <p className="text-[11px] text-slate-500">{s.streak} Günlük Seri</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md font-medium text-xs">
                        {s.grade}. Sınıf
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-bold text-slate-700">%{s.masteryAvg}</span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full \${s.masteryAvg >= 80 ? 'bg-emerald-500' : s.masteryAvg >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                            style={{ width: `\${s.masteryAvg}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-700">
                      {s.questionsSolvedThisWeek}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 bg-rose-50 text-rose-700 rounded-md font-medium text-xs border border-rose-100 whitespace-nowrap">
                        {s.weakestCategory}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Öğrenci bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Student Detail Panel */}
        <div className="lg:col-span-1 space-y-4">
          {selectedStudent ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 border border-indigo-100 shadow-sm">
                  {selectedStudent.avatar}
                </div>
                <h3 className="text-xl font-bold text-slate-900">{selectedStudent.name}</h3>
                <p className="text-sm text-slate-500">{selectedStudent.grade}. Sınıf Öğrencisi</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">XP Puanı</p>
                  <p className="text-lg font-black text-indigo-600">{selectedStudent.xp}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Çalışma Serisi</p>
                  <p className="text-lg font-black text-orange-500">{selectedStudent.streak} Gün</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Bilişsel Profil Özeti</h4>
                
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-700">Güçlü Yönü</span>
                    <span className="text-emerald-600 font-bold">%92</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2">
                    <Brain className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">Sayısal Muhakeme</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-700">Gelişim Alanı</span>
                    <span className="text-rose-600 font-bold">%{selectedStudent.masteryAvg - 15}</span>
                  </div>
                  <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2">
                    <Target className="w-4 h-4 text-rose-600" />
                    <span className="text-sm font-medium text-rose-800">{selectedStudent.weakestCategory}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
                  <BarChart2 className="w-4 h-4" /> Detaylı Raporu Gör
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl border border-slate-200 border-dashed h-full min-h-[400px] flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Users className="w-12 h-12 text-slate-300 mb-4" />
              <p className="font-medium text-slate-700 mb-1">Öğrenci Seçilmedi</p>
              <p className="text-sm">Detaylı analizini görmek için listeden bir öğrenciye tıklayın.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
