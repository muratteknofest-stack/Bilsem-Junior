import React, { useState } from 'react';
import { authenticatedFetch } from '../../lib/api-client';
import { AlertCircle, Loader2, X } from 'lucide-react';
import type { AdminUserRecord } from './AdminStudentCohort';

type UserDialog = { mode: 'create' } | { mode: 'edit'; user: AdminUserRecord };

interface FormState {
  role: 'student' | 'parent';
  name: string;
  email: string;
  password: string;
  grade: number;
  parentId: string;
  level: string;
  xp: string;
}

const inputClass = 'w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500 disabled:bg-slate-50 disabled:text-slate-400';

async function send(url: string, method: 'POST' | 'PATCH', body: unknown) {
  const response = await authenticatedFetch(url, { method, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'İşlem tamamlanamadı.');
  return result;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
          <button onClick={onClose} aria-label="Kapat" className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /><span>{message}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-[11px] font-bold text-slate-500">{label}</span>{children}</label>;
}

export const UserFormDialog: React.FC<{
  dialog: UserDialog;
  parents: AdminUserRecord[];
  onClose: () => void;
  onSaved: (message: string) => void;
}> = ({ dialog, parents, onClose, onSaved }) => {
  const editing = dialog.mode === 'edit' ? dialog.user : null;
  const [form, setForm] = useState<FormState>({
    role: editing && editing.role !== 'admin' ? editing.role : 'student',
    name: editing?.name ?? '',
    email: editing?.email ?? '',
    password: '',
    grade: editing?.grade ?? 1,
    parentId: editing?.linkedParentId ?? '',
    level: String(editing?.level ?? 1),
    xp: String(editing?.xp ?? 0),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(prev => ({ ...prev, [key]: value }));
  const isStudent = form.role === 'student';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!editing) {
        await send('/api/admin/users', 'POST', {
          role: form.role,
          name: form.name,
          password: form.password,
          ...(isStudent ? { grade: form.grade, parentId: form.parentId || null } : { email: form.email }),
        });
        onSaved(`${form.name} eklendi.`);
      } else {
        const changes: Record<string, unknown> = {};
        if (form.name.trim() !== editing.name) changes.name = form.name;
        if (editing.role === 'parent' && form.email.trim().toLowerCase() !== (editing.email ?? '')) changes.email = form.email;
        if (form.password) changes.password = form.password;
        if (editing.role === 'student') {
          if (form.grade !== editing.grade) changes.grade = form.grade;
          if ((form.parentId || null) !== editing.linkedParentId) changes.parentId = form.parentId || null;
        }
        if (Number(form.level) !== editing.level) changes.level = Number(form.level);
        if (Number(form.xp) !== editing.xp) changes.xp = Number(form.xp);
        if (!Object.keys(changes).length) { onClose(); return; }
        await send(`/api/admin/users/${editing.id}`, 'PATCH', changes);
        onSaved(`${form.name} güncellendi.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşlem tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={editing ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {!editing && (
          <Field label="Hesap Türü">
            <select className={inputClass} value={form.role} onChange={e => set('role', e.target.value as FormState['role'])}>
              <option value="student">Öğrenci</option>
              <option value="parent">Veli</option>
            </select>
          </Field>
        )}
        <Field label={isStudent ? 'Öğrenci Takma Adı' : 'Veli Adı'}>
          <input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} required minLength={2} maxLength={50} />
        </Field>
        {!isStudent && (
          <Field label="E-posta">
            <input type="email" className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} required />
          </Field>
        )}
        {isStudent && editing && (
          <Field label="Öğrenci E-postası (değiştirilemez)">
            <input className={inputClass} value={editing.email ?? ''} disabled readOnly />
          </Field>
        )}
        <Field label={editing ? 'Yeni Şifre (boş bırakılırsa değişmez)' : 'Şifre'}>
          <input type="password" autoComplete="new-password" className={inputClass} value={form.password}
            onChange={e => set('password', e.target.value)} required={!editing} />
        </Field>
        {isStudent && (
          <>
            <Field label="Sınıf">
              <select className={inputClass} value={form.grade} onChange={e => set('grade', Number(e.target.value))}>
                {[1, 2, 3, 4].map(g => <option key={g} value={g}>{g}. Sınıf</option>)}
              </select>
            </Field>
            <Field label="Bağlı Veli">
              <select className={inputClass} value={form.parentId} onChange={e => set('parentId', e.target.value)}>
                <option value="">Bireysel (veli yok)</option>
                {parents.map(p => <option key={p.id} value={p.id}>{p.name} · {p.email}</option>)}
              </select>
            </Field>
          </>
        )}
        {editing && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Seviye"><input type="number" min={1} max={1000} className={inputClass} value={form.level} onChange={e => set('level', e.target.value)} /></Field>
            <Field label="XP"><input type="number" min={0} className={inputClass} value={form.xp} onChange={e => set('xp', e.target.value)} /></Field>
          </div>
        )}
        <ErrorLine message={error} />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer">Vazgeç</button>
          <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{editing ? 'Kaydet' : 'Ekle'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const DeleteUserDialog: React.FC<{
  user: AdminUserRecord;
  onClose: () => void;
  onDeleted: (message: string) => void;
}> = ({ user, onClose, onDeleted }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const children = user.role === 'parent' ? user.linkedStudentIds.length : 0;

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await send(`/api/admin/users/${user.id}/delete`, 'POST', { confirm: true });
      onDeleted(`${result.deletedAccounts ?? 1} hesap silindi.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Kullanıcıyı Sil" onClose={onClose}>
      <p className="text-xs text-slate-700">
        <strong>{user.name}</strong> ({user.email || user.studentCode}) kalıcı olarak silinecek. Öğrencinin ilerlemesi, oturumları ve test kayıtları da silinir. Bu işlem geri alınamaz.
      </p>
      {children > 0 && (
        <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
          Bu veliye bağlı {children} öğrenci hesabı da birlikte silinecek.
        </p>
      )}
      <ErrorLine message={error} />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer">Vazgeç</button>
        <button onClick={() => void confirm()} disabled={busy} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>Evet, Sil</span>
        </button>
      </div>
    </Modal>
  );
};
