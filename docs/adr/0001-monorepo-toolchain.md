# ADR-0001: Monorepo toolchain

- **Durum:** Kabul edildi
- **Tarih:** 2026-10-11

## Bağlam

Web, API ve ortak paketler aynı ürün ekibi tarafından geliştirilecek. Ortak tip/sözleşmelerin ve lint/build kurallarının tek yerde sürümlenmesi gerekiyor. Toolchain seçimi kilit dosyası üretilmeden önce yapılmalı.

## Karar

pnpm workspace ve Turborepo kullanılacak. Node.js 22 LTS, pnpm 10 sürüm ailesi ve TypeScript strict mode başlangıç standardıdır. `apps/web` Next.js, `apps/api` Fastify; `packages/ui`, `packages/shared`, `packages/types` workspace paketleridir. Root scriptleri `dev`, `build`, `lint`, `typecheck`, `test` görevlerini Turbo üzerinden yönlendirir. Kesin patch sürümleri `package.json` ve lockfile'da sabitlenir.

## Alternatifler

- npm workspaces: ek araç sayısı az; görev önbelleği/orchestration daha sınırlı.
- Nx: kapsamlı grafik ve cache; mevcut küçük MVP için yapılandırma maliyeti yüksek.
- Yarn: kullanılabilir; ekipte özel gereksinim olmadığı için tercih edilmedi.

## Sonuçlar

- Tek lockfile ve tutarlı workspace bağımlılıkları elde edilir.
- Cache invalidation ve paket sınırları için Turbo pipeline yapılandırması gerekir.
- Paketler arası importlar package export'larından yapılmalı; `../../` kaynak içi çapraz erişim kullanılmamalı.
- Node/pnpm güncellemeleri kontrollü yapılmalı ve CI ile eşitlenmelidir.
