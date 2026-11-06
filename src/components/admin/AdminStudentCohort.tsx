import React, { useCallback, useEffect, useState } from 'react';
import { authenticatedFetch } from '../../lib/api-client';
import {
  Users,
  Search,
  Flame,
  RefreshCw,
  Filter,
  ShieldCheck,
  AlertCircle,
  UserPlus,
  Pencil,
  Trash2,
  CreditCard,
} from 'lucide-react';
import { DeleteUserDialog, SubscriptionDialog, UserFormDialog } from './AdminUserDialogs';

export interface AdminUserRecord {
  id: string;
  email: string | null;
  name: string;
  role: 'student' | 'parent' | 'admin';
  studentCode: string | null;
  linkedStudentIds: string[];
  linkedParentId: string | null;
  grade: number | null;
  avatar: string;
  level: number;
  xp: number;
  streak: number;
  longestStreak: number;
  lastActiveDate: string;
  todayPracticed: boolean;
  streakFreezeCount: number;
  totalQuestionsSolved: number;
  resolvedMistakesCount: number;
  createdAt: number | null;
  lastLoginAt: number | null;
  deletionPending: boolean;
  accessTier: 'subscriber' | 'legacy_lifetime' | 'free' | 'parent' | 'admin';
  subscription: {
    parentId: string | null;
    basePlanId: string;
    state: string;
    expiresAt: string | null;
    autoRenewing: boolean;
    testPurchase: boolean;
    verifiedAt: string;
  } | null;
}

interface AdminStudentCohortProps {
  onSyncNeeded?: () => void;
}

export const PLAN_DETAILS: Record<string, { title: string; price: string; period: string }> = {
  monthly: { title: 'Aylık Plan', price: '1.799 ₺/ay', period: '1 Ay' },
  quarterly: { title: '3 Aylık Plan', price: '4.899 ₺', period: '3 Ay' },
  annual: { title: 'Yıllık Plan', price: '14.999 ₺/yıl', period: '1 Yıl' },
};

function formatDaysRemaining(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const ms = Date.parse(expiresAt) - Date.now();
  if (isNaN(ms)) return null;
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days < 0) return 'Süresi doldu';
  if (days === 0) return 'Bugün bitiyor';
  return `${days} gün kaldı`;
}

