# ADR-0006: Başlangıç deployment topolojisi

- **Durum:** Kabul edildi
- **Tarih:** 2026-10-11

## Bağlam

Ürün Ubuntu Server üzerinde çalışacak ve ekip Compose tabanlı yerel ortam isteğini belirtti. Trafik, SLA ve ekip kapasitesi henüz bilinmiyor.

## Karar

Yerel geliştirmede web, API, PostgreSQL, Redis, MinIO, Prometheus ve Grafana Docker Compose ile çalışır. İlk staging/production hedefi, operasyon sahibi ve yedekleme/TLS şartları doğrulandıktan sonra tek Ubuntu host üzerinde Compose olabilir. Dış trafik TLS reverse proxy üzerinden gelir; DB/cache/object store ve Grafana doğrudan internete açılmaz. Production secret'ları Compose dosyasına yazılmaz. CI lint/test/build/image scan yapar; deploy için explicit environment secrets ve rollback/backup prosedürü gerekir.

MinIO'nun upstream Docker Hub ve Quay image pull'ları mevcut ortamda erişim hatası verdi. Yerel Compose için, upstream release katmanlarını değiştirmeden sakladığını bildiren Net Insight `netiedge/minio` aynası `RELEASE.2025-01-20T14-49-07Z` tag ve doğrulanmış manifest digest'iyle pinlendi. Bu mirror upstream MinIO deposu değildir; production image source kararı ve lisans/tedarik zinciri doğrulaması ayrıca yapılmalıdır.

## Alternatifler

- Kubernetes: HA ve orkestrasyon; ekip/ürün ölçeği bilinmeden yüksek operasyon maliyeti.
- Managed PostgreSQL/Redis: yedekleme ve uptime işini azaltır; sağlayıcı maliyeti/bağımlılığı getirir.
- Tek host: maliyet ve kurulum basit; host arızasında kesinti, tek hata noktası.

## Sonuçlar

- Tek host production kararı SLA ve RPO/RTO teyidi olmadan kalıcı kabul sayılmaz.
- PostgreSQL off-host şifreli yedek ve restore tatbikatı release şartıdır.
- Prometheus/Grafana erişimi ayrıca kimlik doğrulama ve ağ kısıtlamasıyla korunmalıdır.
- Redis'in kaybı session doğrulamasını etkilemez; kritik refresh session verisi PostgreSQL'dedir.
- Yerel MinIO mirror kullanımı production tercihi değildir; upstream registry erişilebilirliği veya kurumsal registry mirror'ı sonraki deployment kararıdır.
