import {
  SUPPORT_EMAIL,
  FOOTER_GROUPS,
  PLATFORM_INFO,
  type PlatformInfo,
} from "../src/content/platform-info";
import type { PlatformSettings } from "../src/lib/platform-settings";
import { escapeHtml } from "./security";

export function publicPolicy(
  slug: string,
  settings: PlatformSettings,
): PlatformInfo | undefined {
  const source = PLATFORM_INFO.find((p) => p.slug === slug);
  if (!source) return undefined;
  const info: PlatformInfo = structuredClone(source),
    b = settings.business;
  const hasIdentity = !!(b.legalName && b.address && b.contactEmail);
  const hasContact = !!(b.contactEmail && (b.brandName || b.legalName));
  const hasLegalDetails = !!(b.legalBases && b.retention && b.transfers);
  info.contactEmail = b.contactEmail || SUPPORT_EMAIL;
  const identity = {
    title: hasIdentity ? "Yasal satıcı ve veri sorumlusu" : "Marka ve iletişim",
    paragraphs: [
      b.brandName ? `Marka: ${b.brandName}` : "", b.legalName, b.address,
      b.contactEmail ? `İletişim ve veri talepleri: ${b.contactEmail}` : "",
    ].filter(Boolean),
  };
  if (slug === "gizlilik-ve-veriler") {
    if (hasIdentity || hasContact) info.sections.unshift(identity);
    if (hasIdentity && hasLegalDetails) info.sections = info.sections.filter(s => !s.title.includes("tamamlanması gereken"));
    else if (hasIdentity) info.sections = info.sections.map(s => s.title.includes("tamamlanması gereken") ? {
      ...s, paragraphs: ["İşletmeci iletişim bilgileri yukarıda sunulmuştur. Her işleme amacı için hukuki dayanak, saklama ve silme süreleri ile yurt dışı aktarım koşulları henüz tamamlanmamıştır. Bu açıklama tamamlanmış bir KVKK aydınlatma metni veya mevzuata uyum güvencesi değildir."]
    } : s);
    if (hasLegalDetails) info.sections.push(
      {
        title: "İşleme amaçları ve hukuki dayanakları",
        paragraphs: [b.legalBases],
      },
      { title: "Saklama ve silme süreleri", paragraphs: [b.retention] },
      {
        title: "Alıcılar ve yurt dışı aktarım koşulları",
        paragraphs: [b.transfers],
      },
      {
        title: "KVKK kapsamındaki haklarınız",
        paragraphs: [
          "KVKK 11. madde kapsamında verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, amacına uygun kullanımı ve alıcıları öğrenme, düzeltme, silme veya yok etme talebi, bu işlemlerin alıcılara bildirilmesi, otomatik analiz sonucuna itiraz ve zararın giderilmesini talep etme haklarınız için yukarıdaki iletişim kanalından başvurabilirsiniz.",
        ],
      },
    );
  } else if (slug === "kullanim-kosullari") {
    if (hasIdentity || hasContact) info.sections.unshift(identity);
    if (hasIdentity) info.sections = info.sections.map((s) => ({
      ...s,
      paragraphs: s.paragraphs.map(p => p.replace("İşletmecinin doğrulanmış kimlik ve adres bilgileri henüz projede tamamlanmamıştır. ", "")),
    }));
  } else if (slug === "iletisim-ve-destek" && (hasIdentity || hasContact)) info.sections[0] = identity;
  info.sections = info.sections.map((s) => ({
    ...s,
    paragraphs: s.paragraphs.map((p) =>
      p.replaceAll(SUPPORT_EMAIL, info.contactEmail!),
    ),
  }));
  return info;
}
export function policyHtml(info: PlatformInfo): string {
  const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://zekapark.vercel.app').replace(/\/+$/, '');
  const url = `${siteUrl}/bilgi/${info.slug}`;
  const contactEmail = info.contactEmail && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(info.contactEmail) ? info.contactEmail : SUPPORT_EMAIL;
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: info.title,
    url,
  }).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(info.title)} | BİLSEM Junior</title><meta name="description" content="${escapeHtml(info.description)}"><link rel="canonical" href="${url}"><script type="application/ld+json">${schema}</script><link rel="stylesheet" href="/blog-assets/blog.css"></head><body><a class="skip" href="#icerik">İçeriğe geç</a><header class="header"><div class="wrap nav"><a class="brand" href="/"><img src="/logo.svg" alt="" width="38" height="38">BİLSEM <span>Junior</span></a><nav aria-label="Ana menü"><a href="/blog">Blog</a><a href="/bilgi/hesap-ve-veli-rehberi">Veli rehberi</a></nav></div></header><main id="icerik" class="wrap policy platform-info-main"><header class="platform-info-hero"><div class="platform-info-hero-badge"><span class="platform-info-badge-dot"></span><span>${escapeHtml(info.badge || 'UYGULAMA REHBERİ')}</span></div><h1>${escapeHtml(info.title)}</h1><p class="article-intro">${escapeHtml(info.description)}</p><div class="platform-info-meta-chips"><span class="platform-info-chip">📅 10 Ekim 2026</span><span class="platform-info-chip">🛡️ Uygulama ve işletmeci bilgileri</span><span class="platform-info-chip">✨ 1–4. Sınıf Keşif Alanı</span></div></header><article class="prose platform-info-prose"><div class="platform-info-sections-wrap">${info.sections.map((s, i) => `<section class="platform-info-card"><div class="platform-info-card-header"><span class="platform-info-sec-badge" aria-hidden="true">0${i + 1}</span><h2>${escapeHtml(s.title)}</h2></div><div class="platform-info-card-body">${s.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}</div></section>`).join("")}</div><div class="platform-info-action-box"><div class="platform-info-action-copy"><h3>Daha fazla bilgi veya soru bildirmek mi istiyorsunuz?</h3><p>Pedagojik içeriklerimiz ve geri bildirimleriniz için bize her zaman ulaşabilirsiniz.</p></div><div class="platform-info-action-buttons"><a class="button light" href="/">Ana Sayfa ↗</a><a class="button" href="mailto:${escapeHtml(contactEmail)}">E-posta ile İletişim Kur ✉</a></div></div></article></main><footer class="footer"><div class="wrap platform-static-footer"><div><a class="brand" href="/">BİLSEM <span>Junior</span></a><p>1–4. sınıflar için düşünme alıştırmaları.</p><div class="platform-static-footer-pills" aria-label="Bilişsel beceri alanları"><span class="platform-static-chip">🧩 Örüntü</span><span class="platform-static-chip">💡 Mantık</span><span class="platform-static-chip">🎯 Dikkat</span><span class="platform-static-chip">👁️ Görsel</span><span class="platform-static-chip">🔢 Matris</span><span class="platform-static-chip">📐 Uzamsal</span><span class="platform-static-chip">🧮 Sayılar</span><span class="platform-static-chip">💻 Kodlama</span></div></div>${FOOTER_GROUPS.map(group => `<nav aria-label="${escapeHtml(group.title)}"><h2>${escapeHtml(group.title)}</h2>${group.links.map(link => `<a href="${escapeHtml(link.href)}" class="platform-static-link-card"><span class="platform-static-link-row"><span>${escapeHtml(link.label)}</span>${link.tag ? `<span class="platform-static-link-tag">${escapeHtml(link.tag)}</span>` : ''}</span></a>`).join('')}</nav>`).join('')}</div><div class="wrap copyright">© 2026 BİLSEM Junior · Bağımsız eğitim platformu.</div></footer></body></html>`;
}

