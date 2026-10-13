import { shopierSettingsSchema } from "./shopier-config";
import { z } from "zod";
import { LEARNING_EXAMS } from "../features/student/learning-contract";

const text = z.string().trim().max(6000).default("");
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
    shopier: shopierSettingsSchema,
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
export function releaseBlockers(settings: PlatformSettings): string[] {
  const missing: string[] = [];
  const labels = {
    legalName: "Yasal satıcı / veri sorumlusu adı veya unvanı",
    address: "İşletmeci adresi",
    contactEmail: "Veri talebi iletişim e-postası",
    legalBases: "İşleme amaçları ve hukuki dayanakları",
    retention: "Saklama ve silme süreleri",
    transfers: "Hizmet sağlayıcıları ve yurt dışı aktarım koşulları",
  };
  for (const key of Object.keys(labels) as Array<keyof typeof labels>)
    if (!settings.business[key]) missing.push(labels[key]);
  const checks = {
    emailTested: "Türkçe e-posta ve şifre sıfırlama kabul testi",
    restoreTested: "Şifreli yedekten geri yükleme kabul testi",
    familyPilotTested: "Veli / öğrenci ve aileler arası yetki kabul testi",
    monitoringTested: "Mobil, yük ve hata alarmı kabul testi",
  };
  for (const key of Object.keys(checks) as Array<keyof typeof checks>)
    if (!settings.release[key]) missing.push(checks[key]);
  return missing;
}
export const registrationOpen = (settings: PlatformSettings) =>
  settings.release.registrationEnabled;
export const configuredExams = (settings: PlatformSettings) =>
  LEARNING_EXAMS.map((e) => ({ ...e, ...settings.exams[e.id] }));