const ACCESS_TIER_LABELS: Record<AdminUserRecord['accessTier'], { label: string; badgeClass: string }> = {
  subscriber: { label: 'Aktif Ücretli Abone', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold shadow-xs' },
  legacy_lifetime: { label: 'Ömür Boyu (Kazanılmış Hak)', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold' },
  free: { label: 'Ücretsiz Plan', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  parent: { label: 'Veli Hesabı', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  admin: { label: 'Yönetici', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200' },
};

export const AdminStudentCohort: React.FC<AdminStudentCohortProps> = () => {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | 'student' | 'parent' | 'admin'>('all');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [selectedSubscription, setSelectedSubscription] = useState<'all' | 'subscriber' | 'legacy_lifetime' | 'free'>('all');
  const [dialog, setDialog] = useState<{ mode: 'create' } | { mode: 'edit'; user: AdminUserRecord } | null>(null);
  const [subscriptionUser, setSubscriptionUser] = useState<AdminUserRecord | null>(null);
  const [deleting, setDeleting] = useState<AdminUserRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch('/api/admin/users');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Kullanıcı dizini yüklenemedi.');
      setUsers(Array.isArray(body.users) ? body.users : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kullanıcı dizini yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.studentCode || '').toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q);
    const matchesRole = selectedRole === 'all' || u.role === selectedRole;
    const matchesGrade = selectedGrade === 'all' || u.grade === selectedGrade;
    const matchesSubscription =
      selectedSubscription === 'all' ||
      (u.role === 'student' && u.accessTier === selectedSubscription) ||
      (u.role === 'parent' && (
        selectedSubscription === 'subscriber'
          ? users.some((st) => u.linkedStudentIds.includes(st.id) && st.accessTier === 'subscriber')
          : selectedSubscription === 'legacy_lifetime'
          ? users.some((st) => u.linkedStudentIds.includes(st.id) && st.accessTier === 'legacy_lifetime')
          : users.some((st) => u.linkedStudentIds.includes(st.id) && st.accessTier === 'free')
      ));
    return matchesSearch && matchesRole && matchesGrade && matchesSubscription;
  });

  const studentCount = users.filter((u) => u.role === 'student').length;
  const parentCount = users.filter((u) => u.role === 'parent').length;
  const paidSubscriberCount = users.filter((u) => u.role === 'student' && u.accessTier === 'subscriber').length;
  const lifetimeCount = users.filter((u) => u.role === 'student' && u.accessTier === 'legacy_lifetime').length;
  const freeCount = users.filter((u) => u.role === 'student' && u.accessTier === 'free').length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-zinc-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-extrabold text-slate-900">
                Kullanıcı, Aile & Abonelik Dizini
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Canlı Supabase veritabanındaki öğrenci, veli, aile bağlantıları ve Google Play abonelik durumlarını denetleyin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold">
              {studentCount} Öğrenci · {parentCount} Veli
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>{paidSubscriberCount} Ücretli Abone</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lifetimeCount} Ömür Boyu</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
              {freeCount} Ücretsiz
            </div>
            <button
              onClick={() => void loadUsers()}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Yenile</span>
            </button>
            <button
              onClick={() => setDialog({ mode: 'create' })}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Yeni Kullanıcı</span>
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between gap-2">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} aria-label="Bildirimi kapat" className="cursor-pointer">×</button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Ad, e-posta, öğrenci kodu veya ID ile ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Rol:</span>
            </span>
            {(['all', 'student', 'parent', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRole(r)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedRole === r ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r === 'all' ? 'Tümü' : r === 'student' ? 'Öğrenci' : r === 'parent' ? 'Veli' : 'Yönetici'}
              </button>
            ))}

            <span className="text-xs font-bold text-slate-400 ml-2">Sınıf:</span>
            {(['all', 1, 2, 3, 4] as (number | 'all')[]).map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedGrade === g ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {g === 'all' ? 'Tümü' : `${g}. Sınıf`}
              </button>
            ))}

            <span className="text-xs font-bold text-slate-400 ml-2 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Abonelik:</span>
            </span>
            {([
              { id: 'all', label: 'Tümü' },
              { id: 'subscriber', label: 'Ücretli Aboneler' },
              { id: 'legacy_lifetime', label: 'Ömür Boyu VIP' },
              { id: 'free', label: 'Ücretsiz Plan' },
            ] as const).map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSubscription(s.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedSubscription === s.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-zinc-200 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3">Kullanıcı</th>
                <th className="py-3 px-3 text-center">Rol & Sınıf</th>
                <th className="py-3 px-3 text-center">Erişim & Ücretli Abonelik</th>
                <th className="py-3 px-3 text-center">Aile Bağlantısı</th>
                <th className="py-3 px-3 text-center">Seviye & XP</th>
                <th className="py-3 px-3 text-center">Seri & Soru</th>
                <th className="py-3 px-3 text-center">Son Etkinlik</th>
                <th className="py-3 px-3 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    Filtrelere uygun kayıtlı kullanıcı bulunamadı.
                  </td>
                </tr>
              )}
              {filteredUsers.map((u) => {
                const tier = ACCESS_TIER_LABELS[u.accessTier];
                const planInfo = u.subscription?.basePlanId ? PLAN_DETAILS[u.subscription.basePlanId] : null;
                const daysLeft = formatDaysRemaining(u.subscription?.expiresAt ?? null);
                
                // For parents: check if any linked children have active subscriptions
                const linkedChildren = u.role === 'parent' ? users.filter((st) => u.linkedStudentIds.includes(st.id)) : [];
                const subscribedChildren = linkedChildren.filter((st) => st.accessTier === 'subscriber');

                return (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-lg shrink-0">
                          {u.avatar}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {u.deletionPending && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                                Silme Bekliyor
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {u.email || u.studentCode || u.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]">
                        {u.role === 'student' ? `${u.grade || '-'}. Sınıf Öğrenci` : u.role === 'parent' ? 'Veli' : 'Yönetici'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => u.role === 'student' && setSubscriptionUser(u)}
                        title={u.role === 'student' ? 'Abonelik ve erişim durumunu değiştirmek için tıklayın' : undefined}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold text-[11px] border transition-all ${tier.badgeClass} ${u.role === 'student' ? 'cursor-pointer hover:opacity-85 hover:shadow-xs' : ''}`}
                      >
                        {u.accessTier === 'subscriber' && <CreditCard className="w-3 h-3 text-emerald-600" />}
                        {u.accessTier === 'legacy_lifetime' && <ShieldCheck className="w-3 h-3 text-indigo-600" />}
                        <span>{tier.label}</span>
                      </button>

                      {/* Detailed paid subscription info for students */}
                      {u.role === 'student' && u.accessTier === 'subscriber' && (
                        <div className="mt-1.5 space-y-0.5 text-left bg-emerald-50/60 p-2 rounded-lg border border-emerald-200/60 max-w-[210px] mx-auto text-[10px]">
                          <div className="font-bold text-emerald-900 flex items-center justify-between">
                            <span>{planInfo ? `${planInfo.title} (${planInfo.price})` : (u.subscription?.basePlanId || 'Aylık Plan')}</span>
                            {u.subscription?.testPurchase && (
                              <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">Test</span>
                            )}
                          </div>
                          <div className="text-slate-600 flex items-center justify-between font-mono">
                            <span>Kaynak: Google Play</span>
                            <span>{u.subscription?.autoRenewing ? 'Yenilenen' : 'Tek Sefer'}</span>
                          </div>
                          {u.subscription?.expiresAt && (
                            <div className="text-emerald-700 font-bold font-mono">
                              Bitiş: {new Date(u.subscription.expiresAt).toLocaleDateString('tr-TR')} {daysLeft ? `(${daysLeft})` : ''}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Info for legacy lifetime students */}
                      {u.role === 'student' && u.accessTier === 'legacy_lifetime' && (
                        <div className="text-[10px] text-indigo-600 font-medium mt-1">
                          Süresiz VIP Tam Erişim · Ücretsiz
                        </div>
                      )}

                      {/* Info for free students */}
                      {u.role === 'student' && u.accessTier === 'free' && (
                        <div className="text-[10px] text-slate-400 font-medium mt-1">
                          Kısıtlı Erişim (Günde 2 Pratik)
                        </div>
                      )}

                      {/* Info for parents */}
                      {u.role === 'parent' && (
                        <div className="text-[10px] mt-1 font-medium">
                          {subscribedChildren.length > 0 ? (
                            <span className="text-emerald-700 font-bold">
                              ✓ {subscribedChildren.map((c) => c.name).join(', ')} (Ücretli Abone)
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              {linkedChildren.length > 0 ? `${linkedChildren.length} Öğrenci (Ücretsiz)` : 'Öğrenci bağlı değil'}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-600">
                      {u.role === 'student'
                        ? u.linkedParentId
                          ? `Veli: ${u.linkedParentId.slice(0, 8)}…`
                          : 'Bireysel'
                        : u.role === 'parent'
                          ? `${u.linkedStudentIds.length} bağlı öğrenci`
                          : '—'}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="font-bold text-slate-900">Seviye {u.level}</div>
                      <div className="text-[11px] font-mono text-purple-700 font-bold">{u.xp} XP</div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>{u.streak} Gün</span>
                      </span>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {u.totalQuestionsSolved} Çözüm
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center text-slate-500 text-[11px]">
                      {u.lastActiveDate || (u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('tr-TR') : '—')}
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {u.role === 'admin' ? (
                        <span className="text-[10px] text-slate-400">Korumalı</span>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          {u.role === 'student' && (
                            <button
                              onClick={() => setSubscriptionUser(u)}
                              aria-label={`${u.name} kullanıcısının aboneliğini değiştir`}
                              title="Abonelik Değiştir"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setDialog({ mode: 'edit', user: u })}
                            aria-label={`${u.name} kullanıcısını düzenle`}
                            title="Düzenle"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleting(u)}
                            aria-label={`${u.name} kullanıcısını sil`}
                            title="Sil"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {dialog && (
        <UserFormDialog
          dialog={dialog}
          parents={users.filter((u) => u.role === 'parent')}
          onClose={() => setDialog(null)}
          onSaved={(message) => { setDialog(null); setNotice(message); void loadUsers(); }}
          onOpenSubscription={(u) => { setDialog(null); setSubscriptionUser(u); }}
        />
      )}
      {subscriptionUser && (
        <SubscriptionDialog
          user={subscriptionUser}
          onClose={() => setSubscriptionUser(null)}
          onSaved={(message) => { setSubscriptionUser(null); setNotice(message); void loadUsers(); }}
        />
      )}
      {deleting && (
        <DeleteUserDialog
          user={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={(message) => { setDeleting(null); setNotice(message); void loadUsers(); }}
        />
      )}
    </div>
  );
};
