# Release checklist

## Uygulama ve güvenlik

- [ ] CI lint/typecheck/build/API testleri başarılı; dependency audit ve API/web container scan sonuçları gözden geçirildi.
- [ ] Production `JWT_SECRET` secret manager'dan gelir ve en az 32 rastgele karakterdir; yerel Compose varsayılanları kullanılmaz.
- [ ] HTTPS reverse proxy, gerçek `WEB_ORIGIN`, `COOKIE_SECURE=true`; host firewall yalnız gerekli TLS girişini açar.
- [ ] PostgreSQL, Redis, MinIO ve Grafana dış ağa açılmaz; Grafana kimlik doğrulaması ve erişim kısıtı vardır.
- [ ] MinIO registry kaynağı/provenance kararı onaylanmıştır.
- [ ] Migration, staging verisinin yedeğiyle denenmiş; geri dönüş/ileri düzeltme prosedürü kayıtlıdır.
- [ ] `infrastructure/docker/compose.production.yaml` ile production config doğrulandı; image değerleri digest pinli ve approved registry'den geliyor.
- [ ] `scripts/smoke-deployment.sh` staging URL'si üzerinde TLS, web/API proxy, auth ve API/DB readiness kontrollerini geçti.

## Operasyon

- [ ] Operasyon sahibi, staging/production adresleri, SLA, RPO ve RTO kararlaştırıldı.
- [ ] Şifreli off-host PostgreSQL ve nesne yedekleri çalışır; saklama ve erişim politikası belirlenmiştir.
- [ ] `docs/operations/backup-restore.md` izole ortamda tatbik edildi; süre ve sonuç kaydedildi.
- [ ] Grafana/Prometheus panoları erişilebilir; Prometheus alert rules ve notification routing doğrulandı; nöbet/olay sahibi atanmıştır.
- [ ] Staging deploy, auth/content smoke ve performans ölçümü tamamlanmıştır.
- [ ] Release sürümü, migration, rollback yaklaşımı ve incident iletişim planı onaylandı.

## Mevcut release engelleri

Production Compose katmanı TLS reverse proxy, iç servis portlarının kapatılması ve API/DB/MinIO/Grafana secret dosyalarını bağlama desteği sağlar. Bu repository'de gerçek staging/production ortamı veya secret manager bağlantısı yok. Off-host yedek hedefi, geri yükleme tatbikatı, SLA/RPO/RTO, TLS host adı, operasyon sahibi ve MinIO image tedarik zinciri onayı da tanımlı değil. Bu maddeler tamamlanmadan checklist production-ready olarak işaretlenemez.
