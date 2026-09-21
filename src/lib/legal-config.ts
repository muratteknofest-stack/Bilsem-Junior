const env = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env
  : ((process.env as Record<string, string | undefined>) || {});

const value = (name: string, fallback: string) => String(env[name] || '').trim() || fallback;

export const legalConfig = Object.freeze({
  entityName: value('VITE_LEGAL_ENTITY_NAME', 'Yasal işletme unvanı yapılandırılmadı'),
  address: value('VITE_LEGAL_ENTITY_ADDRESS', 'Yasal tebligat adresi yapılandırılmadı'),
  phone: value('VITE_LEGAL_ENTITY_PHONE', 'Telefon bilgisi yapılandırılmadı'),
  registrationId: value('VITE_LEGAL_REGISTRATION_ID', 'Sicil/MERSİS bilgisi yapılandırılmadı'),
  privacyEmail: value('VITE_PRIVACY_CONTACT_EMAIL', 'Gizlilik iletişim adresi yapılandırılmadı'),
  supportEmail: value('VITE_SUPPORT_EMAIL', 'Destek adresi yapılandırılmadı'),
  premiumPriceDisplay: value('VITE_PREMIUM_PRICE_DISPLAY', 'Fiyat yapılandırılmadı'),
});

export function mailto(valueToCheck: string): string | undefined {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valueToCheck) ? `mailto:${valueToCheck}` : undefined;
}
