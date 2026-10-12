# Production Compose deployment runbook'u

Bu katman Linux host üzerinde Docker Compose v2.24.4 veya sonrası içindir; base Compose dosyasındaki yerel geliştirme portlarını kapatır. Yalnız Caddy 80/443 portlarını yayımlar ve otomatik TLS sertifikası alır. Caddy response'lara HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` ve `Permissions-Policy` ekler, `Server` başlığını kaldırır. Önce DNS A/AAAA kayıtlarını hosta yönlendirin, firewall'da 80/443 açın ve diğer inbound portları kapatın.

## Hazırlık

1. API ve web imajlarını CI'da build edip kurumunuzun onaylı registry'sine gönderin. `WEB_IMAGE` ve `API_IMAGE` için sürüm tag'ine ek olarak registry'nin döndürdüğü değişmez digest'i kullanın (`name:tag@sha256:...`).
2. `CADDY_IMAGE`, `POSTGRES_IMAGE`, `REDIS_IMAGE`, `MINIO_IMAGE`, `PROMETHEUS_IMAGE` ve `GRAFANA_IMAGE` değerlerini onaylı registry'den digest ile pinleyin (`name@sha256:...`). MinIO için upstream veya kurum içi mirror provenance onaylanmadan release yapmayın.
3. Secret manager üzerinden hosta aşağıdaki dosyaları güvenli biçimde sağlayın; repo içine koymayın. Dosya izinlerini hostta yalnız deploy kullanıcısı okuyacak şekilde ayarlayın.
   - `DATABASE_URL_SECRET_FILE`: PostgreSQL bağlantı URL'si; host `postgres`, DB/user/password Compose ayarlarıyla uyumlu olmalı.
   - `JWT_SECRET_FILE`: en az 32 rastgele karakter.
   - `POSTGRES_PASSWORD_FILE`: DB kullanıcısının parolası.
   - `MINIO_ROOT_PASSWORD_FILE`: MinIO root parolası.
   - `GRAFANA_ADMIN_PASSWORD_FILE`: Grafana admin parolası.
4. Deploy ortamında `SITE_ADDRESS`, `WEB_IMAGE`, `API_IMAGE`, tüm digest-pinned service image değerleri, `MINIO_ROOT_USER` ve beş secret dosyasının yolunu tanımlayın.

`.env.production.example` değişken adlarını ve secret dosyası yol biçimini gösterir. Image digest'leri sıfırlarla doldurulmuş örnek değerlerdir ve gerçek digest'lerle değiştirilmelidir; validator tüm sekiz image digest'ini kontrol eder. Secret dosyalarının okunabilir, normal dosya ve boş olmayan değerler olmasını; JWT secret'ının en az 32 karakter olmasını da config aşamasında doğrular. Kopyasını repo dışındaki deploy env dosyasında gerçek değerlerle değiştirin.

Operations UI veya Alertmanager overlay'lerini etkinleştirdiyseniz ilgili Compose katmanlarını deployment komutlarına da ekleyin. UI için `compose.ops-access.yaml`, webhook teslimatı yapılandırıldıktan sonra Alertmanager için `compose.alertmanager.yaml` eklenir.

## Config doğrulama ve açılış

```sh
DEPLOY_ENV_FILE=/etc/developer-wiki/deploy.env bash scripts/validate-production-config.sh
docker compose --env-file /etc/developer-wiki/deploy.env -f infrastructure/docker/compose.yaml -f infrastructure/docker/compose.production.yaml pull
docker compose --env-file /etc/developer-wiki/deploy.env -f infrastructure/docker/compose.yaml -f infrastructure/docker/compose.production.yaml up -d
docker compose --env-file /etc/developer-wiki/deploy.env -f infrastructure/docker/compose.yaml -f infrastructure/docker/compose.production.yaml ps
SITE_URL=https://wiki.example.com DEPLOY_ENV_FILE=/etc/developer-wiki/deploy.env bash scripts/smoke-deployment.sh
```

Smoke script TLS üzerinden web'i ve zorunlu güvenlik response header'larını, API proxy/CSRF ve unauthenticated auth yanıtını, ayrıca Compose network'ünde API `/ready` + DB bağlantısını kontrol eder. `DEPLOY_ENV_FILE` içindeki `ENABLE_OPS_UI=true` ve `ENABLE_ALERTMANAGER=true` ayarları verilmişse ilgili Compose overlay'lerini health kontrolünde de kullanır; CI dış HTTP/Docker erişimi olmadan varsayılan ve iki overlay senaryosunu fake `curl`/`docker` ile sınar. DB/cache/object store/monitoring servisleri yalnız Compose network'ünde kalır. API konteyneri başlangıçta `prisma migrate deploy` çalıştırır; production migration öncesi DB yedeği alın ve release checklist'teki migration/rollback maddelerini yerine getirin.

## Geri alma

Uygulama image tag'lerini önceki release'e alıp tekrar `up -d` edin. Migration geri alma otomatik değildir; şema değişikliği için doğrulanmış ileri düzeltme veya yedekten restore planını kullanın. Caddy sertifika ve konfigürasyon volume'lerini yedekleme politikasına ekleyin.

Bu runbook henüz gerçek hostta doğrulanmadı. İlk staging deploy'unda Compose config, TLS issuance, restore ve uygulama smoke sonuçlarını kaydedin.
