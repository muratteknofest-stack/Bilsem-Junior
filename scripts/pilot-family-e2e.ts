import { createClient } from '@supabase/supabase-js';

/**
 * End-to-End Live Pilot Family Test for ZekaPark
 * 
 * Verifies live production flow on https://bilsemjunior.vercel.app:
 * 1. Health & platform status check (registration readiness & policy version)
 * 2. New family registration with reciprocal profiles and student code generation
 * 3. Email verification and student activation flow validation
 * 4. Student login and live practice test solving (session creation, answering, scoring)
 * 
 * Usage:
 *   npx tsx scripts/pilot-family-e2e.ts [optional-base-url]
 */

if(process.env.PILOT_OWNER_CONSENT_ACKNOWLEDGED!=='true')throw Error('Gerçek pilot kaydı için veli tarafından koşullar ve pilot kapsamı açıkça onaylanmalı. Kayıt başlatılmadı.');
const suppliedEmail = process.env.PILOT_PARENT_EMAIL?.trim();
if (!suppliedEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(suppliedEmail) || /\.(internal|invalid|test)$/.test(suppliedEmail)) {
  throw new Error('PILOT_PARENT_EMAIL: doğrulama e-postasını alabilen gerçek pilot adresi gerekli. Test başlatılmadı.');
}
if (!process.env.PILOT_PARENT_PASSWORD || !process.env.PILOT_STUDENT_PASSWORD) {
  throw new Error('Pilot parolalarını güvenli ortam değişkenleriyle yapılandırın. Test başlatılmadı.');
}
const BASE_URL = (process.argv[2] || process.env.PUBLIC_SITE_URL || 'https://bilsemjunior.vercel.app').replace(/\/+$/, '');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vtcsoqohkiagbwatlabk.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_J972I2--TwnuLkWjrRqENA_DxnBGjlz';

const target = new URL(BASE_URL);
if (target.origin !== 'https://bilsemjunior.vercel.app' || target.pathname !== '/') throw new Error('Pilot yayın hedefi doğrulanamadı.');
const nativeFetch = globalThis.fetch;
const fetch: typeof globalThis.fetch = (input, init) => nativeFetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(25_000) });

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function randomId(length = 6) {
  return Math.random().toString(36).substring(2, 2 + length);
}

