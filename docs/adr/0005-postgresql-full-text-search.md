# ADR-0005: Arama motoru

- **Durum:** Kabul edildi
- **Tarih:** 2026-10-11

## Bağlam

MVP doküman başlığı ve Markdown içeriğinde workspace'e kapalı arama gerektirir; ayrı arama kümesi operasyon maliyeti ekler.

## Karar

İlk sürüm PostgreSQL Full Text Search kullanır. Arama `workspaceId` ve aktif doküman/kategori koşullarıyla aynı sorguda kısıtlanır. İndeks, içerik dili doğrulandıktan sonra seçilir; başlangıçta `simple` konfigürasyonu çok dilli dokümanlar için stemming varsayımından kaçınır. `tsvector` için başlık/içerik ağırlıkları ve GIN index migration ile kurulur. Kullanıcı sorgusu parametrik SQL ile işlenir, sonuç sayısı sınırlıdır.

## Alternatifler

- Elasticsearch/OpenSearch: gelişmiş relevance, analyzer ve yatay ölçek; ayrı cluster ve veri eşitleme gerektirir.
- ILIKE: basit; büyük içerikte indekslenebilirlik ve sıralama zayıf.

## Sonuçlar

- PostgreSQL yedeklemesi arama verisini de kapsar, tutarlılık tek transaction sınırındadır.
- Dil bazlı stemming ve gelişmiş typo tolerance yoktur; sıfır sonuç ve relevance ölçümleri büyüme kararını besler.
- ORM desteklemediği FTS işlemleri typed/parametrik SQL repository içinde tutulur.
