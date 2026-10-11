import React, { useEffect, useState } from "react";
import { authenticatedFetch } from "../../lib/api-client";
import { downloadSafePreferences } from "../../lib/safe-preferences";
import {
  releaseBlockers,
  type SettingsRecord,
  type PlatformSettings,
} from "../../lib/platform-settings";
import { LEARNING_EXAMS } from "../../features/student/learning-contract";

export function AdminSystemSettings({
  onSyncNeeded,
}: {
  onSyncNeeded: () => void;
}) {
  const [record, setRecord] = useState<SettingsRecord | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setError("");
    try {
      const response = await authenticatedFetch("/api/admin/platform-settings");
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || "Ayarlar yüklenemedi.");
      setRecord(value);
      setNotice("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ayarlar yüklenemedi.");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!record || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await authenticatedFetch(
        "/api/admin/platform-settings",
        {
          method: "PUT",
          body: JSON.stringify({
            settings: record.settings,
            revision: record.revision,
          }),
        },
      );
      const value = await response.json();
      if (!response.ok)
        throw new Error(value.error || "Ayarlar kaydedilemedi.");
      setRecord(value);
      setNotice(
        "Ayarlar Supabase’e kaydedildi. Yeni çalışmalar güncel sınav ayarlarını kullanır.",
      );
      onSyncNeeded();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Ayarlar kaydedilemedi.",
      );
    } finally {
      setBusy(false);
    }
  }
  function business(key: keyof PlatformSettings["business"], value: string) {
    setRecord(
      (r) =>
        r && {
          ...r,
          settings: {
            ...r.settings,
            business: { ...r.settings.business, [key]: value },
          },
        },
    );
    setNotice("");
  }
  const labels: Record<keyof PlatformSettings["business"], string> = {
    legalName: "İşletmeci / veri sorumlusu unvanı",
    address: "İşletmeci adresi",
    contactEmail: "İletişim ve veri talebi e-postası",
    legalBases: "Her işleme amacı ve hukuki dayanağı",
    retention: "Veri türlerine göre saklama ve silme süreleri",
    transfers: "Alıcılar, hizmet sağlayıcıları ve yurt dışı aktarım koşulları",
  };
  const checks: Record<
    Exclude<keyof PlatformSettings["release"], "registrationEnabled">,
    string
  > = {
    emailTested:
      "Altı Türkçe e-posta, doğrulama ve şifre sıfırlama canlıda test edildi.",
    restoreTested:
      "Şifreli veritabanı yedeği ayrı test ortamına başarıyla geri yüklendi.",
    familyPilotTested:
      "1–4. sınıflarla aile pilotu, panel geçişleri ve aileler arası erişim kontrolü geçti.",
    monitoringTested:
      "Gerçek mobil cihazlar, eşzamanlı sınav yükü ve hata alarmı teslimatı test edildi.",
  };
  return (
    <section className="space-y-5">
      <h2 className="text-2xl font-bold">Sistem ayarları ve yayın hazırlığı</h2>
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-900">
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-emerald-900"
        >
          {notice}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => void load()}
        className="min-h-11 rounded-xl border px-4"
      >
        Ayarları yeniden yükle
      </button>
      {!record ? (
        <p role="status">Ayarlar bekleniyor.</p>
      ) : (
        <form onSubmit={save} className="space-y-6">
          <fieldset disabled={busy} className="space-y-6">
            <section className="rounded-2xl border bg-white p-5">
              <h3 className="mb-4 text-lg font-bold">
                Yeni denemelerin soru sayısı ve toplam süresi
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {LEARNING_EXAMS.map((exam) => (
                  <div key={exam.id}>
                    <h4 className="font-semibold">{exam.title}</h4>
                    <label className="mt-3 block">
                      Soru sayısı
                      <input
                        type="number"
                        min={5}
                        max={45}
                        required
                        value={record.settings.exams[exam.id].count}
                        onChange={(e) => {
                          const count = Number(e.target.value);
                          setRecord(
                            (r) =>
                              r && {
                                ...r,
                                settings: {
                                  ...r.settings,
                                  exams: {
                                    ...r.settings.exams,
                                    [exam.id]: {
                                      ...r.settings.exams[exam.id],
                                      count,
                                    },
                                  },
                                },
                              },
                          );
                          setNotice("");
                        }}
                        className="my-2 w-full rounded-lg border p-3"
                      />
                    </label>
                    <label>
                      Toplam süre (dakika)
                      <input
                        type="number"
                        min={5}
                        max={120}
                        required
                        value={record.settings.exams[exam.id].seconds / 60}
                        onChange={(e) => {
                          const seconds = Number(e.target.value) * 60;
                          setRecord(
                            (r) =>
                              r && {
                                ...r,
                                settings: {
                                  ...r.settings,
                                  exams: {
                                    ...r.settings.exams,
                                    [exam.id]: {
                                      ...r.settings.exams[exam.id],
                                      seconds,
                                    },
                                  },
                                },
                              },
                          );
                          setNotice("");
                        }}
                        className="my-2 w-full rounded-lg border p-3"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </section>
            <section className="space-y-4 rounded-2xl border bg-white p-5">
              <h3 className="text-lg font-bold">
                Kayıt öncesinde yayımlanan işletmeci bilgileri
              </h3>
              <p>
                Doğrulanmış bilgileri girin. Bu alanların doldurulması hukuki
                inceleme yerine geçmez. Bilgiler gizlilik, koşullar ve iletişim
                sayfalarında yayımlanır.
              </p>
              {(Object.keys(labels) as Array<keyof typeof labels>).map(
                (key) => (
                  <label className="block" key={key}>
                    {labels[key]}
                    {key === "contactEmail" ? (
                      <input
                        type="email"
                        maxLength={254}
                        value={record.settings.business[key]}
                        onChange={(e) => business(key, e.target.value)}
                        className="mt-2 w-full rounded-lg border p-3"
                      />
                    ) : (
                      <textarea
                        rows={key === "legalName" ? 2 : 4}
                        maxLength={6000}
                        value={record.settings.business[key]}
                        onChange={(e) => business(key, e.target.value)}
                        className="mt-2 w-full rounded-lg border p-3"
                      />
                    )}
                  </label>
                ),
              )}
            </section>
            <section className="space-y-4 rounded-2xl border bg-white p-5">
              <h3 className="text-lg font-bold">
                Gerçek ortam kabul kayıtları
              </h3>
              <p>
                Yalnızca tamamladığınız testleri işaretleyin. Kutular yönetici
                beyanıdır; otomatik test sonucu değildir. Test kanıtlarını
                güvenli işletim kaydında saklayın.
              </p>
              {(Object.keys(checks) as Array<keyof typeof checks>).map(
                (key) => (
                  <label key={key} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={record.settings.release[key]}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setRecord(
                          (r) =>
                            r && {
                              ...r,
                              settings: {
                                ...r.settings,
                                release: {
                                  ...r.settings.release,
                                  [key]: checked,
                                },
                              },
                            },
                        );
                        setNotice("");
                      }}
                      className="mt-1 h-5 w-5"
                    />
                    <span>{checks[key]}</span>
                  </label>
                ),
              )}
              <p className="font-semibold">
                Eksik:{" "}
                {releaseBlockers(record.settings).length
                  ? releaseBlockers(record.settings).join(" · ")
                  : "Zorunlu hazırlık alanları tamamlandı."}
              </p>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={record.settings.release.registrationEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setRecord(
                      (r) =>
                        r && {
                          ...r,
                          settings: {
                            ...r.settings,
                            release: {
                              ...r.settings.release,
                              registrationEnabled: enabled,
                            },
                          },
                        },
                    );
                    setNotice("");
                  }}
                  className="mt-1 h-5 w-5"
                />
                <span>
                  Hazırlık tamamlandıktan sonra yeni aile kayıtlarını aç.
                </span>
              </label>
              <p>
                Ücretli satış etkin değildir. Ödeme sağlayıcısı ve sunucu
                kullanım hakları kurulana kadar abonelik satışı açılmaz.
              </p>
            </section>
            <button
              disabled={busy}
              className="min-h-12 rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white"
            >
              {busy ? "Kaydediliyor…" : "Ayarları Supabase’e kaydet"}
            </button>
          </fieldset>
        </form>
      )}
      <section className="rounded-2xl border bg-white p-5">
        <h3 className="text-lg font-bold">Tarayıcı tercihleri</h3>
        <p className="my-3">
          Yalnızca izin verilen tema ve ses tercihleri indirilir. Oturum ve
          öğrenci verileri dahil değildir. Bu dosya veritabanı yedeği değildir.
        </p>
        <button
          onClick={downloadSafePreferences}
          className="min-h-11 rounded-xl border px-4"
        >
          Güvenli tarayıcı tercihlerini indir
        </button>
        <p className="mt-4">
          Gerçek yedekleme için projenin işletim rehberini kullanın.
        </p>
      </section>
    </section>
  );
}
