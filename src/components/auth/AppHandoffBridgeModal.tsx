import React, { useEffect, useState } from 'react';
import { ModalDialog } from '../ui/ModalDialog';
import { Badge } from '../ui/Badge';
import { requestAppHandoff, type AppHandoffResult } from '../../lib/app-handoff-client';
import { Smartphone, Download, ExternalLink, Copy, Check, Sparkles, ShieldCheck, Loader2 } from 'lucide-react';

interface AppHandoffBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentCode?: string;
  studentName?: string;
}

export const AppHandoffBridgeModal: React.FC<AppHandoffBridgeModalProps> = ({
  isOpen,
  onClose,
  studentCode,
  studentName,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<AppHandoffResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setHandoff(null);
      setError(null);
      setCopied(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    requestAppHandoff(studentCode, studentName)
      .then(res => {
        if (active) setHandoff(res);
      })
      .catch(err => {
        if (active) setError(err.message || 'Aktarım bağlantısı oluşturulamadı.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, studentCode, studentName]);

  const handleCopyCode = () => {
    if (!handoff?.code) return;
    navigator.clipboard.writeText(handoff.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };

  return (
    <ModalDialog
      open={isOpen}
      onClose={onClose}
      title="Android Uygulamasına Otomatik Geçiş"
      description="Web oturumunuzu Android uygulamasına tek dokunuşla aktarın."
      maxWidth="lg"
    >
      <div className="space-y-5 pt-2">
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="w-8 h-8 text-[var(--accent-primary)] animate-spin" />
            <p className="text-sm text-[var(--text-secondary)] font-medium">
              Güvenli oturum aktarım bağlantısı hazırlanıyor…
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            <p className="font-medium">{error}</p>
            <p className="text-xs mt-1 text-[var(--text-secondary)]">Lütfen sayfayı yenileyip tekrar deneyin.</p>
          </div>
        )}

        {handoff && (
          <>
            <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-muted)] tracking-wider uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Otomatik Giriş Hazır
                </span>
                <Badge variant="success">30 Dakika Geçerli</Badge>
              </div>
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                {studentName ? (
                  <><strong>{studentName}</strong> öğrencisinin hesabı için aktarım hazırlandı. </>
                ) : null}
                Uygulamayı Google Play'den indirdiğinizde veya açtığınızda hesabınız <strong>şifre girmeden otomatik açılır</strong>.
              </p>
            </div>

            <div className="space-y-3">
              {/* Option 1: Open app directly if already installed */}
              <a
                href={handoff.deepLinkUrl}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-semibold text-sm transition-all shadow-md group"
              >
                <span className="flex items-center gap-2.5">
                  <Smartphone className="w-5 h-5 text-white/90" />
                  <span>Uygulama Yüklüyse: <strong>Uygulamada Aç ve Giriş Yap</strong></span>
                </span>
                <ExternalLink className="w-4 h-4 text-white/70 group-hover:translate-x-0.5 transition-transform" />
              </a>

              {/* Option 2: Download from Play Store with referrer */}
              <a
                href={handoff.playStoreReferrerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[var(--surface-card)] hover:bg-[var(--surface-muted)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-sm transition-all group"
              >
                <span className="flex items-center gap-2.5">
                  <Download className="w-5 h-5 text-emerald-500" />
                  <span>Henüz Yüklü Değilse: <strong>Google Play'den İndir</strong></span>
                </span>
                <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                  Otomatik Girişli
                </span>
              </a>
            </div>

            {/* Quick 6-char Handoff Code fallback */}
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between bg-[var(--surface-canvas)] p-3 rounded-xl border border-[var(--border-subtle)]">
                <div>
                  <span className="text-[11px] font-medium text-[var(--text-muted)] block">Hızlı Aktarım Kodu</span>
                  <span className="text-lg font-mono font-bold tracking-widest text-[var(--accent-primary)]">
                    {handoff.code}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-card)] hover:bg-[var(--surface-muted)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500">Kopyalandı</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Kopyala</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                Uygulamayı açtığınızda giriş ekranındaki "Web'den Aktar" alanına bu kodu yazarak da anında giriş yapabilirsiniz.
              </p>
            </div>
          </>
        )}
      </div>
    </ModalDialog>
  );
};
