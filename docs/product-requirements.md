# Developer Wiki — Ürün Gereksinimleri (PRD)

**Durum:** Taslak, ilk uygulama öncesi karar belgesi  
**Sürüm:** 0.1  
**Tarih:** 11 Ekim 2026

## 1. Ürün özeti

Developer Wiki, yazılım, DevOps ve IT ekiplerinin teknik dokümantasyonunu ortak bir çalışma alanında oluşturup düzenlemesine, sınıflandırmasına ve bulmasına yardımcı olan çok kiracılı bir SaaS ürünüdür. MVP, güvenilir kimlik doğrulama ve workspace sınırları içinde Markdown belgelerinin yaşam döngüsünü ve aranmasını çözer.

## 2. Problem ve hedef kullanıcılar

Teknik bilgi dosyalara, sohbetlere, e-postalara ve kişisel notlara dağılmıştır. Bu durum arama ve devir süreçlerini yavaşlatır, güncel bilginin hangisi olduğunu belirsizleştirir. Hedef kullanıcılar startup ve kurumsal yazılım, DevOps ve IT ekipleridir.

### MVP hedefleri

- Bir kullanıcının hesap açıp güvenli biçimde giriş yapabilmesi.
- Bir workspace oluşturup üyeleri için rol tabanlı bir bilgi alanı kurabilmesi.
- Kategorilerde Markdown dokümanları oluşturup düzenleyebilmesi.
- Dokümanları arayabilmesi, favorileyebilmesi ve son görüntülenenlerden açabilmesi.
- Her doküman değişikliğinin geçmişte izlenebilmesi.
- Tüm okuma ve yazma işlemlerinin workspace yetkileriyle sınırlandırılması.

### MVP dışında

Gerçek zamanlı ortak düzenleme, yorumlar, dosya ekleri, SSO/SCIM, dış entegrasyonlar (Slack/Teams), gelişmiş yayın/onay akışı, Elasticsearch, mobil uygulama ve faturalandırma sonraki aşamalara bırakılır.

## 3. Roller ve yetkiler

Roller workspace üyeliği kapsamında değerlendirilir. Admin workspace ve üyeleri yönetir; Editor kategori ve dokümanları yönetir; Reader içerikleri görüntüler ve arar. Favori ve son görüntülenenler kullanıcıya özeldir. Workspace oluşturucu ilk Admin olur. MVP'de kullanıcı tek bir workspace'e mi katılır yoksa workspace seçiciyle birden fazlasını mı yönetir konusu uygulamadan önce karara bağlanmalıdır; veri modeli çoklu üyeliği destekleyecek şekilde tasarlanır.

| Yetki | Admin | Editor | Reader |
|---|---:|---:|---:|
| Workspace ayarlarını düzenle / üyeleri yönet | Evet | Hayır | Hayır |
| Kategori oluştur, düzenle, arşivle/sil | Evet | Evet | Hayır |
| Doküman oluştur, düzenle, sil | Evet | Evet | Hayır |
| Dokümanları görüntüle ve ara | Evet | Evet | Evet |
| Favori ve son görüntülenenleri yönet | Evet | Evet | Evet |

## 4. Kapsam ve 12 ekran

| # | Ekran | Kullanıcı amacı ve ana davranış |
|---:|---|---|
| 1 | Landing | Ürün değerini ve temel özellikleri açıklar; kayıt/girişe yönlendirir. |
| 2 | Login | E-posta/şifreyle giriş, doğrulama hataları, oturumu sürdürme ve kayıt bağlantısı. |
| 3 | Register | Hesap oluşturma; başarılı işlemden sonra workspace kurulumuna geçiş. |
| 4 | Workspace Create | Workspace adı/slug belirleme, oluşturucuya Admin rolü verme. |
| 5 | Dashboard | Son dokümanlar, son güncellemeler ve hızlı oluşturma/arama girişleri. |
| 6 | Category List | Kategorileri ve doküman sayılarını listeleme; yetkiye göre oluşturma ve yönetim. |
| 7 | Category Create/Edit | Ad, açıklama ve slug alanlarını doğrulayarak oluşturma/düzenleme. |
| 8 | Document List | Seçili kategori/workspace içindeki dokümanları listeleme ve sıralama. |
| 9 | Document Editor | Başlık, kategori ve Markdown içeriği düzenleme; kaydetme, favorileme, geçmişe erişim. |
| 10 | Search | Workspace kapsamlı tam metin araması ve sonuçtan dokümana geçiş. |
| 11 | Favorites | Kullanıcının favori dokümanlarını listeleme ve favoriden çıkarma. |
| 12 | Profile | Kullanıcı profili ve temel hesap tercihlerini görüntüleme/düzenleme. |

