/** Canonical public documents shared by web, Android and server routing. */
export const LEGAL_DOCUMENTS = [
  { id: 'kvkk', slug: 'gizlilik-ve-veriler', label: 'Gizlilik ve KVKK', icon: 'Lock' },
  { id: 'terms', slug: 'kullanim-kosullari', label: 'Kullanım koşulları', icon: 'FileText' },
  { id: 'cookies', slug: 'cerez-ve-yerel-depolama', label: 'Çerez ve yerel depolama', icon: 'ShieldCheck' },
  { id: 'subscription', slug: 'abonelik-iptal-ve-iade', label: 'Abonelik, iptal ve iade', icon: 'FileText' },
  { id: 'deletion', slug: 'hesap-ve-veri-silme', label: 'Hesap ve veri silme', icon: 'KeyRound' },
  { id: 'contact', slug: 'iletisim-ve-destek', label: 'İletişim ve işletmeci', icon: 'MessageCircle' },
] as const;
export type LegalDocumentId = typeof LEGAL_DOCUMENTS[number]['id'];
export const PUBLIC_POLICY_SLUGS: readonly string[] = LEGAL_DOCUMENTS.map(item => item.slug);
export const isPublicPolicySlug = (slug: string) => PUBLIC_POLICY_SLUGS.includes(slug);

/** Only fixed, safe destinations; a configured contact never becomes executable HTML. */
export function policyActionLinks(slug: string, contactEmail: string) {
  const email = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(contactEmail) ? contactEmail : 'zeka.kupu.test@gmail.com';
  if (slug === 'hesap-ve-veri-silme') return [
    { label: 'Silme talebini e-posta ile başlat', href: `mailto:${email}?subject=${encodeURIComponent('Bilsem Junior - Hesap ve veri silme talebi')}` },
    { label: 'Veli hesabına giriş', href: '/login?role=parent' },
  ];
  if (slug === 'abonelik-iptal-ve-iade') return [
    { label: 'Google Play aboneliğini yönet / iptal et', href: 'https://play.google.com/store/account/subscriptions' },
    { label: 'Google Play geri ödeme bilgileri', href: 'https://support.google.com/googleplay/answer/2479637?hl=tr' },
  ];
  return [];
}
