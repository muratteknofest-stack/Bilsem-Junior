import { LEGAL_DOCUMENTS } from './legal-documents';
export const SUPPORT_EMAIL = 'zeka.kupu.test@gmail.com';
export const INFO_DATE = '2026-10-10';
export interface PlatformInfo {
  slug: string;
  title: string;
  description: string;
  badge?: string;
  icon?: string;
  color?: string;
  contactEmail?: string;
  updatedAt?: string;
  sections: { title: string; paragraphs: string[] }[];
}
export const PLATFORM_INFO: PlatformInfo[] = [
  {
    slug: 'zekapark-hakkinda',
    title: 'Bilsem Junior hakkında',
    description: '1–4. sınıflar için bağımsız düşünme alıştırmaları, öğrenci çalışma alanı ve veli takibi.',
    badge: 'Vizyon & Keşif',
    icon: 'Compass',
    color: 'emerald',
    sections: [
      { title: 'Merakla başlayan bir çalışma alanı', paragraphs: ['Bilsem Junior; örüntü, mantık, dikkat, görsel algı, matris, uzamsal düşünme, sayısal akıl yürütme ve sembol kodlama alıştırmaları sunar. 1, 2, 3 ve 4. sınıflara göre çalışma seçenekleri bulunur.', 'Öğrenci alanında pratik, uyarlanabilir çalışma, deneme, yanlışları tekrar etme, sözlük ve kazanılan rozetleri görme akışları yer alır. Veli alanı bağlı öğrenci kayıtlarının çalışma ve ilerleme bilgilerini gösterir.'] },
      { title: 'Bağımsız eğitim içeriği', paragraphs: ['Bilsem Junior’ın MEB veya BİLSEM ile kurumsal bağlantısı yoktur. Sorular resmî sınav soruları değildir. Alıştırmalar zekâ testi, psikolojik değerlendirme veya tanılama aracı olarak kullanılamaz; sınav sonucu garanti edilmez.', 'Blogdaki 30 rehber; BİLSEM, dikkat, mantık, görsel düşünme, aile desteği ve sınıfa göre çalışma konularını ele alır. Sınav takvimi ve başvuru koşulları için MEB’in güncel duyuruları esas alınmalıdır.'] },
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
    description: 'Bilsem Junior’ın mevcut on alıştırma alanı ve hesap açmadan kullanılabilen örnek soru.',
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
      { title: 'Hizmetler ve dış bağlantılar', paragraphs: ['Barındırma için Vercel, kimlik doğrulama ve veri tabanı için Supabase kullanılır. E-posta ve yapay zekâ özellikleri yapılandırılmış sağlayıcılarla çalışır. Gömülü etkinlik açıldığında Wordwall hizmetine bağlantı kurulur; IP adresi ve tarayıcı bilgileri o hizmete iletilebilir. Wordwall sonuçları Bilsem Junior çalışma raporlarına otomatik aktarılmaz. Blog fotoğrafları Pexels’in görsel sunucusundan, uygulama yazı tipleri Google Fonts üzerinden yüklenebilir; bu istekler ilgili sağlayıcıya IP adresi gibi bağlantı bilgileri iletir.', 'Resmî kaynak ve fotoğraf lisansı bağlantıları dış siteleri açar. Bu sitelerin kendi gizlilik koşulları geçerlidir. Destek kanallarına öğrenci parolası, kimlik belgesi veya gereksiz kişisel bilgi göndermeyin.'] },
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
      { title: 'Eğitim amaçlı kullanım', paragraphs: ['Bilsem Junior bağımsız bir alıştırma platformudur. MEB veya BİLSEM adına hizmet vermez; kabul, puan veya başarı garantisi sunmaz. Etkinlikler profesyonel eğitim değerlendirmesi veya sağlık hizmetinin yerine geçmez.', 'Öğrenci hesabı aile kaydı üzerinden oluşturulur. Veli, kayıt bilgilerini ve çocuğun kullanımını takip eder. Hesap bilgilerini doğru ve gerektiği kadar paylaşın; öğrenci giriş kodunu ve parolaları herkese açık alanlarda yayımlamayın.'] },
      { title: 'Hesap ve içerik kuralları', paragraphs: ['Başka bir kişinin hesabına veya verilerine izinsiz erişmeye, yetki sınırlarını aşmaya ve çalışma sonuçlarını değiştirmeye çalışmayın. Soru hatalarını uygulamanın bildirim akışı üzerinden veya destek adresiyle paylaşabilirsiniz.', 'Yazılar ve açıklamalar eğitim amaçlıdır; güncel resmî sınav kuralları için ilgili kurumun duyuruları kontrol edilmelidir. Blog görsellerinin kaynak ve lisans bağlantıları yazılarda belirtilir. Görsellerin yeniden kullanımında ilgili lisans koşulları ayrıca incelenmelidir.'] },
      { title: 'Ücret ve hizmet bilgileri', paragraphs: ['Bu açıklama herhangi bir ücretli paket, abonelik veya satın alma hakkı tanımlamaz. Ücretli hizmet sunulması hâlinde kapsam, fiyat, işletmeci bilgileri ve geçerli koşullar satın alma öncesinde açıkça bildirilmelidir.', 'İşletmecinin doğrulanmış kimlik ve adres bilgileri henüz projede tamamlanmamıştır. Bu metin mevcut kullanım akışlarını açıklar; tamamlanmış bir mesafeli satış sözleşmesi değildir. Güncelleme: 10 Ekim 2026.'] },
    ],
  },
  {
    slug: 'iletisim-ve-destek',
    title: 'İletişim ve destek',
    description: 'Giriş sorunları, soru hataları ve hesap işlemleri için doğru destek kanalları.',
    badge: 'İletişim ve Veri Talepleri',
    icon: 'MessageCircle',
    color: 'sky',
    sections: [
      { title: 'Uygulamadaki iletişim adresi', paragraphs: [`Projede kullanılan iletişim adresi ${SUPPORT_EMAIL}. E-posta bağlantısı cihazınızdaki posta uygulamasını açar; mesajı oradan göndermeniz gerekir. Bu sayfa kendiliğinden mesaj göndermez.`, 'Doğrulanmış telefon, ofis adresi, çalışma saati veya yanıt süresi projede belirtilmediği için burada yayımlanmamaktadır. E-postanın teslim ve yanıt süresi garanti edilmez.'] },
      { title: 'Doğru kanalı seçin', paragraphs: ['Bir sorunun cevabında veya açıklamasında hata görürseniz soru ekranındaki bildirim özelliğini kullanın. Blog hataları için yazının bağlantısını ve ilgili bölümü e-postaya ekleyin.', 'Hesap verilerini indirme ve silme talebi işlemleri için veli alanındaki Hesabım ve verilerim bölümünü kullanın. Giriş sorunu için rolünüzü, hata mesajını ve sorunun oluştuğu adımı belirtin; parola veya doğrulama bağlantısı göndermeyin.'] },
    ],
  },
  {
    slug: 'hesap-ve-veri-silme',
    updatedAt: '2026-10-25',
    title: 'Hesap ve veri silme',
    description: 'Bilsem Junior aile hesabı ve bağlı öğrenci verileri için uygulama içinden veya uygulamayı kurmadan silme talebi başlatma yolları.',
    badge: 'Hesap Hakları', icon: 'KeyRound', color: 'rose',
    sections: [
      { title: 'Veli alanından silme talebi', paragraphs: ['Veli hesabınıza giriş yapın. Android uygulamasında Hesap bölümünü, webde veli alanındaki hesap bölümünü açın. Hesabım ve Verilerim alanındaki Aile Hesabı Silme Talebi seçeneğini kullanın. Talep aile hesabına bağlı öğrenci profilleri, çalışma geçmişi, ilerleme ve veli kaydı için değerlendirilir.', 'Talebin kaydedilmesi silmenin tamamlandığı anlamına gelmez. Talep numarasını ve inceleme durumunu takip edin. Başvuru sahibinin aile hesabına ilişkin yetkisi kontrol edilir; sonrasında silme veya zorunlu olarak saklanan kayıtlarla ilgili sonuç bildirilir.'] },
      { title: 'Uygulamayı kurmadan talep başlatma', paragraphs: [`Uygulamaya erişemiyorsanız aşağıdaki e-posta bağlantısıyla ${SUPPORT_EMAIL} adresine hesap ve veri silme talebi gönderebilirsiniz. Kayıtlı veli e-posta adresinizden yazın; hangi Bilsem Junior aile hesabının silinmesini istediğinizi belirtin. Bu yol uygulamayı yeniden yüklemeyi gerektirmez.`, 'Bağlantı posta uygulamanızda bir taslak açar; talebi göndermek için oradaki gönderme adımını tamamlayın. Posta uygulamanız yoksa aynı adrese kullandığınız e-posta hizmetinden yazabilirsiniz. Parola, doğrulama kodu, kimlik belgesi veya çocuğun gereksiz kişisel bilgilerini göndermeyin. Hesap eşleşmesi gerektiğinde güvenli doğrulama için sizinle iletişim kurulur.'] },
      { title: 'Kapsam, saklama ve abonelik', paragraphs: ['Silme talebiyle ilişkili hesap ve öğrenci kayıtları birlikte incelenir. İşlemi yerine getirmek veya hukuki yükümlülük, güvenlik ve hakların korunması için saklanması gereken kayıtlar varsa hangi kayıtların neden saklandığı ve uygulanacak süre başvuru sonucunda açıklanır. Saklama ve aktarım açıklaması Gizlilik ve KVKK sayfasındadır.', 'Uygulamayı kaldırmak veya hesap silme talebi göndermek Google Play aboneliğinizi kendiliğinden iptal etmez. Gelecek yenilemeleri durdurmak için Google Play abonelikler bölümündeki iptal işlemini ayrıca tamamlayın. Silinen hesap verileri ile Google Play ödeme kayıtları aynı sistem değildir.'] },
    ],
  },
  {
    slug: 'abonelik-iptal-ve-iade',
    updatedAt: '2026-10-25',
    title: 'Abonelik, iptal ve iade',
    description: 'Google Play üzerinden sunulan üyeliğin kapsamı, yenilenmesi, iptal ve geri ödeme başvuru yolları.',
    badge: 'Üyelik Bilgileri', icon: 'FileText', color: 'teal',
    sections: [
      { title: 'Satın almadan önce', paragraphs: ['Satış etkinleştirildiğinde satın alma Android uygulamasının veli alanında Google Play üzerinden yapılır. Aylık, üç aylık ve yıllık standart otomatik yenilenen planlar bulunur. Geçerli fiyat, para birimi, dönem ve varsa vergi bilgileri satın alma öncesinde Google Play ekranında gösterilir; bu sayfada sabit fiyat ilan edilmez.', 'Bu sürümde abonelik seçilen tek öğrenci hesabına bağlıdır. Aynı öğrenci web ve Android erişimini kullanabilir. Aile paketi, ikinci öğrenciye aktarım veya uygulama içinden plan değiştirme sunulduğu varsayılmamalıdır. Satışın kapalı olması durumunda bu metin satın alma hakkı veya etkin bir teklif oluşturmaz.'] },
      { title: 'Otomatik yenileme ve iptal', paragraphs: ['Standart abonelik, iptal edilmedikçe seçilen dönem için Google Play’de gösterilen koşullarla yenilenir. Satın almayı yapan Google hesabıyla Google Play abonelikler bölümünü açıp Bilsem Junior aboneliğini seçerek iptal işlemini tamamlayın. Normal iptalde ödenmiş dönemin kalan süresi kullanılabilir; geçerli bitiş tarihi üyelik durumunda gösterilir.', 'Uygulamayı kaldırmak, oturumu kapatmak veya hesap silme talebi oluşturmak aboneliği iptal etmez. İptal işlemi ile geçmiş ödemeler için geri ödeme başvurusu ayrı işlemlerdir.'] },
      { title: 'Geri ödeme ve tüketici başvuruları', paragraphs: [`Google Play geri ödeme başvurusu için aşağıdaki resmî bilgi sayfasını kullanın. Sonuç satın alma türü, tarih, ödeme yöntemi, ülke ve uygulanabilir kurallara göre değerlendirilir. Satın alma veya hizmet sorununuzu ${SUPPORT_EMAIL} adresine de iletebilirsiniz; parola veya kart bilgisi göndermeyin.`, 'Bu açıklama, mevzuattan doğan cayma, ayıplı hizmet ve diğer zorunlu tüketici haklarını kaldırmaz. Her işlem için koşulsuz iade garantisi ya da genel bir cayma hakkından feragat beyanı değildir. Satıcı kimliği ve uygulanacak satış öncesi bilgiler gerçek işletmeci ve hizmet modeliyle tamamlanmalıdır; bu sayfa tek başına tamamlanmış mesafeli satış sözleşmesi değildir.'] },
    ],
  },
  {
    slug: 'cerez-ve-yerel-depolama',
    updatedAt: '2026-10-25',
    title: 'Çerez ve yerel depolama',
    description: 'Web tarayıcısı ve Android uygulamasındaki oturum, tercih ve cihazda tutulan çalışma kayıtları hakkında açıklama.',
    badge: 'Cihazdaki Veriler', icon: 'ShieldCheck', color: 'indigo',
    sections: [
      { title: 'Oturum ve tercihler', paragraphs: ['Uygulama, oturumun sürdürülmesi ve temel işlevler için tarayıcı veya Android WebView depolamasını kullanır. Tema, ses ve hareket tercihleri cihazda hatırlanabilir. Bu teknikler yalnız çerezlerden oluşmaz; localStorage ve oturum depolaması gibi alanlar da kullanılabilir.', 'Cihazdaki bazı çalışma ve hikâye ilerlemeleri ile henüz sunucuya kaydedilmemiş işlemler yerel olarak tutulabilir. Hesap açmadan deneme sayacı ve İngilizce alıştırma ilerlemesi de cihaz depolamasından yararlanır. Yerel depolama, hesabınızdaki bütün verilerin yalnız cihazda tutulduğu anlamına gelmez.'] },
      { title: 'Dış kaynaklar ve gömülü içerik', paragraphs: ['Gömülü etkinlikler, uzaktaki görsel/yazı tipi kaynakları ve dış bağlantılar açıldığında ilgili sağlayıcıyla bağlantı kurulabilir. Bu hizmetlerin kendi depolama ve veri işleme uygulamaları bulunabilir. Alıcılar ve işleme kapsamı için Gizlilik ve KVKK açıklamasını inceleyin.', 'Bu açıklamayı açmak veya siteyi kullanmaya devam etmek, isteğe bağlı izleme ya da pazarlama için rıza verildiği anlamına gelmez. Yeni analiz, reklam veya rıza gerektiren bir depolama özelliği eklenirse açıklama ve gerekli tercih mekanizması bu davranışla birlikte güncellenmelidir.'] },
      { title: 'Tercihleri değiştirme ve temizleme', paragraphs: ['Ses ve hareket tercihlerini öğrenci profilinden değiştirebilirsiniz. Tarayıcının site verileri veya Android uygulama depolama ayarları cihazdaki kayıtları temizleyebilir. Temizleme öncesinde çalışmalarınızın sunucuya kaydedildiğini kontrol edin; kaydedilmemiş ilerleme kaybolabilir ve yeniden giriş gerekebilir.', 'Cihaz verilerini temizlemek sunucudaki aile hesabını silmez ve Google Play aboneliğini iptal etmez. Hesap/veri silme ile abonelik iptali için ayrı açıklamaları kullanın.'] },
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
    title: 'Bilsem Junior’ı tanıyın',
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
      ...LEGAL_DOCUMENTS.map(item => ({ label: item.label, href: '/bilgi/' + item.slug, icon: item.icon })),
      { label: 'Hesap güvenliği', href: '/bilgi/hesap-guvenligi', tag: 'Korumalı', desc: 'Şifre ve oturum güvenliği', icon: 'KeyRound' },
    ],
  },
];