Responsive davranış bu ekranların parçasıdır, ayrı ekran sayılmaz. Dark/light tema ortak kabiliyetidir. Logout, navigasyon/hesap menüsünde sunulur; ayrı ekran değildir. Version history, editör içindeki panel veya modal olarak sunulur. Recent Documents, dashboard bölümü ve gerekiyorsa liste filtresidir.

## 5. Temel kullanıcı akışları

1. Landing → Register → Workspace Create → Dashboard.
2. Login → son kullanılan/varsayılan workspace → Dashboard.
3. Dashboard → Category Create/Edit → Document List → Document Editor → kaydetme ve yeni sürüm.
4. Search → sonuç → Document Editor (Reader salt okunur).
5. Document Editor → favoriye al/çıkar → Favorites.
6. Hesap menüsü → Logout → Landing/Login.

## 6. Fonksiyonel gereksinimler

### Kimlik ve oturum

- Kayıt, giriş ve çıkış e-posta/şifreyle desteklenir; parola güvenli bir hash algoritmasıyla saklanır.
- Kısa ömürlü access JWT ve döndürülen (rotating) refresh token kullanılır; tarayıcıya tokenlar HttpOnly, Secure (HTTPS), uygun SameSite cookie'leriyle verilir.
- CSRF riski cookie tabanlı kimlik doğrulama için değerlendirilir ve yazma isteklerinde koruma uygulanır.
- Hatalar kullanıcıya hesap varlığını ifşa etmez; rate limit auth uçlarında uygulanır.

### Workspace, üyelik ve yetkilendirme

- Workspace adı ve benzersiz slug ile oluşturulur ve düzenlenir.
- Workspace üyeliği ve rolü her istek için sunucu tarafında doğrulanır; istemci kontrolleri güvenlik sınırı değildir.
- Workspace'e ait tüm sorgular `workspaceId` kapsamı taşır; başka tenant verisine erişim engellenir.

### Kategori ve doküman

