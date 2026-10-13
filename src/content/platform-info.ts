export const SUPPORT_EMAIL = 'zeka.kupu.test@gmail.com';
export const INFO_DATE = '2026-10-10';
export interface PlatformInfo {
  slug: string;
  title: string;
  description: string;
  badge?: string;
  icon?: string;
  color?: string;
  sections: { title: string; paragraphs: string[] }[];
}
export const PLATFORM_INFO: PlatformInfo[] = [
  {
    slug: 'zekapark-hakkinda',
    title: 'ZekaPark hakkında',
    description: '1–4. sınıflar için bağımsız düşünme alıştırmaları, öğrenci çalışma alanı ve veli takibi.',
    badge: 'Vizyon & Keşif',
    icon: 'Compass',
    color: 'emerald',
    sections: [
      { title: 'Merakla başlayan bir çalışma alanı', paragraphs: ['ZekaPark; örüntü, mantık, dikkat, görsel algı, matris, uzamsal düşünme, sayısal akıl yürütme ve sembol kodlama alıştırmaları sunar. 1, 2, 3 ve 4. sınıflara göre çalışma seçenekleri bulunur.', 'Öğrenci alanında pratik, uyarlanabilir çalışma, deneme, yanlışları tekrar etme, sözlük ve kazanılan rozetleri görme akışları yer alır. Veli alanı bağlı öğrenci kayıtlarının çalışma ve ilerleme bilgilerini gösterir.'] },
      { title: 'Bağımsız eğitim içeriği', paragraphs: ['ZekaPark’ın MEB veya BİLSEM ile kurumsal bağlantısı yoktur. Sorular resmî sınav soruları değildir. Alıştırmalar zekâ testi, psikolojik değerlendirme veya tanılama aracı olarak kullanılamaz; sınav sonucu garanti edilmez.', 'Blogdaki 30 rehber; BİLSEM, dikkat, mantık, görsel düşünme, aile desteği ve sınıfa göre çalışma konularını ele alır. Sınav takvimi ve başvuru koşulları için MEB’in güncel duyuruları esas alınmalıdır.'] },
    ],
  },
  {
    slug: 'hesap-ve-veli-rehberi',
    title: 'Hesap ve veli rehberi',
    description: 'Aile kaydı, öğrenci kodu, veli e-posta doğrulaması ve hesap verileri için uygulama rehberi.',
    badge: 'Aile Rehberi',
    icon: 'Users',
    color: 'indigo',
    sections: [
      { title: 'Ailece hesap oluşturma', paragraphs: ['Kayıt ekranında veli e-postası, veli parolası, öğrencinin adı veya takma adı, sınıfı ve ayrı öğrenci parolası istenir. Telefon alanı isteğe bağlıdır. Kayıt sırasında gizlilik açıklaması ve kullanım koşulları okunarak onaylanır.', 'Kayıt sonunda öğrenci giriş kodu gösterilir. Veli kendi e-postası ve parolasıyla, öğrenci ise kendisine verilen kod ve öğrenci parolasıyla giriş yapar. Yeni aile kayıtlarında veli e-postası doğrulandıktan sonra veli alanındaki etkinleştirme kontrolü öğrenci girişini açar.'] },
      { title: 'Takip ve hesap işlemleri', paragraphs: ['Veli alanında yalnızca aile hesabına bağlı öğrenci bilgileri incelenir. Çalışma kayıtları ve ilerleme göstergeleri eğitim etkinliklerini yansıtır; standart zekâ puanı veya klinik sonuç değildir.', 'Hesabım ve verilerim alanından erişim yetkinizdeki profil ve kayıtlı ilerleme verilerini JSON dosyası olarak indirebilirsiniz. Aile hesabı silme talebi aynı alandan oluşturulur. Talebin kaydedilmesi hesabın anında silindiği anlamına gelmez; inceleme durumu ekranda gösterilir.'] },
      { title: 'Giriş sorunu yaşarsanız', paragraphs: ['Veli girişinde e-posta yazımını ve doğrulama mesajını kontrol edin. Öğrenci girişinde e-posta yerine kayıt sonunda verilen öğrenci kodunu kullanın. Öğrenci parolası sıfırlama işlemi veli alanındaki öğrenci seçimi üzerinden yapılır.', 'Destek mesajına parola, doğrulama bağlantısı, oturum belirteci veya çocuğun kimlik belgesini eklemeyin. Hata metni, hangi adımda oluştuğu ve kişisel bilgi içermeyen ekran görüntüsü yeterlidir.'] },
    ],
  },
  {
    slug: 'calisma-alanlari',
    title: 'Çalışma alanları ve deneme',
    description: 'ZekaPark’ın mevcut on alıştırma alanı ve hesap açmadan kullanılabilen örnek soru.',
    badge: '10 Bilişsel Kategori',
    icon: 'Layers',
    color: 'amber',
    sections: [
      { title: 'Uygulamadaki on alan', paragraphs: ['Görsel algıda şekil ve ayrıntılar karşılaştırılır; örüntülerde dizinin kuralı aranır; matris sorularında satır ve sütun ilişkileri incelenir. Uzamsal düşünmede şekillerin konumu ve dönüşleri üzerinde çalışılır.', 'Mantık sorularında ipuçları birlikte değerlendirilir. Dikkat sorularında hedef ayrıntı aranır. Sayısal alıştırmalarda sayı ilişkileri, kodlama alıştırmalarında sembol ve karşılıkları kullanılır. Bellek alıştırmalarında görülen bilgiler hatırlanır; sözel akıl yürütmede kelime ve kavram ilişkileri incelenir. Bunlar alıştırma kategorileridir; bir yetenek tanısı değildir.'] },
      { title: 'Örnek sorudan kayıtlı çalışmaya', paragraphs: ['Ana sayfada bu cihaz için bir örnek soru çözülebilir. Sınıf önizlemesi hesabın sınıf bilgisini değiştirmez. Buradaki deneme cevapları ve puanları öğrenci hesabına kaydedilmez.', 'Öğrenci hesabındaki çalışma ekranları soru türüne göre şık seçimi, sayısal yanıt, eşleştirme veya sıralama sunar. Yanlışlar ve açıklamalar tekrar için kullanılabilir. XP ve rozetler uygulama içi ilerleme göstergeleridir; çocukları karşılaştıran bilimsel ölçüm değildir.'] },
    ],
  },
  {
    slug: 'gizlilik-ve-veriler',
    title: 'Gizlilik ve hesap verileri',
    description: 'Toplanan hesap bilgileri, hizmet sağlayıcıları ve veri indirme ile silme talebi akışları.',
    badge: 'KVKK & Şeffaflık',
    icon: 'Lock',
    color: 'purple',
    sections: [
      { title: 'Hangi bilgiler kullanılır?', paragraphs: ['Aile kaydında veli e-postası, isteğe bağlı telefon, öğrencinin adı veya takma adı, sınıfı, veli–öğrenci bağlantısı ve onay zamanı ile metin sürümü kaydedilir. Parola işlemleri Supabase Auth üzerinden yürütülür. Eski hesaplarda daha önce kaydedilmiş ek profil alanları bulunabilir.', 'Yeni kayıt ve parola yenileme sırasında bilinen sızdırılmış parolalar sunucuda kontrol edilir. Parolanın kendisi veya tam özeti kontrol sağlayıcısına gönderilmez; SHA-1 özetinin yalnızca ilk beş karakteri Have I Been Pwned hizmetine iletilir. Kontrol tamamlanamazsa işlem durdurulur.', 'Çalışma yanıtları, deneme ve ilerleme kayıtları, kazanımlar, soru bildirimleri ve hesap silme talepleri ilgili özellikleri çalıştırmak için kullanılır. Tarayıcıda oturum ve uygulama tercihleri ile hesap açmadan deneme sayacı tutulur.'] },
      { title: 'Hizmetler ve dış bağlantılar', paragraphs: ['Barındırma için Vercel, kimlik doğrulama ve veri tabanı için Supabase kullanılır. E-posta ve yapay zekâ özellikleri yapılandırılmış sağlayıcılarla çalışır. Gömülü etkinlik açıldığında Wordwall hizmetine bağlantı kurulur; IP adresi ve tarayıcı bilgileri o hizmete iletilebilir. Wordwall sonuçları ZekaPark çalışma raporlarına otomatik aktarılmaz. Blog fotoğrafları Pexels’in görsel sunucusundan, uygulama yazı tipleri Google Fonts üzerinden yüklenebilir; bu istekler ilgili sağlayıcıya IP adresi gibi bağlantı bilgileri iletir.', 'Resmî kaynak ve fotoğraf lisansı bağlantıları dış siteleri açar. Bu sitelerin kendi gizlilik koşulları geçerlidir. Destek kanallarına öğrenci parolası, kimlik belgesi veya gereksiz kişisel bilgi göndermeyin.'] },
      { title: 'Verilerinizi indirme ve silme talebi', paragraphs: ['Veli alanındaki Hesabım ve verilerim bölümünden yetkili olduğunuz profil ve kayıtlı ilerleme verilerini indirebilir, aile hesabı için silme talebi oluşturabilirsiniz. Talep numarası ve inceleme durumu gösterilir. Talep göndermek otomatik veya anında silme işlemi değildir.', `Veri talepleri ve açıklamadaki eksikler için uygulamada kullanılan iletişim adresi ${SUPPORT_EMAIL} üzerinden başvurabilirsiniz. Parola veya oturum bağlantısı paylaşmayın.`] },
      { title: 'Aydınlatma metninin tamamlanması gereken bilgileri', paragraphs: ['İşletmecinin doğrulanmış unvanı ve adresi, veri sorumlusu kimliği, her işleme amacı için hukuki dayanak, saklama süreleri ve yurt dışı aktarım koşulları bu projede henüz belirtilmemiştir. Bu açıklama mevcut uygulama akışını anlatır; tamamlanmış bir KVKK aydınlatma metni veya mevzuata uyum güvencesi değildir.', 'Bu eksik kurumsal bilgiler işletmeci tarafından tamamlanmalı ve kayıt öncesinde kullanıcılara sunulmalıdır. Açıklama tarihi: 10 Ekim 2026.'] },
    ],
  },
  {
    slug: 'kullanim-kosullari',
    title: 'Kullanım koşulları',
    description: 'Eğitim amaçlı kullanım, veli gözetimi, hesap güvenliği ve içeriklerin sınırları.',
    badge: 'Platform İlkeleri',
    icon: 'FileText',
    color: 'teal',
    sections: [
      { title: 'Eğitim amaçlı kullanım', paragraphs: ['ZekaPark bağımsız bir alıştırma platformudur. MEB veya BİLSEM adına hizmet vermez; kabul, puan veya başarı garantisi sunmaz. Etkinlikler profesyonel eğitim değerlendirmesi veya sağlık hizmetinin yerine geçmez.', 'Öğrenci hesabı aile kaydı üzerinden oluşturulur. Veli, kayıt bilgilerini ve çocuğun kullanımını takip eder. Hesap bilgilerini doğru ve gerektiği kadar paylaşın; öğrenci giriş kodunu ve parolaları herkese açık alanlarda yayımlamayın.'] },
      { title: 'Hesap ve içerik kuralları', paragraphs: ['Başka bir kişinin hesabına veya verilerine izinsiz erişmeye, yetki sınırlarını aşmaya ve çalışma sonuçlarını değiştirmeye çalışmayın. Soru hatalarını uygulamanın bildirim akışı üzerinden veya destek adresiyle paylaşabilirsiniz.', 'Yazılar ve açıklamalar eğitim amaçlıdır; güncel resmî sınav kuralları için ilgili kurumun duyuruları kontrol edilmelidir. Blog görsellerinin kaynak ve lisans bağlantıları yazılarda belirtilir. Görsellerin yeniden kullanımında ilgili lisans koşulları ayrıca incelenmelidir.'] },
      { title: 'Ücret ve hizmet bilgileri', paragraphs: ['Bu açıklama herhangi bir ücretli paket, abonelik veya satın alma hakkı tanımlamaz. Ücretli hizmet sunulması hâlinde kapsam, fiyat, işletmeci bilgileri ve geçerli koşullar satın alma öncesinde açıkça bildirilmelidir.', 'İşletmecinin doğrulanmış kimlik ve adres bilgileri henüz projede tamamlanmamıştır. Bu metin mevcut kullanım akışlarını açıklar; tamamlanmış bir mesafeli satış sözleşmesi değildir. Güncelleme: 10 Ekim 2026.'] },
    ],
  },
  {
    slug: 'iletisim-ve-destek',
    title: 'İletişim ve destek',
    description: 'Giriş sorunları, soru hataları ve hesap işlemleri için doğru destek kanalları.',
    badge: '7/24 Destek & Bildirim',
    icon: 'MessageCircle',
    color: 'sky',
    sections: [
      { title: 'Uygulamadaki iletişim adresi', paragraphs: [`Projede kullanılan iletişim adresi ${SUPPORT_EMAIL}. E-posta bağlantısı cihazınızdaki posta uygulamasını açar; mesajı oradan göndermeniz gerekir. Bu sayfa kendiliğinden mesaj göndermez.`, 'Doğrulanmış telefon, ofis adresi, çalışma saati veya yanıt süresi projede belirtilmediği için burada yayımlanmamaktadır. E-postanın teslim ve yanıt süresi garanti edilmez.'] },
      { title: 'Doğru kanalı seçin', paragraphs: ['Bir sorunun cevabında veya açıklamasında hata görürseniz soru ekranındaki bildirim özelliğini kullanın. Blog hataları için yazının bağlantısını ve ilgili bölümü e-postaya ekleyin.', 'Hesap verilerini indirme ve silme talebi işlemleri için veli alanındaki Hesabım ve verilerim bölümünü kullanın. Giriş sorunu için rolünüzü, hata mesajını ve sorunun oluştuğu adımı belirtin; parola veya doğrulama bağlantısı göndermeyin.'] },
    ],
  },
  {
    slug: 'hesap-guvenligi',
    title: 'Hesap güvenliği',
    description: 'Veli ve öğrenci hesaplarını korumak, güvenli destek almak ve sorun bildirmek için öneriler.',
    badge: 'Hesap Güvenliği',
    icon: 'KeyRound',
    color: 'rose',
    sections: [
      { title: 'Hesabınızı koruyun', paragraphs: ['Veli ve öğrenci için farklı, başka hizmetlerde kullanılmayan parolalar seçin. Öğrenci kodunu yalnızca ilgili veli ve öğrenciyle paylaşın. Ortak cihazlarda işiniz bittiğinde çıkış yapın.', 'Doğrulama veya parola yenileme bağlantılarını başkalarına iletmeyin. Destek isteyen bir kişi parola ya da oturum belirteci talep ederse paylaşmayın.'] },
      { title: 'Bir güvenlik sorunu fark ederseniz', paragraphs: [`Uygulama bağlantısını, sorunun oluştuğu adımları ve kişisel bilgi içermeyen bir açıklamayı ${SUPPORT_EMAIL} adresine iletin. Başka kullanıcıların verilerini indirmeyin veya yayımlamayın.`, 'Bu sayfa güvenlik sertifikası veya sistemin tüm açıklarının giderildiği iddiası değildir. Güvenlik kontrolleri ve canlı ortam yapılandırmaları ayrıca doğrulanmalıdır.'] },
    ],
  },
];
export interface FooterLink {
  label: string;
  href: string;
  tag?: string;
  desc?: string;
  icon?: string;
}

