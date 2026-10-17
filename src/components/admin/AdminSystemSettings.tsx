import { selectShopierPackageCandidates, shopierConnectionMessage } from '../../lib/shopier-connection';
import React, { useEffect, useState } from "react";
import { authenticatedFetch } from "../../lib/api-client";
import { downloadSafePreferences } from "../../lib/safe-preferences";
import {
  releaseBlockers,
  type SettingsRecord,
  type PlatformSettings,
} from "../../lib/platform-settings";
import { LEARNING_EXAMS } from "../../features/student/learning-contract";
import { SHOPIER_PLANS, SHOPIER_PRODUCT_FIELDS, type ShopierPlanId } from "../../lib/shopier-config";

interface ShopierDiagnosticsPayload {
  blockers?: string[];
  tokenMeta?: {
    configured: boolean;
    validJwtFormat?: boolean;
    merchantId?: string | null;
    hasOrdersRead?: boolean;
    hasProductsRead?: boolean;
    scopesCount?: number;
    expiresAt?: string | null;
    expired?: boolean;
  };
  productsReport?: {
    configured: boolean;
    products: Array<{
      plan: ShopierPlanId;
      readable: boolean;
      idMatches?: boolean;
      priceMatches?: boolean;
      digital?: boolean;
      urlMatches?: boolean;
      inStock?: boolean;
      httpStatus?: number;
      networkCode?: string;
    }>;
  };
  candidatesReport?: {
    configured: boolean;
    readable?: boolean;
    httpStatus?: number;
    challenge?: boolean;
    scanned?: number;
    candidates?: Array<{
      plan: ShopierPlanId;
      productId: string;
      url: string;
      titleMatchesPlan: boolean;
      digital: boolean;
      inStock: boolean;
      noDiscount: boolean;
      freeShipping: boolean;
      noVariants: boolean;
      noOptions: boolean;
    }>;
  };
}

