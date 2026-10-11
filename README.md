# Developer Wiki

Developer Wiki, yazılım ekiplerinin teknik dokümanlarını workspace'lerde yönetmesi için geliştirilen SaaS ürünüdür. Ürün kapsamı ve mimari kararlar için [`docs/`](docs/product-requirements.md) klasörüne bakın.

## Gereksinimler

- Node.js 22.11 veya üzeri (22 LTS önerilir)
- Corepack etkin pnpm 10.9
- Docker Engine ve Docker Compose v2

## Başlatma

1. `.env.example` dosyasını `.env` olarak kopyalayın ve `JWT_SECRET` dahil yerel değerleri düzenleyin.
2. Bağımlılıkları kurun: `corepack pnpm install`.
3. Prisma Client üretin: `corepack pnpm --filter @developer-wiki/api prisma:generate`.
4. Tam yerel akışı başlatın: `docker compose -f infrastructure/docker/compose.yaml up --build`. API container'ı açılışta `prisma migrate deploy` çalıştırır.

Web `http://localhost:3000`, API sağlık endpoint'i `http://localhost:3001/health`, MinIO konsolu `http://localhost:9001`, Prometheus `http://localhost:9090`, Grafana `http://localhost:3002` adresindedir. Hesap oluşturma, giriş ve workspace oluşturma akışları Landing → Register/Login → Workspace Create sayfalarındadır. Workspace listesinden `/workspaces/{workspaceId}/dashboard`, `/categories`, `/documents`, `/search` ve `/favorites` ekranlarına geçilir. Doküman listesindeki “Düzenle” Markdown editörünü açar; içerik değişiklikleri salt okunur sürüm geçmişinde saklanır. Yerel Grafana oturumu `admin` / `local-only-change-me` bilgilerini kullanır; dışarı açmayın. PostgreSQL `localhost:5432`, Redis `localhost:6379` ve MinIO API `localhost:9000` yalnızca loopback üzerinde yayınlanır.

API'yi host üzerinde geliştirme modunda çalıştırmak için önce PostgreSQL'i `docker compose -f infrastructure/docker/compose.yaml up -d postgres` ile başlatın, migration'ı `corepack pnpm --filter @developer-wiki/api prisma:migrate` komutuyla uygulayın ve ardından `corepack pnpm dev` çalıştırın.

## Root komutları

| Komut                     | Açıklama                                        |
| ------------------------- | ----------------------------------------------- |
| `corepack pnpm dev`       | Web/API uygulamalarını izleme modunda başlatır. |
| `corepack pnpm build`     | Web/API/paket derlemelerini çalıştırır.         |
| `corepack pnpm lint`      | Kaynak dosyaların Prettier biçimini denetler.   |
| `corepack pnpm typecheck` | Workspace tip kontrollerini çalıştırır.         |

## Dosya ağacı

```text
apps/                       # Web ve API uygulamaları
packages/                   # UI, ortak yardımcılar ve paylaşılan tipler
infrastructure/docker/      # Compose ve uygulama Dockerfile'ları
infrastructure/monitoring/  # Prometheus/Grafana provisioning
docs/                       # PRD, mimari, sprint planı ve ADR kayıtları
```

## Bilinen sınırlar

- Dashboard, PostgreSQL tam metin arama ve kullanıcıya özel favorites/recents kullanılabilir.
- Grafana panosu başlangıçta API target durumu ve scrape durumunu gösterir.
- Redis/MinIO sonraki ürün modüllerinde kullanılmak üzere Compose içinde hazırdır.
- Production deploy; TLS, secret store, off-host yedek ve restore prosedürü kararlaştırılana kadar etkinleştirilmez.
