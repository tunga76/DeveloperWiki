# Release checklist

## Uygulama ve güvenlik

- [ ] CI lint/typecheck/build/API testleri başarılı; dependency audit ve API/web container scan sonuçları gözden geçirildi.
- [ ] Production `JWT_SECRET` secret manager'dan gelir ve en az 32 rastgele karakterdir; yerel Compose varsayılanları kullanılmaz.
- [ ] HTTPS reverse proxy, gerçek `WEB_ORIGIN`, `COOKIE_SECURE=true`; host firewall yalnız gerekli TLS girişini açar.
- [ ] PostgreSQL, Redis, MinIO ve Grafana dış ağa açılmaz; Grafana kimlik doğrulaması ve erişim kısıtı vardır.
- [ ] MinIO registry kaynağı/provenance kararı onaylanmıştır.
- [ ] Migration, staging verisinin yedeğiyle denenmiş; geri dönüş/ileri düzeltme prosedürü kayıtlıdır.

## Operasyon

- [ ] Operasyon sahibi, staging/production adresleri, SLA, RPO ve RTO kararlaştırıldı.
- [ ] Şifreli off-host PostgreSQL ve nesne yedekleri çalışır; saklama ve erişim politikası belirlenmiştir.
- [ ] `docs/operations/backup-restore.md` izole ortamda tatbik edildi; süre ve sonuç kaydedildi.
- [ ] Grafana/Prometheus panoları ve health/readiness uyarıları erişilebilir; nöbet/olay sahibi atanmıştır.
- [ ] Staging deploy, auth/content smoke ve performans ölçümü tamamlanmıştır.
- [ ] Release sürümü, migration, rollback yaklaşımı ve incident iletişim planı onaylandı.

## Mevcut release engelleri

Bu repository'de gerçek staging/production ortamı veya secret manager bağlantısı yok. Off-host yedek hedefi, geri yükleme tatbikatı, SLA/RPO/RTO, TLS host adı, operasyon sahibi ve MinIO mirror tedarik zinciri onayı da tanımlı değil. Bu maddeler tamamlanmadan checklist production-ready olarak işaretlenemez.
