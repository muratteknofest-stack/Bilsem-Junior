import React, { useState } from 'react';
import { UserProfile, SkillMastery } from '../../types';
import { dataService } from '../../services/data-service';
import { sound } from '../../lib/sound';
import {
  Users,
  Search,
  Award,
  Flame,
  BookOpen,
  CheckCircle2,
  Plus,
  Shield,
  Trash2,
  BarChart2,
  X,
  Filter,
} from 'lucide-react';

interface StudentRecord {
  id: string;
  name: string;
  avatar: string;
  grade: number;
  level: number;
  xp: number;
  streak: number;
  solvedQuestions: number;
  accuracy: number;
  mistakesCount: number;
  streakFreeze: number;
  lastActive: string;
  isCurrentUser: boolean;
}

interface AdminStudentCohortProps {
  onSyncNeeded: () => void;
}

export const AdminStudentCohort: React.FC<AdminStudentCohortProps> = ({ onSyncNeeded }) => {
  const currentUser = dataService.getCurrentUser();
  const currentMistakes = dataService.getMistakes();
  const unresolvedMistakes = currentMistakes.filter((m) => !m.resolved).length;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<StudentRecord | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Combine currentUser with student cohort
  const cohortList: StudentRecord[] = [
    {
      id: currentUser.id,
      name: currentUser.name || 'Deniz Kaya',
      avatar: currentUser.avatar || '🦊',
      grade: currentUser.grade || 3,
      level: currentUser.level || 4,
      xp: currentUser.xp || 720,
      streak: currentUser.streak || 5,
      solvedQuestions: currentUser.totalQuestionsSolved || 28,
      accuracy: 82,
      mistakesCount: unresolvedMistakes,
      streakFreeze: currentUser.streakFreezeCount ?? 1,
      lastActive: 'Bugün (Şu an aktif)',
      isCurrentUser: true,
    },
    {
      id: 'student-ayse-y',
      name: 'Ayşe Yılmaz',
      avatar: '🦉',
      grade: 2,
      level: 5,
      xp: 1140,
      streak: 9,
      solvedQuestions: 56,
      accuracy: 89,
      mistakesCount: 1,
      streakFreeze: 2,
      lastActive: 'Dün',
      isCurrentUser: false,
    },
    {
      id: 'student-can-d',
      name: 'Can Demir',
      avatar: '🦁',
      grade: 3,
      level: 3,
      xp: 520,
      streak: 3,
      solvedQuestions: 22,
      accuracy: 74,
      mistakesCount: 4,
      streakFreeze: 0,
      lastActive: '2 gün önce',
      isCurrentUser: false,
    },
    {
      id: 'student-zeynep-a',
      name: 'Zeynep Aydın',
      avatar: '🐼',
      grade: 1,
      level: 6,
      xp: 1480,
      streak: 14,
      solvedQuestions: 78,
      accuracy: 94,
      mistakesCount: 0,
      streakFreeze: 3,
      lastActive: 'Bugün',
      isCurrentUser: false,
    },
    {
      id: 'student-kerem-o',
      name: 'Kerem Öztürk',
      avatar: '🚀',
      grade: 4,
      level: 4,
      xp: 890,
      streak: 7,
      solvedQuestions: 44,
      accuracy: 79,
      mistakesCount: 2,
      streakFreeze: 1,
      lastActive: '3 saat önce',
      isCurrentUser: false,
    },
  ];

  const handleAwardXp = (target: StudentRecord, amount: number) => {
    sound.playSuccess();
    if (target.isCurrentUser) {
      const updated = {
        ...currentUser,
        xp: (currentUser.xp || 0) + amount,
        level: Math.floor(((currentUser.xp || 0) + amount) / 250) + 1,
      };
      dataService.setCurrentUser(updated);
      onSyncNeeded();
    }
    setActionMessage(`${target.name} öğrencisine +${amount} XP başarıyla tanımlandı.`);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleAddFreeze = (target: StudentRecord) => {
    sound.playLevelUp();
    if (target.isCurrentUser) {
      const updated = {
        ...currentUser,
        streakFreezeCount: (currentUser.streakFreezeCount || 0) + 1,
      };
      dataService.setCurrentUser(updated);
      onSyncNeeded();
    }
    setActionMessage(`${target.name} öğrencisine +1 Seri Koruma Kalkanı tanımlandı.`);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleClearMistakes = (target: StudentRecord) => {
    sound.playClick();
    if (target.isCurrentUser) {
      dataService.clearAllMistakes();
      onSyncNeeded();
    }
    setActionMessage(`${target.name} öğrencisinin Hata Defteri temizlendi ve telafi edildi.`);
    setTimeout(() => setActionMessage(null), 3000);
  };

  // Filter cohort
  const filteredStudents = cohortList.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = selectedGrade === 'all' || s.grade === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  const masteries: SkillMastery[] = dataService.getSkillMasteries();

  return (
    <div className="space-y-6">
      {/* Top Banner & Cohort Overview */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-extrabold text-slate-900">
                Öğrenci Dizini & Bilişsel İlerleme Denetimi
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Kayıtlı öğrencilerin seviye, tecrübe puanı (XP), günlük pratik serileri ve hata defteri durumlarını denetleyin.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold flex items-center gap-1.5">
              <span>5 Kayıtlı Öğrenci</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
              <span>Ort. %83 Başarı</span>
            </div>
          </div>
        </div>

        {/* Action notification toast */}
        {actionMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Öğrenci adı ile ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Grade Level Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Sınıf:</span>
            </span>
            {(['all', 1, 2, 3, 4] as (number | 'all')[]).map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedGrade === g
                    ? 'bg-purple-600 text-white '
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {g === 'all' ? 'Tüm Sınıflar' : `${g}. Sınıf`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Student Roster Table */}
      <div className="bg-white rounded-xl p-6 border border-zinc-200  space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3">Öğrenci</th>
                <th className="py-3 px-3 text-center">Sınıf</th>
                <th className="py-3 px-3 text-center">Seviye & XP</th>
                <th className="py-3 px-3 text-center">Günlük Seri</th>
                <th className="py-3 px-3 text-center">Çözülen Soru</th>
                <th className="py-3 px-3 text-center">Hata Defteri</th>
                <th className="py-3 px-3 text-center">Son Etkinlik</th>
                <th className="py-3 px-3 text-right">Eğitmen / Admin İşlemleri</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-lg shrink-0">
                        {student.avatar}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{student.name}</span>
                          {student.isCurrentUser && (
                            <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-extrabold">
                              Aktif Oturum
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Doğruluk: %{student.accuracy}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]">
                      {student.grade}. Sınıf
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <div className="font-bold text-slate-900">Seviye {student.level}</div>
                    <div className="text-[11px] font-mono text-purple-700 font-bold">{student.xp} XP</div>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{student.streak} Gün</span>
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                    {student.solvedQuestions}
                  </td>

                  <td className="py-3 px-3 text-center">
                    {student.mistakesCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                        {student.mistakesCount} Çözülmemiş
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                        Temiz ✓
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-center text-slate-500 text-[11px]">
                    {student.lastActive}
                  </td>

                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleAwardXp(student, 100)}
                        title="+100 XP Tanımla"
                        className="px-2 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>100 XP</span>
                      </button>

                      <button
                        onClick={() => handleAddFreeze(student)}
                        title="+1 Seri Koruma Tanımla"
                        className="p-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer"
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>

                      {student.mistakesCount > 0 && (
                        <button
                          onClick={() => handleClearMistakes(student)}
                          title="Hataları Telafi Et / Sıfırla"
                          className="p-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          sound.playClick();
                          setSelectedStudentForModal(student);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <BarChart2 className="w-3 h-3" />
                        <span>Rapor</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Cognitive Detail Modal */}
      {selectedStudentForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full border border-zinc-200  space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedStudentForModal.avatar}</span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {selectedStudentForModal.name} - Bilişsel Yetenek Raporu
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedStudentForModal.grade}. Sınıf • Seviye {selectedStudentForModal.level} ({selectedStudentForModal.xp} XP)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <div className="text-xs font-bold text-slate-600 mb-2">
                8 Bilişsel Alanda Ustalık Yüzdeleri:
              </div>
              {masteries.map((m) => (
                <div key={m.category} className="space-y-1 p-2.5 rounded-xl bg-slate-50 border border-zinc-200">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-800">{m.categoryName}</span>
                    <span className="font-mono font-bold text-purple-700">%{m.mastery} Ustalık</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"
                      style={{ width: `${m.mastery}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>{m.attemptCount} Soru Çözüldü</span>
                    <span>%{m.accuracy} Doğruluk Oranı</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedStudentForModal(null)}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