export interface FooterGroup {
  title: string;
  icon?: string;
  links: FooterLink[];
}

export const FOOTER_GROUPS: FooterGroup[] = [
  {
    title: 'ZekaPark’ı tanıyın',
    icon: 'Sparkles',
    links: [
      { label: 'Platform hakkında', href: '/bilgi/zekapark-hakkinda', tag: 'Vizyon', desc: 'Eğitim felsefemiz ve hikayemiz', icon: 'Compass' },
      { label: 'Çalışma alanları', href: '/bilgi/calisma-alanlari', tag: '10 Kategori', desc: 'Bilişsel beceri modelleri', icon: 'Layers' },
      { label: 'Hesap ve veli rehberi', href: '/bilgi/hesap-ve-veli-rehberi', tag: 'Rehber', desc: 'Giriş kodu ve aile takibi', icon: 'Users' },
    ],
  },
  {
    title: 'Birlikte öğrenin',
    icon: 'BookOpen',
    links: [
      { label: '30 yazılık blog', href: '/blog', tag: '30 Rehber', desc: 'Bilişsel gelişim makaleleri', icon: 'BookOpen' },
      { label: 'BİLSEM rehberleri', href: '/blog?category=B%C4%B0LSEM%20rehberi', tag: 'Sınav', desc: 'Tablet sınavı & stratejiler', icon: 'Trophy' },
      { label: 'Aile rehberleri', href: '/blog?category=Aile%20rehberi', tag: 'Ebeveyn', desc: 'Evde zeka gelişim oyunları', icon: 'Heart' },
      { label: 'Yayın ve görsel ilkeleri', href: '/blog/yayin-ilkeleri', tag: 'Standart', desc: 'Pedagojik soru ilkeleri', icon: 'Palette' },
    ],
  },
  {
    title: 'Destek ve veriler',
    icon: 'ShieldCheck',
    links: [
      { label: 'İletişim ve destek', href: '/bilgi/iletisim-ve-destek', tag: '7/24 Yardım', desc: 'Soru bildirimi ve iletişim', icon: 'MessageCircle' },
      { label: 'Gizlilik ve hesap verileri', href: '/bilgi/gizlilik-ve-veriler', tag: 'KVKK', desc: 'Şeffaf veri güvenliği', icon: 'Lock' },
      { label: 'Kullanım koşulları', href: '/bilgi/kullanim-kosullari', tag: 'İlkeler', desc: 'Kullanım sözleşmesi', icon: 'FileText' },
      { label: 'Hesap güvenliği', href: '/bilgi/hesap-guvenligi', tag: 'Korumalı', desc: 'Şifre ve oturum güvenliği', icon: 'KeyRound' },
    ],
  },
];
