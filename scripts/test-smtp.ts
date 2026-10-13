import nodemailer from 'nodemailer';

/**
 * Diagnostic and verification script for SMTP configuration.
 * Usage:
 *   SMTP_USER=... SMTP_PASS=... npx tsx scripts/test-smtp.ts [optional-target-email]
 */
async function testSmtp() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const targetEmail = process.argv[2] || user;

  console.log('--- ZekaPark SMTP Doğrulama Aracı ---');
  console.log(`Sunucu: ${host}:${port}`);
  console.log(`Kullanıcı: ${user ? `${user.slice(0, 3)}***@${user.split('@')[1] || ''}` : '(TANIMLANMAMIŞ)'}`);
  console.log(`Parola: ${pass ? '****** (Tanımlı)' : '(TANIMLANMAMIŞ)'}`);
  console.log(`Gönderen: ${from || '(TANIMLANMAMIŞ)'}`);

  if (!user || !pass) {
    console.error('\n❌ HATA: SMTP_USER veya SMTP_PASS ortam değişkeni eksik!');
    console.error('\nVercel paneline veya yerel ortama şu değişkenleri ekleyin:');
    console.error('  SMTP_HOST=smtp.gmail.com');
    console.error('  SMTP_PORT=587');
    console.error('  SMTP_USER=ornek@gmail.com');
    console.error('  SMTP_PASS=16_haneli_uygulama_sifresi');
    console.error('  SMTP_FROM=ZekaPark Destek <ornek@gmail.com>');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });

  console.log('\n1. SMTP sunucusu ile bağlantı ve kimlik doğrulama testi yapılıyor...');
  try {
    await transporter.verify();
    console.log('✅ SMTP bağlantısı ve kimlik doğrulama BAŞARILI!');
  } catch (error: any) {
    console.error('❌ SMTP bağlantısı başarısız oldu:');
    console.error(error?.message || error);
    process.exit(1);
  }

  if (targetEmail) {
    console.log(`\n2. Test e-postası gönderiliyor: ${targetEmail}...`);
    try {
      const info = await transporter.sendMail({
        from: from || user,
        to: targetEmail,
        subject: 'ZekaPark SMTP Test Mesajı',
        text: 'Bu bir ZekaPark sistem test e-postasıdır. SMTP yapılandırmanız başarıyla çalışıyor.',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e7ff; border-radius: 12px;">
            <h2 style="color: #4338ca;">ZekaPark SMTP Doğrulandı 🎉</h2>
            <p>Tebrikler! Vercel ve ZekaPark e-posta bildirim servisi başarıyla yapılandırıldı.</p>
            <p style="color: #64748b; font-size: 13px;">Gönderim zamanı: ${new Date().toISOString()}</p>
          </div>
        `,
      });
      console.log('✅ Test e-postası başarıyla gönderildi! MessageId:', info.messageId);
    } catch (error: any) {
      console.error('❌ E-posta gönderimi başarısız:', error?.message || error);
      process.exit(1);
    }
  }

  console.log('\n🎉 Tüm SMTP testleri başarıyla tamamlandı.');
}

testSmtp().catch((err) => {
  console.error('Beklenmeyen hata:', err);
  process.exit(1);
});
