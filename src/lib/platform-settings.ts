import { z } from "zod";
import { LEARNING_EXAMS } from "../features/student/learning-contract";

const text = z.string().trim().max(6000).default("");
const evidence = z.object({ confirmed: z.boolean().default(false), reference: z.string().trim().max(2000).default("") }).strict().default({ confirmed: false, reference: "" });
const exam = (count: number, seconds: number) =>
  z
    .object({
      count: z.number().int().min(5).max(45).default(count),
      seconds: z.number().int().min(300).max(7200).default(seconds),
    })
    .strict()
    .default({ count, seconds });
export const platformSettingsSchema = z
  .object({
    exams: z
      .object({
        mini: exam(15, 900),
        standard: exam(30, 2400),
        marathon: exam(45, 3600),
      })
      .strict()
      .default({
        mini: { count: 15, seconds: 900 },
        standard: { count: 30, seconds: 2400 },
        marathon: { count: 45, seconds: 3600 },
      }),
    business: z
      .object({
        brandName: z.string().trim().max(160).optional(),
        legalName: text,
        address: text,
        contactPhone: z.string().trim().max(60).optional(),
        contactEmail: z
          .union([z.literal(""), z.string().trim().email().max(254)])
          .default(""),
        legalBases: text,
        retention: text,
        transfers: text,
      })
      .strict()
      .default({
        legalName: "",
        address: "",
        contactEmail: "",
        legalBases: "",
        retention: "",
        transfers: "",
      }),
    commercial: z.object({
      operatorIdentity: evidence,
      privacyAndRetention: evidence,
      internationalTransfers: evidence,
      consumerTerms: evidence,
      taxAndEmployment: evidence,
      credentialRotation: evidence,
      firewall: evidence,
      purchase: evidence,
      purchaseRestore: evidence,
      renewal: evidence,
      cancellationRefund: evidence,
    }).strict().default(() => ({
      operatorIdentity: { confirmed: false, reference: "" }, privacyAndRetention: { confirmed: false, reference: "" },
      internationalTransfers: { confirmed: false, reference: "" }, consumerTerms: { confirmed: false, reference: "" },
      taxAndEmployment: { confirmed: false, reference: "" }, purchase: { confirmed: false, reference: "" },
      credentialRotation: { confirmed: false, reference: "" }, firewall: { confirmed: false, reference: "" },
      purchaseRestore: { confirmed: false, reference: "" }, renewal: { confirmed: false, reference: "" },
      cancellationRefund: { confirmed: false, reference: "" },
    })),
    release: z
      .object({
        registrationEnabled: z.boolean().default(false),
        emailTested: z.boolean().default(false),
        restoreTested: z.boolean().default(false),
        familyPilotTested: z.boolean().default(false),
        monitoringTested: z.boolean().default(false),
      })
      .strict()
      .default({
        registrationEnabled: false,
        emailTested: false,
        restoreTested: false,
        familyPilotTested: false,
        monitoringTested: false,
      }),
  })
  .strict();
export type PlatformSettings = z.infer<typeof platformSettingsSchema>;
export type SettingsRecord = {
  settings: PlatformSettings;
  revision: number;
  updatedAt: string | null;
};
export const defaultPlatformSettings = () => platformSettingsSchema.parse({});
export const COMMERCIAL_CHECKS: Record<keyof PlatformSettings['commercial'], { label: string; registration?: boolean }> = {
  operatorIdentity: { label: 'Gerçek işletmeci kimliği, tam adres ve iletişim doğrulaması', registration: true },
  privacyAndRetention: { label: 'Çocuk/veli verileri, aydınlatma ve saklama-silme politikası incelemesi', registration: true },
  internationalTransfers: { label: 'Yurt dışı aktarım mekanizması ve gerekli sözleşme/bildirim kayıtları', registration: true },
  consumerTerms: { label: 'Satış öncesi bilgilendirme, abonelik ve tüketici metinlerinin incelemesi' },
  taxAndEmployment: { label: 'Vergi/belge düzeni ve varsa memuriyet uygunluğu değerlendirmesi' },
  credentialRotation: { label: 'Paylaşılmış sunucu anahtarlarının değiştirilmesi ve eski anahtarların iptal doğrulaması', registration: true },
  firewall: { label: 'WAF kuralının güvenli devreye alınması ve engelleme doğrulaması' },
  purchase: { label: 'Gerçek cihazda satın alma doğrulaması ve tam erişim testi' },
  purchaseRestore: { label: 'Gerçek cihazda satın alımları geri yükleme testi' },
  renewal: { label: 'Google yenilemesi ve erişim bitişinin güncellenmesi testi' },
  cancellationRefund: { label: 'İptal, iade ve erişim sonlandırma testi' },
};
export const evidenceComplete = (record: PlatformSettings['commercial'][keyof PlatformSettings['commercial']]) => record.confirmed && record.reference.trim().length >= 12;
function businessBlockers(settings: PlatformSettings): string[] {
  const missing: string[] = [];
  const labels = {
    legalName: "Yasal satıcı / veri sorumlusu adı veya unvanı",
    address: "İşletmeci adresi",
    contactPhone: "İşletmeci iş telefonu",
    contactEmail: "Veri talebi iletişim e-postası",
    legalBases: "İşleme amaçları ve hukuki dayanakları",
    retention: "Saklama ve silme süreleri",
    transfers: "Hizmet sağlayıcıları ve yurt dışı aktarım koşulları",
  };
  for (const key of Object.keys(labels) as Array<keyof typeof labels>)
    if (!settings.business[key]?.trim()) missing.push(labels[key]);
  return missing;
}
export function registrationBlockers(settings: PlatformSettings): string[] {
  return [...businessBlockers(settings), ...Object.entries(COMMERCIAL_CHECKS)
    .filter(([key, check]) => check.registration && !evidenceComplete(settings.commercial[key as keyof typeof COMMERCIAL_CHECKS]))
    .map(([, check]) => check.label)];
}
export function releaseBlockers(settings: PlatformSettings): string[] {
  const missing = businessBlockers(settings);
  const checks = {
    emailTested: "Türkçe e-posta ve şifre sıfırlama kabul testi",
    restoreTested: "Şifreli yedekten geri yükleme kabul testi",
    familyPilotTested: "Veli / öğrenci ve aileler arası yetki kabul testi",
    monitoringTested: "Mobil, yük ve hata alarmı kabul testi",
  };
  for (const key of Object.keys(checks) as Array<keyof typeof checks>)
    if (!settings.release[key]) missing.push(checks[key]);
  for (const key of Object.keys(COMMERCIAL_CHECKS) as Array<keyof typeof COMMERCIAL_CHECKS>)
    if (!evidenceComplete(settings.commercial[key])) missing.push(COMMERCIAL_CHECKS[key].label);
  return missing;
}
export const registrationOpen = (settings: PlatformSettings) =>
  settings.release.registrationEnabled && registrationBlockers(settings).length === 0;
export const configuredExams = (settings: PlatformSettings) =>
  LEARNING_EXAMS.map((e) => ({ ...e, ...settings.exams[e.id] }));
