import { currentPolicyVersion } from '../../src/lib/policy-version';
import { Router } from "express";
import { z } from "zod";
import { defaultPlatformSettings } from "../../src/lib/platform-settings";
import {
  configuredExams,
  platformSettingsSchema,
  registrationOpen,
  registrationBlockers,
  releaseBlockers,
} from "../../src/lib/platform-settings";
import { readPlatformSettings } from "../platform-settings";
import { policyHtml, publicPolicy } from "../platform-policy";
import { getServiceClient } from "../supabase-admin";
import {
  requireSupabaseAuth,
  requireVerifiedEmail,
  requireProfileRole,
  type AuthenticatedRequest,
} from "../security";
import { accountSecurityLimiter } from "../rate-limiters";
import { playConfig, playSetupReady, verifyPlayCatalog } from '../google-play-client';
import { paidAccessStartsAt } from '../paid-access-policy';
import { paidSalesReady } from '../google-play-sales';
import type { CachedRead } from '../cached-read';
import type { SettingsRecord } from '../../src/lib/platform-settings';
import { isPublicPolicySlug } from '../../src/content/legal-documents';

export default function createPlatformRoutes(publicSettings: CachedRead<SettingsRecord>) {
  const routes = Router();

  routes.get("/public/platform", async (_req, res) => {
    const { settings, revision } = await publicSettings.get();
    res.json({
      registrationOpen: registrationOpen(settings),
      policyVersion: currentPolicyVersion(revision),
      exams: configuredExams(settings),
    });
  });

  routes.get("/public/policy/:slug", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!isPublicPolicySlug(req.params.slug)) return res.status(404).json({ error: "Bilgi sayfası bulunamadı." });
    // An unavailable database must not silently publish a previously completed policy.
    const { settings } = await readPlatformSettings().catch(() => ({
      settings: defaultPlatformSettings(),
    }));
    const info = publicPolicy(req.params.slug, settings);
    if (!info)
      return res.status(404).json({ error: "Bilgi sayfası bulunamadı." });
    if (req.query.format === "html")
      return res.type("html").send(policyHtml(info));
    return res.json(info);
  });

  routes.use(
    "/admin/platform-settings",
    requireSupabaseAuth,
    requireVerifiedEmail,
    requireProfileRole("admin"),
    accountSecurityLimiter,
  );

  routes.get("/admin/platform-settings", async (_req, res) => {
    const record = await readPlatformSettings();
    res.json({ ...record, blockers: releaseBlockers(record.settings) });
  });

  routes.get('/admin/platform-settings/billing-diagnostics', async (_req,res) => {
    const {settings}=await readPlatformSettings();const config=playConfig(),configured=playSetupReady();let catalogVerified=false;
    if(configured)try{await verifyPlayCatalog();catalogVerified=true;}catch{}
    res.json({provider:'google_play',configured,catalogVerified,enabled:config.enabled,ready:paidSalesReady(settings)&&catalogVerified,enforced:config.enforced,paidAccessFrom:paidAccessStartsAt()===null?null:process.env.GOOGLE_PLAY_PAID_ACCESS_FROM,packageName:config.packageName,productId:config.productId,blockers:releaseBlockers(settings)});
  });

  routes.put(
    "/admin/platform-settings",
    async (req: AuthenticatedRequest, res) => {
      const parsed = z
        .object({
          settings: platformSettingsSchema,
          revision: z.number().int().positive(),
        })
        .strict()
        .safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ error: "Ayar bilgileri geçersiz." });
      const { settings, revision } = parsed.data;
      if (settings.release.registrationEnabled && registrationBlockers(settings).length)
        return res.status(422).json({error:'Yeni aile kaydı için işletmeci, veri koruma ve anahtar güvenliği hazırlığı tamamlanmalıdır.',blockers:registrationBlockers(settings)});
      const { data, error } = await getServiceClient()
        .from("platform_settings")
        .update({
          settings,
          revision: revision + 1,
          updated_by: req.authUser!.uid,
          updated_at: new Date().toISOString(),
        })
        .eq("id", true)
        .eq("revision", revision)
        .select("revision")
        .maybeSingle();
      if (error) throw error;
      if (!data)
        return res
          .status(409)
          .json({
            error:
              "Ayarlar başka bir yönetici tarafından değiştirildi. Yeniden yükleyip deneyin.",
          });
      publicSettings.clear();
      return res.json(await readPlatformSettings());
    },
  );

  return routes;
}
