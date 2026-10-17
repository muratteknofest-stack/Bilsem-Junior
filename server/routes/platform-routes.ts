import { Router } from "express";
import { z } from "zod";
import { defaultPlatformSettings } from "../../src/lib/platform-settings";
import {
  configuredExams,
  platformSettingsSchema,
  registrationOpen,
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
import { verifyShopierProducts } from '../shopier-client';
import { ShopierError } from '../shopier-model';
import {
  inspectShopierProducts,
  inspectShopierPackageCandidates,
  inspectShopierTokenMetadata,
} from '../shopier-diagnostics';

const routes = Router();

routes.get("/public/platform", async (_req, res) => {
  const { settings, revision } = await readPlatformSettings();
  res.json({
    registrationOpen: registrationOpen(settings),
    policyVersion: `2026-10-11.${revision}`,
    exams: configuredExams(settings),
  });
});

routes.get("/public/policy/:slug", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
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

routes.get("/admin/platform-settings/shopier-diagnostics", async (_req, res) => {
  const record = await readPlatformSettings().catch(() => ({
    settings: defaultPlatformSettings(),
  }));
  const tokenMeta = inspectShopierTokenMetadata();
  const [productsReport, candidatesReport] = await Promise.all([
    inspectShopierProducts(record.settings.shopier),
    inspectShopierPackageCandidates(),
  ]);
  res.json({
    tokenMeta,
    productsReport,
    candidatesReport,
  });
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
    if (settings.shopier.enabled || settings.shopier.enforcePaidAccess) {
      if (releaseBlockers(settings).length) return res.status(422).json({ error: 'Ücretli satış için işletmeci bilgileri ve kabul kontrolleri tamamlanmalı.' });
      try { await verifyShopierProducts(settings.shopier); }
      catch(error) { if(error instanceof ShopierError) return res.status(error.status).json({error:error.message}); throw error; }
    }
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
    return res.json(await readPlatformSettings());
  },
);

export default routes;
