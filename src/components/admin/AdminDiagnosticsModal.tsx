import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { AdminStressTest } from './AdminStressTest';

/** Use the same proof pipeline as the full laboratory, never structure-only success. */
export function AdminDiagnosticsModal({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), title = useId();
  useEffect(() => {
    const element = dialog.current!;
    const focused = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => { element.close(); focused?.focus(); };
  }, []);
  return <dialog ref={dialog} aria-labelledby={title} onCancel={e => { e.preventDefault(); onClose(); }} className="m-auto w-[min(960px,95vw)] max-h-[90vh] rounded-2xl bg-slate-50 p-0 backdrop:bg-black/60">
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4"><h1 id={title} className="font-bold text-slate-900">Sistem tanısı</h1><button autoFocus type="button" aria-label="Tanıyı kapat" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button></header>
    <div className="p-4 sm:p-6"><AdminStressTest /></div>
  </dialog>;
}
