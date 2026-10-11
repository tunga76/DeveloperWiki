# ADR-0002: Modüler monolit ve tenant sınırları

- **Durum:** Kabul edildi
- **Tarih:** 2026-10-11

## Bağlam

İlk sürüm tek bir ekip tarafından geliştirilecek. Workspace verilerinin birbirinden kesin biçimde ayrılması en yüksek güvenlik gereksinimidir.

## Karar

API tek Fastify uygulaması olarak deploy edilir; domain modülleri auth, workspace, category, document ve search olarak ayrılır. Her kullanıcı birden fazla workspace'e üye olabilir. Workspace'i oluşturan kullanıcı Admin olur. Workspace'ler arası üyelik/davet UI'si MVP ekran kapsamı dışında kalır; MVP'de ilk kullanıcı tek başına workspace kurup kullanabilir. İleride Admin'in workspace üyelerini davet etmesi için API ve UI kapsamı ayrıca planlanır. Her workspace isteği doğrulanmış membership context'i taşır. Workspace'e ait repository fonksiyonları `workspaceId` parametresini zorunlu alır. Bir kaynağın bulunmaması ve erişim yetkisinin olmaması dışarıya uygun biçimde 404 olarak normalize edilir.

## Alternatifler

- Mikroservisler: bağımsız deploy/ölçek; MVP'de network, veri tutarlılığı ve operasyon karmaşıklığı.
- Tek workspace/user: daha basit UX; gelecekte üyelik ve kişisel workspace geçişini zorlaştırır.
- DB row-level security: ek savunma katmanı; Prisma transaction/session bağlamı disiplini ve migration karmaşıklığı getirir.

## Sonuçlar

- İlk sürüm basitçe deploy edilir; domain sınırları ileride ayrıştırma olanağı bırakır.
- Tenant filtresi repository ve service katmanlarında zorunlu; tenant izolasyonu integration testlerle korunur.
- Workspace üyeliği değişince rol/erişim cache'i varsa invalidation gerekir; MVP'de üyelik ve rol için cache kullanılmaz.
- DB-level row security MVP'de kullanılmaz; yüksek etkili her sorgu tenant-scoped test edilir.
