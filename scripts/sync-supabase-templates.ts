import fs from 'node:fs';
import path from 'node:path';

interface TemplateConfig {
  slug: string;
  subjectKey: string;
  templateKey: string;
}

const TEMPLATE_MAPPINGS: TemplateConfig[] = [
  { slug: 'confirm-sign-up', subjectKey: 'mailer_subjects_confirmation', templateKey: 'mailer_templates_confirmation_content' },
  { slug: 'reset-password', subjectKey: 'mailer_subjects_recovery', templateKey: 'mailer_templates_recovery_content' },
  { slug: 'magic-link-or-otp', subjectKey: 'mailer_subjects_magic_link', templateKey: 'mailer_templates_magic_link_content' },
  { slug: 'change-email-address', subjectKey: 'mailer_subjects_email_change', templateKey: 'mailer_templates_email_change_content' },
  { slug: 'invite-user', subjectKey: 'mailer_subjects_invite', templateKey: 'mailer_templates_invite_content' },
  { slug: 'reauthentication', subjectKey: 'mailer_subjects_reauthentication', templateKey: 'mailer_templates_reauthentication_content' },
];

export function loadTemplates(baseDir: string = 'supabase/templates') {
  const subjectsPath = path.join(baseDir, 'subjects.json');
  if (!fs.existsSync(subjectsPath)) throw new Error(`Dosya bulunamadı: ${subjectsPath}`);
  const subjects = JSON.parse(fs.readFileSync(subjectsPath, 'utf8'));

  const templates: Record<string, { subject: string; html: string }> = {};

  for (const item of TEMPLATE_MAPPINGS) {
    const htmlPath = path.join(baseDir, `${item.slug}.html`);
    if (!fs.existsSync(htmlPath)) throw new Error(`Şablon dosyası bulunamadı: ${htmlPath}`);
    const subject = subjects[item.slug];
    if (!subject) throw new Error(`Konu başlığı bulunamadı: ${item.slug}`);
    const html = fs.readFileSync(htmlPath, 'utf8');
    templates[item.slug] = { subject, html };
  }

  return templates;
}

export function buildManagementPayload(templates: Record<string, { subject: string; html: string }>) {
  const payload: Record<string, unknown> = {
    smtp_sender_name: 'Bilsem Junior',
    site_url: 'https://zekapark.vercel.app',
    uri_allow_list: 'https://zekapark.vercel.app/reset-password,https://zekapark.vercel.app,http://localhost:5173/reset-password',
  };

  for (const item of TEMPLATE_MAPPINGS) {
    const data = templates[item.slug];
    if (data) {
      payload[item.subjectKey] = data.subject;
      payload[item.templateKey] = data.html;
    }
  }

  return payload;
}

async function run() {
  console.log('--- Bilsem Junior Supabase Türkçe E-posta Şablonları Senkronizasyonu ---');
  const templates = loadTemplates();
  console.log(`✓ 6 Türkçe şablon ve konu başlığı başarıyla yüklendi.`);

  const projectRef = process.env.SUPABASE_PROJECT_REF || process.env.SUPABASE_PROJECT_ID || 'vehhvsdkifwstbjhnhao';
  const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_MGMT_TOKEN;

  if (!token) {
    console.log(`
[BİLGİ] SUPABASE_ACCESS_TOKEN tanımlı değil.
Canlı Supabase projenize (${projectRef}) şablonları doğrudan aktarmak için:
1. https://supabase.com/dashboard/account/tokens adresinden bir Personal Access Token oluşturun.
2. Komutu aşağıdaki şekilde çalıştırın:
   SUPABASE_ACCESS_TOKEN=sbp_... SUPABASE_PROJECT_REF=${projectRef} npm run sync:email-templates

Alternatif olarak docs/supabase-auth-turkce-yapilandirma.md dosyasındaki kılavuzdan
şablonları Supabase Dashboard > Authentication > Email Templates bölümüne kopyalayabilirsiniz.
`);
    return;
  }

  const payload = buildManagementPayload(templates);
  const url = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;

  console.log(`Supabase Management API üzerinden güncelleniyor: ${projectRef}...`);
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Hata (${response.status}):`, errorText);
    process.exitCode = 1;
    return;
  }

  console.log('✅ Tebrikler! Tüm Türkçe e-posta şablonları ve başlıkları Supabase projenize başarıyla uygulandı.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void run();
}