- Kategoriler ve dokümanlar oluşturulur, listelenir, düzenlenir ve silinir.
- Silme soft delete olarak uygulanır (`deletedAt`); silinmiş kayıt normal listelerde ve aramada görünmez.
- Doküman alanları: `id`, `workspaceId`, `categoryId`, `title`, `slug`, `content`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`, `deletedAt`.
- Markdown MVP araçları: H1/H2/H3, kalın, italik, kod bloğu, bağlantı ve madde listesi.
- İçerik güvenli biçimde render edilir; HTML/URL sanitizasyonu XSS'i engeller.
- Eşzamanlı düzenleme çakışması sessizce ezilmez; güncellemede sürüm veya `updatedAt` tabanlı optimistic concurrency kontrolü yapılır.

### Sürümler, favoriler ve recents

- Doküman içerik değişikliği başarılı biçimde kaydedildiğinde aynı transaction içinde artan sürüm numaralı `DocumentVersion` kaydı oluşturulur.
- Sürüm içeriği, oluşturan kullanıcı ve oluşturulma zamanı saklanır; MVP'de geçmiş salt okunurdur, geri yükleme sonraya bırakılır.
- Favori kullanıcı-doküman ilişkisidir ve tekrar ekleme idempotent olmalıdır.
- Son görüntülenenler kullanıcı bazında güncellenir; liste boyutu sınırlandırılır.

### Arama

- PostgreSQL Full Text Search, başlık ve içerikte workspace kapsamında çalışır; Elasticsearch kullanılmaz.
- Sonuçlar soft deleted ve kullanıcının erişemediği belgeleri içermez.
- Sonuçlarda başlık, kategori, güncellenme zamanı ve kısa eşleşme özeti gösterilir.

## 7. Kalite gereksinimleri

- Güvenlik: girdi şeması doğrulaması, RBAC, tenant izolasyonu, rate limit, güvenli cookie, CSRF değerlendirmesi, Markdown sanitizasyonu ve denetlenebilir kritik işlemler.
- Erişilebilirlik: klavye ile kullanım, görünür focus, etiketli form alanları ve anlamlı kontrast.
- Kullanılabilirlik: Notion benzeri minimal sol navigasyon/sağ içerik düzeni, açık loading/empty/error durumları, responsive tasarım ve tema tercihi.
- Bakım: TypeScript, modüler backend, repository sınırı, migration disiplini, otomatik lint/test/build.
- Gözlemlenebilirlik: yapılandırılmış log, request ID, temel API metrikleri ve sağlık kontrolleri.
- Performans hedefleri (başlangıç varsayımı): yaygın API okumalarında p95 < 500 ms ve aramada p95 < 1 s; gerçekçi veri ve yük ölçümüyle doğrulanmalı.
- Kullanılabilirlik/yedekleme hedefleri MVP öncesi ürün sahibiyle belirlenmeli; production hedefi uydurulmamalıdır.

## 8. MVP kabul ölçütleri

- Yeni kullanıcı kayıt olup workspace kurar ve Dashboard'a ulaşır.
- Üç rol için izin matrisi API katmanında uygulanır ve test edilir.
- Kategori/doküman CRUD, soft delete ve Markdown güvenli render çalışır.
- Bir içerik değişikliği sürüm geçmişinde saklanır; aynı transaction başarısızlıkta kısmi kayıt bırakmaz.
- Arama workspace dışı veya silinmiş kayıt döndürmez.
- Favoriler ve son görüntülenenler kullanıcılar arasında sızmaz.
- 12 ekranın loading, empty, error ve responsive durumları belirlenmiştir.
- Docker Compose ile yerel bağımlılıklar başlatılabilir; CI lint, test ve build'i çalıştırır.

## 9. Ürün metrikleri

- Aktivasyon: kayıt sonrası ilk workspace ve ilk dokümanı oluşturan kullanıcı oranı.
- Değer: haftalık aktif workspace başına oluşturulan/görüntülenen doküman sayısı.
- Bulunabilirlik: arama sonrası dokümana tıklama ve sıfır sonuç oranı.
- Sağlık: API hata oranı, p95 gecikme, kayıt/giriş hata oranı.

## 10. Varsayımlar ve açık kararlar

- İlk dağıtım tek region, tek PostgreSQL ve küçük ekip kullanımına göre tasarlanır.
- Workspace üyelerini davet etme akışı MVP gereksiniminde açık değildir; rol sistemi kullanılabilir hale gelmeden önce davet/API ve davet ekranı kapsamı kararlaştırılmalıdır.
- E-posta doğrulama/parola sıfırlama, plan/faturalama ve veri saklama politikası netleştirilmelidir.
- Slug çakışması, kategori silinince belgelerin davranışı ve workspace silme/retention kuralları ADR veya ürün kararıyla belirlenmelidir.
- 12 ekran listesi ürün sahibi tarafından verilen kapsam kabul edilmiştir; eksik davet akışı ekran sayısına eklenmeden önce onaylanmalıdır.

## 11. Riskler

| Risk | Etki | İlk azaltım |
|---|---|---|
| Tenant filtresinin tek bir endpoint'te unutulması | Veri sızıntısı | Workspace üyeliğini merkezi doğrula; repository API'sinde tenant bağlamı zorunlu kıl; negatif testler ekle. |
| Cookie/JWT yanlış yapılandırması | Hesap ele geçirme/CSRF | Refresh rotasyonu, cookie bayrakları, origin/CSRF kontrolleri ve oturum iptali tasarla. |
| Markdown HTML/URL içeriği | XSS | Güvenli renderer/sanitizer, URL protokol allowlist'i ve güvenlik testleri. |
| Sürümleme ile içerik kaydının ayrışması | Geçmiş kaybı | Tek veritabanı transaction'ı ve benzersiz `(documentId, version)` kısıtı. |
| Tek sunucuda tüm servislerin çalışması | Kesinti/veri kaybı | Harici yedekleme, restore tatbikatı ve kaynak izleme; üretim topolojisini ayrıca doğrula. |

## 12. Sonraki adım

Bu PRD, mimari ve sprint planıyla birlikte kapsam baz çizgisidir. İlk uygulama işinden önce açık kararlar (workspace üyeliği/davet, auth e-posta akışları ve kategori silme semantiği) karara bağlanmalı; ardından ADR'ler onaylanıp monorepo iskeleti oluşturulmalıdır.
