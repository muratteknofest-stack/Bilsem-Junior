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
  if (
    !b.legalName ||
    !b.address ||
    !b.contactEmail ||
    !b.legalBases ||
    !b.retention ||
    !b.transfers
  )
    return info;
  const identity = {
    title: "İşletmeci ve veri sorumlusu",
    paragraphs: [
      b.legalName,
      b.address,
      `İletişim ve veri talepleri: ${b.contactEmail}`,
    ],
  };
  if (slug === "gizlilik-ve-veriler") {
    info.sections = info.sections.filter(
      (s) => !s.title.includes("tamamlanması gereken"),
    );
    info.sections.unshift(identity);
    info.sections.push(
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
    info.sections.unshift(identity);
    info.sections = info.sections.map((s) => ({
      ...s,
      paragraphs: s.paragraphs.filter(
        (p) => !p.includes("kimlik ve adres bilgileri henüz"),
      ),
    }));
  } else if (slug === "iletisim-ve-destek") info.sections[0] = identity;
  info.sections = info.sections.map((s) => ({
    ...s,
    paragraphs: s.paragraphs.map((p) =>
      p.replaceAll(SUPPORT_EMAIL, b.contactEmail),
    ),
  }));
  return info;
}
export function policyHtml(info: PlatformInfo): string {
  const url = `https://zekapark.vercel.app/bilgi/${info.slug}`;
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: info.title,
    url,
  }).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(info.title)} | ZekaPark</title><meta name="description" content="${escapeHtml(info.description)}"><link rel="canonical" href="${url}"><script type="application/ld+json">${schema}</script><link rel="stylesheet" href="/blog-assets/blog.css"></head><body><a class="skip" href="#icerik">İçeriğe geç</a><header class="header"><div class="wrap nav"><a class="brand" href="/"><img src="/logo.svg" alt="" width="38" height="38">Zeka<span>Park</span></a><nav aria-label="Ana menü"><a href="/blog">Blog</a><a href="/bilgi/hesap-ve-veli-rehberi">Veli rehberi</a></nav></div></header><main id="icerik" class="wrap policy"><h1>${escapeHtml(info.title)}</h1><p>${escapeHtml(info.description)}</p>${info.sections.map((s) => `<section><h2>${escapeHtml(s.title)}</h2>${s.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}</section>`).join("")}</main><footer class="footer"><div class="wrap platform-static-footer"><div><a class="brand" href="/">Zeka<span>Park</span></a><p>1–4. sınıflar için düşünme alıştırmaları.</p></div>${FOOTER_GROUPS.map(group => `<nav aria-label="${escapeHtml(group.title)}"><h2>${escapeHtml(group.title)}</h2>${group.links.map(link => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join('')}</nav>`).join('')}</div><div class="wrap copyright">© 2026 ZekaPark · Bağımsız eğitim platformu.</div></footer></body></html>`;
}
