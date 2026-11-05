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
import { lifetimeAccessBefore, paidAccessStartsAt } from '../paid-access-policy';
import { paidSalesReady } from '../google-play-sales';
import { licenseTestExpiresAt, licenseTestLegalReady } from '../google-play-license-test';
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
    const licenseTestUntil = licenseTestExpiresAt();
    res.json({provider:'google_play',lifetimeAccessBefore:lifetimeAccessBefore()===null?null:new Date(lifetimeAccessBefore()!).toISOString(),configured,catalogVerified,enabled:config.enabled,ready:paidSalesReady(settings)&&catalogVerified,licenseTestUntil,licenseTestReady:!!licenseTestUntil&&configured&&catalogVerified&&licenseTestLegalReady(settings),enforced:config.enforced,paidAccessFrom:paidAccessStartsAt()===null?null:process.env.GOOGLE_PLAY_PAID_ACCESS_FROM,packageName:config.packageName,productId:config.productId,blockers:releaseBlockers(settings)});
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

  routes.get(
    "/admin/users",
    requireSupabaseAuth,
    requireVerifiedEmail,
    requireProfileRole("admin"),
    accountSecurityLimiter,
    async (_req, res) => {
      const client = getServiceClient();
      const [profilesRes, subsRes] = await Promise.all([
        client
          .from("profiles")
          .select("id,email,name,role,student_code,linked_student_ids,linked_parent_id,grade,avatar,level,xp,streak,longest_streak,last_active_date,today_practiced,streak_freeze_count,total_questions_solved,resolved_mistakes_count,created_at,last_login_at,deletion_pending")
          .order("created_at", { ascending: false })
          .limit(200),
        client
          .from("google_play_subscriptions")
          .select("parent_id,student_id,base_plan_id,subscription_state,expires_at,auto_renewing,test_purchase,verified_at")
          .order("verified_at", { ascending: false })
          .limit(200),
      ]);
      if (profilesRes.error) return res.status(500).json({ error: "Kullanıcı dizini yüklenemedi." });
      const subsByStudent = new Map<string, {
        parentId: string | null;
        basePlanId: string;
        state: string;
        expiresAt: string | null;
        autoRenewing: boolean;
        testPurchase: boolean;
        verifiedAt: string;
      }>();
      if (!subsRes.error && subsRes.data) {
        for (const sub of subsRes.data) {
          if (sub.student_id && !subsByStudent.has(sub.student_id)) {
            subsByStudent.set(sub.student_id, {
              parentId: sub.parent_id,
              basePlanId: sub.base_plan_id,
              state: sub.subscription_state,
              expiresAt: sub.expires_at,
              autoRenewing: sub.auto_renewing,
              testPurchase: sub.test_purchase,
              verifiedAt: sub.verified_at,
            });
          }
        }
      }
      const lifetimeCutoff = lifetimeAccessBefore();
      const paidStarts = paidAccessStartsAt();
      const users = (profilesRes.data || []).map((p) => {
        const createdMs = typeof p.created_at === "number" ? p.created_at : null;
        const isLifetimeLegacy =
          p.role === "student" &&
          createdMs !== null &&
          ((lifetimeCutoff !== null && createdMs < lifetimeCutoff) ||
            (paidStarts !== null && createdMs < paidStarts));
        const sub = subsByStudent.get(p.id) || null;
        const subActive =
          !!sub &&
          ["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD", "SUBSCRIPTION_STATE_CANCELED"].includes(sub.state) &&
          (!sub.expiresAt || Date.parse(sub.expiresAt) > Date.now());
        return {
          id: p.id,
          email: p.email || null,
          name: p.name,
          role: p.role,
          studentCode: p.student_code || null,
          linkedStudentIds: Array.isArray(p.linked_student_ids) ? p.linked_student_ids : [],
          linkedParentId: p.linked_parent_id || null,
          grade: p.grade || null,
          avatar: p.avatar || "🦊",
          level: p.level || 1,
          xp: p.xp || 0,
          streak: p.streak || 0,
          longestStreak: p.longest_streak || 0,
          lastActiveDate: p.last_active_date || "",
          todayPracticed: !!p.today_practiced,
          streakFreezeCount: p.streak_freeze_count || 0,
          totalQuestionsSolved: p.total_questions_solved || 0,
          resolvedMistakesCount: p.resolved_mistakes_count || 0,
          createdAt: createdMs,
          lastLoginAt: typeof p.last_login_at === "number" ? p.last_login_at : null,
          deletionPending: !!p.deletion_pending,
          accessTier: p.role !== "student" ? p.role : subActive ? "subscriber" : isLifetimeLegacy ? "legacy_lifetime" : "free",
          subscription: sub,
        };
      });
      return res.json({ users });
    },
  );

  return routes;
}