async function runPilot() {
  console.log('====================================================');
  console.log('🚀 ZEKAPARK CANLI SİTE UÇTAN UCA PİLOT AİLE TESTİ');
  console.log(`Hedef URL: ${BASE_URL}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Tarih: ${new Date().toLocaleString('tr-TR')}`);
  console.log('====================================================\n');

  // ADIM 1: Sağlık ve Platform Durumu Kontrolü
  console.log('📌 Adım 1: Canlı API ve Platform Durumu Kontrolü...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error(`Sağlık kontrolü başarısız (${healthRes.status}): ${await healthRes.text()}`);
  }
  const healthData = await healthRes.json();
  if (healthData.status !== 'ok' || healthData.database !== 'ready' || healthData.projectRef !== 'vtcsoqohkiagbwatlabk') throw new Error('Canlı veritabanı/proje sağlık yanıtı doğrulanamadı.');
  console.log(`  ✅ Sistem Durumu: ${healthData.status}, Veritabanı: ${healthData.database}, Proje: ${healthData.projectRef}`);

  const platformRes = await fetch(`${BASE_URL}/api/public/platform`);
  if (!platformRes.ok) {
    throw new Error(`Platform ayarları okunamadı (${platformRes.status})`);
  }
  const platformData = await platformRes.json();
  console.log(`  ✅ Kayıt Durumu: ${platformData.registrationOpen ? 'AÇIK' : 'KAPALI'}`);
  console.log(`  ✅ Aktif Politika Versiyonu: ${platformData.policyVersion}`);

  if (!platformData.registrationOpen) {
    throw new Error('Canlı sitede yeni kayıtlar kapalı! release.registrationEnabled aktif edilmeli.');
  }

  // ADIM 2: Gerçek Pilot Aile Kaydı Oluşturma
  console.log('\n📌 Adım 2: Canlı Sitede Pilot Aile Kaydı Başlatılıyor...');
  const testSuffix = randomId(6);
  const parentEmail = suppliedEmail!;
  // Güvenli, sızdırılmamış ve parola politikasını karşılayan şifreler:
  const parentPassword = process.env.PILOT_PARENT_PASSWORD!;
  const studentPassword = process.env.PILOT_STUDENT_PASSWORD!;
  const studentName = `PilotCan${testSuffix.slice(0, 3).toUpperCase()}`;

  console.log('  Veli e-postası güvenli ortamdan alındı.');
  console.log(`  Öğrenci Adı: ${studentName}`);
  console.log(`  Sınıf: 2. Sınıf`);

  const registrationPayload = {
    parentEmail,
    parentPassword,
    studentName,
    studentPassword,
    grade: 2,
    examFocus: 'Genel Zihinsel Yetenek',
    consentAccepted: true,
    termsAccepted: true,
    guardianConfirmed: true,
    policyVersion: platformData.policyVersion,
  };

  const registerRes = await fetch(`${BASE_URL}/api/register-family`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': BASE_URL,
    },
    body: JSON.stringify(registrationPayload),
  });

  const registerData = await registerRes.json();
  if (!registerRes.ok) {
    throw new Error(`Aile kaydı başarısız (${registerRes.status}): ${JSON.stringify(registerData)}`);
  }

  console.log('  ✅ Aile kaydı başarıyla tamamlandı!');
  console.log(`  ✅ Veli ID: ${registerData.parentProfile?.id}`);
  console.log(`  ✅ Öğrenci Kodu: ${registerData.student?.code}`);
  console.log(`  ✅ Öğrenci Sistem E-postası: ${registerData.student?.email}`);
  console.log(`  E-posta Doğrulama İstendi: ${registerData.verificationSent ? 'EVET' : 'HAYIR'}`);
  if (!registerData.student?.code || !registerData.student?.email) throw new Error('Öğrenci kayıt bilgileri doğrulanamadı.');

  const studentCode = registerData.student.code;
  const studentAuthEmail = registerData.student.email;

  // ADIM 3: Kimlik Doğrulama ve E-posta Onay Akışı Denetimi
  console.log('\n📌 Adım 3: E-posta Doğrulama ve Hesap Güvenliği Kontrolü...');
  console.log('  Supabase Auth üzerinde veli hesabı doğrulama bağlantısı test ediliyor...');

  const parentSignInAttempt = await supabase.auth.signInWithPassword({
    email: parentEmail,
    password: parentPassword,
  });

  if (parentSignInAttempt.error) {
    if (parentSignInAttempt.error.message.includes('Email not confirmed')) {
      console.log('  🔒 Supabase Güvenlik Kuralı Doğrulandı: Doğrulanmamış veli hesabı girişi engelleniyor (Beklenen güvenli davranış).');
      console.log('  ℹ️ Gerçek veli, e-postasına gelen onay linkine tıkladığında hesabı aktifleşir.');
    } else {
      console.log(`  ℹ️ Veli giriş denemesi yanıtı: ${parentSignInAttempt.error.message}`);
    }
  } else {
    console.log('  ✅ Veli hesabı aktif ve doğrudan giriş yapılabildi.');
  }

  // Öğrenci giriş denemesi (öğrenci kodunun email karşılığı ile)
  console.log(`\n📌 Adım 4: Öğrenci Kodu ile Giriş Denemesi (${studentCode})...`);
  const studentSignInAttempt = await supabase.auth.signInWithPassword({
    email: studentAuthEmail,
    password: studentPassword,
  });

  let studentSessionToken: string | null = null;
  if (studentSignInAttempt.error) {
    if (studentSignInAttempt.error.message.includes('Email not confirmed')) {
      console.log('  🔒 Supabase Güvenlik Kuralı: Öğrenci hesabı, veli onayından sonra /api/parent/activate-students çağrılana kadar kilitli tutuluyor.');
    } else {
      console.log(`  ⚠️ Öğrenci giriş yanıtı: ${studentSignInAttempt.error.message}`);
    }
  } else if (studentSignInAttempt.data.session) {
    studentSessionToken = studentSignInAttempt.data.session.access_token;
    console.log('  ✅ Öğrenci başarıyla giriş yaptı! Oturum açıldı.');
  }

  // ADIM 5: Alıştırma Testi Simülasyonu
  console.log('\n📌 Adım 5: Alıştırma Testi ve Soru Çözümü Doğrulaması...');
  if (studentSessionToken) {
    console.log('  Öğrenci oturumu ile 1 adet alıştırma testi başlatılıyor...');
    const startRes = await fetch(`${BASE_URL}/api/learning/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentSessionToken}`,
        'Origin': BASE_URL,
      },
      body: JSON.stringify({
        mode: 'practice',
        category: 'matrix_2x2',
        exam: '',
        difficulty: 1,
        expectedGrade: 2,
      }),
    });

    if (startRes.ok) {
      const sessionData = await startRes.json();
      if (!sessionData.id || !Array.isArray(sessionData.questions) || sessionData.questions.length === 0) throw new Error('Boş veya geçersiz çalışma oturumu.');
      console.log(`  ✅ Alıştırma oturumu açıldı! Oturum ID: ${sessionData.id}`);
      console.log(`  ✅ Toplam Soru: ${sessionData.questions.length}`);

      if (sessionData.questions.length > 0) {
        const firstQuestion = sessionData.questions[0];
        const selectedOptionId = firstQuestion.options?.[0]?.id || 'A';
        console.log(`  1. Soru cevaplanıyor (Seçilen şık: ${selectedOptionId})...`);

        const answerRes = await fetch(`${BASE_URL}/api/learning/${sessionData.id}/answer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${studentSessionToken}`,
            'Origin': BASE_URL,
          },
          body: JSON.stringify({
            index: 0,
            response: { mode: 'choice', optionId: selectedOptionId },
          }),
        });

        if (answerRes.ok) {
          const answerResult = await answerRes.json();
          console.log(`  ✅ Cevap sunucu tarafından başarıyla işlendi ve puanlandı.`);
          console.log(`  Doğruluk: ${answerResult.answers?.['0']?.correct ? 'Doğru' : 'Yanlış'}, Kazanılan XP: ${answerResult.rewarded_xp || 0}`);
        } else {
          throw new Error(`Cevap kaydı doğrulanamadı (${answerRes.status}).`);
        }

        // Testi tamamla
        const finishRes = await fetch(`${BASE_URL}/api/learning/${sessionData.id}/finish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${studentSessionToken}`,
            'Origin': BASE_URL,
          },
          body: JSON.stringify({}),
        });

        if (!finishRes.ok) throw new Error(`Sonuçlar yüklenemedi (${finishRes.status}).`);
        if (finishRes.ok) {
          const finishResult = await finishRes.json();
          if (!finishResult.result || !Number.isFinite(finishResult.result.xp)) throw new Error('Sonuç/puan doğrulanamadı.');
          console.log(`  ✅ Alıştırma oturumu tamamlandı! Toplam XP: ${finishResult.result?.xp || 0}`);
        }
      }
    } else {
      throw new Error(`Alıştırma başlatılamadı (${startRes.status}).`);
    }
  } else {
    throw new Error('Pilot tamamlanmadı: veli e-postası doğrulanmalı ve öğrenci etkinleştirilmeli. Oluşturulan aile hesabını panelden takip edin.');
    console.log('  ℹ️ Sistem mimarisinde bu iki adımlı güvenlik kilidi gereği çocuk hesapları veli onaysız çalıştırılamaz.');
  }

  console.log('\n====================================================');
  console.log('🎉 PİLOT AİLE TESTİ TAMAMLANDI!');
  console.log('  Özet:');
  console.log(`  - Canlı Kayıt API: BAŞARILI (Veli ID: ${registerData.parentProfile?.id})`);
  console.log(`  - Öğrenci Kodu Üretimi: BAŞARILI (${studentCode})`);
  console.log(`  - E-posta isteği: ${registerData.verificationSent ? 'Tetiklendi; teslim doğrulaması ayrıca gerekir' : 'Doğrulanmadı'}`);
  console.log('  - Temel kayıt/giriş/çalışma akışı geçti. E-posta teslimi, şifre sıfırlama ve iki aile arasında yetki izolasyonu ayrıca doğrulanmalıdır.');
  console.log('====================================================\n');

  return {
    parentEmail,
    studentCode,
    studentAuthEmail,
    parentId: registerData.parentProfile?.id,
    studentId: registerData.student?.id,
  };
}

runPilot().catch((err) => {
  console.error('Pilot tamamlanmadı. E-posta doğrulamasını, etkinleştirmeyi ve güvenli pilot ayarlarını kontrol edin. Kişisel bilgiler veya sağlayıcı yanıtı yazdırılmadı.');
  process.exit(1);
});