export function AdminSystemSettings({
  onSyncNeeded,
}: {
  onSyncNeeded: () => void;
}) {
  const [record, setRecord] = useState<SettingsRecord | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [diagBusy, setDiagBusy] = useState(false),
    [diagnostics, setDiagnostics] = useState<ShopierDiagnosticsPayload | null>(null);

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

  async function checkShopierConnection() {
    if (diagBusy) return;
    setDiagBusy(true);
    setError("");
    try {
      const response = await authenticatedFetch(
        "/api/admin/platform-settings/shopier-diagnostics"
      );
      const value = await response.json();
      if (!response.ok) {
        throw new Error(value.error || "Shopier bağlantı durumu okunamadı.");
      }
      setDiagnostics(value);
      setNotice("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Shopier bağlantı durumu okunamadı."
      );
    } finally {
      setDiagBusy(false);
    }
  }

  function applyDetectedCandidates() {
    const list = diagnostics?.candidatesReport?.candidates;
    if (!record || !list?.length) return;
    setRecord((r) => {
      if (!r) return r;
      const nextShopier = { ...r.settings.shopier };
      for (const match of selectShopierPackageCandidates(list).selected) {
        const fields = SHOPIER_PRODUCT_FIELDS[match.plan];
        nextShopier[fields.id] = match.productId;
        nextShopier[fields.url] = match.url;
      }
      return {
        ...r,
        settings: {
          ...r.settings,
          shopier: nextShopier,
        },
      };
    });
    setNotice(
      selectShopierPackageCandidates(list).unresolved.length
        ? 'Yalnızca tek ve uygun eşleşmesi bulunan paketler forma aktarıldı. Eksik veya birden fazla eşleşen paketleri kontrol edin; sonra Kaydet ile doğrulayın.'
        : 'Üç paketin tek ve uygun eşleşmeleri forma aktarıldı. Kaydet butonuna basarak sunucuda doğrulayın.'
    );
  }

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
      setDiagnostics(null);
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
    brandName: "Marka adı (şirket unvanı yerine geçmez)",
    legalName: "Yasal satıcı / veri sorumlusu adı veya unvanı",
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
            <section className="rounded-2xl border bg-white p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">Shopier paketleri</h3>
                  <p>Shopier hesabındaki üç ayrı dijital ürünü bağlayın. Gerçek ürün, fiyat ve bağlantı sunucuda Shopier üzerinden kontrol edilir. Erişim anahtarı bu forma yazılmaz.</p>
                </div>
                <button
                  type="button"
                  disabled={diagBusy || busy}
                  onClick={() => void checkShopierConnection()}
                  className="min-h-11 rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-900"
                >
                  {diagBusy ? "Shopier denetleniyor…" : "Shopier bağlantısını denetle ve ürünleri bul"}
                </button>
              </div>

              {diagnostics && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
                  <p className="font-bold text-slate-900">
                    Sunucu Shopier Anahtarı (SHOPIER_ACCESS_TOKEN):{" "}
                    {!diagnostics.tokenMeta?.configured
                      ? "Tanımlı değil"
                      : diagnostics.tokenMeta.validJwtFormat
                      ? `Tanımlı · Mağaza #${diagnostics.tokenMeta.merchantId || "?"} · ${
                          diagnostics.tokenMeta.hasOrdersRead && diagnostics.tokenMeta.hasProductsRead
                            ? "Sipariş & Ürün Okuma Yetkisi Tamam"
                            : "Eksik Yetki Kapsamı"
                        }`
                      : "Geçersiz JWT formatı"}
                  </p>
                  <p role="status" className="rounded-lg border border-indigo-100 bg-white p-3">{shopierConnectionMessage(diagnostics.candidatesReport || {})}</p>
                  {diagnostics.tokenMeta?.expired && <p role="alert" className="rounded-lg bg-amber-100 p-3 text-amber-950">Tanımlı anahtarın süresi dolmuş görünüyor. Vercel’de güncel anahtarı tanımlayın ve yeniden dağıtın.</p>}
                  {!!diagnostics.productsReport?.products.length && <ul className="space-y-2" aria-label="Shopier paket bağlantıları">{diagnostics.productsReport.products.map(product => <li key={product.plan} className="rounded-lg border bg-white p-3"><strong>{SHOPIER_PLANS.find(plan => plan.id === product.plan)?.title}</strong> · {product.readable && product.idMatches && product.priceMatches && product.digital && product.urlMatches && product.inStock ? 'Ürün, fiyat ve bağlantı doğrulandı' : product.httpStatus ? `Doğrulanamadı (HTTP ${product.httpStatus})` : 'Ürün, fiyat, dijital tür, stok ve bağlantı eşleşmesini kontrol edin'}</li>)}</ul>}
                  {!!diagnostics.blockers?.length && <details className="rounded-lg border border-amber-200 bg-amber-50 p-3"><summary className="cursor-pointer font-bold">Satışı açmak için {diagnostics.blockers.length} eksik alan/kontrol</summary><ul className="list-disc space-y-1 pl-5 pt-2">{diagnostics.blockers.map(item => <li key={item}>{item}</li>)}</ul></details>}
                  <div className="flex flex-wrap gap-3 text-xs underline"><a href="https://www.shopier.com/" target="_blank" rel="noopener noreferrer">Shopier hesabını aç</a><a href="https://help.shopier.com/help/kisisel-erisim-anahtari-nedir" target="_blank" rel="noopener noreferrer">Erişim anahtarı rehberi</a></div>
                  {diagnostics.candidatesReport?.readable && (
                    <div className="space-y-2">
                      <p className="text-emerald-900 font-semibold">
                        Shopier API bağlantısı başarılı ({diagnostics.candidatesReport.scanned || 0} ürün tarandı,{" "}
                        {diagnostics.candidatesReport.candidates?.length || 0} uyumlu paket adayı bulundu).
                      </p>
                      {Boolean(diagnostics.candidatesReport.candidates?.length) && (
                        <button
                          type="button"
                          onClick={applyDetectedCandidates}
                          className="min-h-10 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white"
                        >
                          Bulunan ürünleri forma otomatik doldur
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {SHOPIER_PLANS.map(plan => {const fields=SHOPIER_PRODUCT_FIELDS[plan.id];return <div key={plan.id} className="space-y-2 rounded-xl border p-3">
                <h4 className="font-bold">{plan.title} · {plan.days} gün · {(plan.amountKurus/100).toLocaleString('tr-TR')} TL</h4>
                <div className="grid gap-3 sm:grid-cols-2"><label>{plan.title} ürün numarası<input className="block w-full border rounded-lg p-3" value={record.settings.shopier[fields.id]} onChange={e=>setRecord(r=>r&&({...r,settings:{...r.settings,shopier:{...r.settings.shopier,[fields.id]:e.target.value}}}))}/></label>
                <label>{plan.title} ürün bağlantısı<input type="url" className="block w-full border rounded-lg p-3" value={record.settings.shopier[fields.url]} onChange={e=>setRecord(r=>r&&({...r,settings:{...r.settings,shopier:{...r.settings.shopier,[fields.url]:e.target.value}}}))}/></label></div>
              </div>;})}
              <label className="block"><input type="checkbox" checked={record.settings.shopier.enabled} onChange={e=>setRecord(r=>r&&({...r,settings:{...r.settings,shopier:{...r.settings.shopier,enabled:e.target.checked}}}))}/> Shopier satış bağlantılarını aç</label>
              <label className="block"><input type="checkbox" checked={record.settings.shopier.enforcePaidAccess} onChange={e=>setRecord(r=>r&&({...r,settings:{...r.settings,shopier:{...r.settings.shopier,enforcePaidAccess:e.target.checked}}}))}/> Yeni çalışmalar için doğrulanmış paket erişimi iste</label>
              <p className="text-sm">Ücretli erişim başlangıçta kapalıdır. Satışı veya ücretli erişimi açmak için gerçek hesap bağlantısı, işletmeci bilgileri ve kabul kontrolleri tamamlanmalıdır. Mevcut oturumların sonuçları erişilebilir kalır.</p>
            </section>
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
                        value={record.settings.business[key] || ""}
                        onChange={(e) => business(key, e.target.value)}
                        className="mt-2 w-full rounded-lg border p-3"
                      />
                    ) : (
                      <textarea
                        rows={key === "legalName" ? 2 : 4}
                        maxLength={6000}
                        value={record.settings.business[key] || ""}
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
                  : "Hazırlık alanları tamamlandı."}
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
                  Yeni aile kayıtlarını aç.
                </span>
              </label>
              <p>
                Kayıt açma ayarı bağımsızdır. Yukarıdaki hazırlık kayıtları
                eksik işleri gösterir; kayıt açıldığında tamamlandı sayılmaz.
              </p>
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
