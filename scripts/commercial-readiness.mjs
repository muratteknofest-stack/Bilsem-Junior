// Run in deployment/operations environment. Never prints secret values.
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'APP_BASE_URL', 'BUSINESS_LEGAL_NAME', 'BUSINESS_CONTACT_EMAIL'];
const missing = required.filter(name => !process.env[name]);
for (const name of missing) console.error('Eksik yapılandırma: ' + name);
console.error('Ücretli yayın engeli: gerçek ödeme sağlayıcısı, sunucu kullanım hakları ve geri yükleme/pilot kabul kayıtları henüz tamamlanmadı.');
process.exitCode = 1;
