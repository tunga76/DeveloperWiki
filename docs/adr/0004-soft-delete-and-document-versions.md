# ADR-0004: Soft delete ve doküman sürümleri

- **Durum:** Kabul edildi
- **Tarih:** 2026-10-11

## Bağlam

Kategori/doküman silme geri dönüş ve denetim gerektirir; doküman değişikliklerinin geçmişi saklanmalıdır. Soft delete slug ve referans kurallarını da etkiler.

## Karar

Kategori ve dokümanlarda `deletedAt` soft delete alanıdır. Silinmiş kategori altındaki dokümanlar korunur ve arşivli kategoride kaldıkları için normal listede görünmez; hard delete/cascade uygulanmaz. Silinmiş kayıt slug'ı workspace içinde re-use edilebilir. Bu nedenle aktif kayıtlar için partial unique index `(workspaceId, slug) WHERE deletedAt IS NULL` PostgreSQL migration'ında oluşturulur. Doküman yalnız içerik değiştiğinde transaction içinde `version = previous + 1` sürümü ekler. `(documentId, version)` unique'tir. Sürümler append-only ve salt okunur; restore UI'si MVP dışıdır. Her başarılı update `updatedAt` optimistic concurrency koşulunu kullanır.

## Alternatifler

- Hard delete/cascade: basit; geçmiş/favori/recent referanslarını ve kurtarmayı kaybettirir.
- Silinmiş slug'ı re-use etmemek: restore basit; soft-deleted kayıtların süresiz ad kilitlemesi.
- Her kaydetmede sürüm: açık geçmiş; otomatik save durumunda gereksiz sürüm artışı.

## Sonuçlar

- Prisma schema tek başına partial unique index'i ifade edemediği durumda SQL migration el ile korunur ve migration test edilir.
- Kategori soft delete'i child document'lara `deletedAt` yazmaz; kategori ilişkisiyle görünürlük filtrelenir.
- Sürüm oluşturma ve ana doküman güncellemesi aynı transaction'da olmalıdır.
- Retention, restore ve kalıcı silme yönetimi sonraki ürün/uyumluluk kararıdır.
