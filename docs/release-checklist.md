# Release checklist

## Uygulama ve güvenlik

- [ ] CI lint/typecheck/build/API testleri başarılı; dependency audit ve API/web container scan sonuçları gözden geçirildi.
- [x] GitHub Actions checkout, setup-node ve Trivy action referansları değişmez commit SHA'larına pinlendi.
- [x] Playwright suite kayıt/workspace, login/profil/tema/çıkış, kategori/doküman editörü/sürüm ve arama/favori ana akışlarını kapsıyor; CI browser job'u eklendi.
- [ ] Son `master` commit'i için GitHub browser E2E job'u yeşil.
- [ ] Production `JWT_SECRET` secret manager'dan gelir ve en az 32 rastgele karakterdir; yerel Compose varsayılanları kullanılmaz.
- [ ] HTTPS reverse proxy, gerçek `WEB_ORIGIN`, `COOKIE_SECURE=true`; host firewall yalnız gerekli TLS girişini açar.
- [ ] PostgreSQL, Redis, MinIO ve Grafana dış ağa açılmaz; Grafana kimlik doğrulaması ve erişim kısıtı vardır.
- [ ] Operations UI erişimi korumalı ağ veya SSH tüneli üzerinden doğrulandı; Alertmanager receiver staging'de test edildi.
- [ ] MinIO registry kaynağı/provenance kararı onaylanmıştır.
- [ ] Migration, staging verisinin yedeğiyle denenmiş; geri dönüş/ileri düzeltme prosedürü kayıtlıdır.
- [ ] `infrastructure/docker/compose.production.yaml` ile production config doğrulandı; image değerleri digest pinli ve approved registry'den geliyor.
- [ ] `scripts/smoke-deployment.sh` staging URL'si üzerinde TLS, web/API proxy, auth ve API/DB readiness kontrollerini geçti.

## Operasyon

- [ ] Operasyon sahibi, staging/production adresleri, SLA, RPO ve RTO kararlaştırıldı.
- [x] Şifreli off-host PostgreSQL akışı `scripts/backup-postgres-offsite.sh` ile eklendi; age şifrelemesi, checksum sidecar ve remote object check mock CLI'larla doğrulandı.
- [x] Linux systemd service/timer örneği eklendi; günlük saat örneği operatörün onayladığı RPO ve bakım penceresine göre uyarlanmalı.
- [ ] Gerçek bucket/age anahtarı ile timer, lifecycle/erişim politikası ve başarılı ilk yedek operatör ortamında yapılandırılıp doğrulanmalı. MinIO dosya eki akışı uygulamaya alındığında nesne yedeği ayrıca doğrulanmalı.
- [x] `docs/operations/backup-restore.md` izole ortamda tatbik edildi; süre ve sonuç kaydedildi.
- [ ] Grafana/Prometheus panoları erişilebilir; Prometheus alert rules ve notification routing doğrulandı; nöbet/olay sahibi atanmıştır.
- [ ] Staging deploy, auth/content smoke ve performans ölçümü tamamlanmıştır.
- [x] Incident müdahalesi, rollback/restore ve durum güncellemesi için başlangıç şablonu `docs/operations/incident-response.md` içine eklendi.
- [ ] Release sürümü, migration/rollback yaklaşımı, incident owner/channel/update cadence ve iletişim planı operatörce doldurulup onaylandı.

## Mevcut release engelleri

Production Compose katmanı TLS reverse proxy, iç servis portlarının kapatılması ve API/DB/MinIO/Grafana secret dosyalarını bağlama desteği sağlar. Şifreli PostgreSQL backup script'i S3 uyumlu off-host hedefe yükleme ve checksum sidecar doğrulaması sağlar; gerçek bucket/kimlik bilgisi/lifecycle ile çalıştırılmadı. API image runtime'ı production bağımlılıklarına daraltıldı, Prisma migration CLI'si doğrulandı ve API/web production image taramalarında CRITICAL/HIGH bulgu çıkmadı. Yerel dependency audit temiz; API testleri, workspace typecheck/build ve dört Playwright senaryosu geçti. Dört migration disposable PostgreSQL 17'de başarılı uygulandı ve bu kontrol CI'a eklendi; staging snapshot'ı ve geri dönüş planıyla prova yapılmadı. İzole PostgreSQL/MinIO tatbikatında şifreli dump ve checksum geri indirildi, ayrı PostgreSQL restore'u 9 saniyede tamamlandı; bu küçük yerel fixture gerçek RTO ölçümü değildir. `ad66d71` run'ındaki Trivy setup rapor üretmeden başarısız oldu; scanner release-version input'undaki `v` öneki düzeltildi, JSON diagnostics eklendi. Düzeltilmiş run sonucu henüz doğrulanmadı.

Production kurulumu için operatör girdileri:

- Hosting ve staging: onaylı host/registry, DNS hostname, firewall ve deploy erişimi; TLS ve staging smoke/performance çalıştırması.
- Secrets: gerçek secret manager yolu, production JWT/DB/MinIO/Grafana credential'ları ve rotation sahibi.
- Yedekleme: off-host bucket, IAM/lifecycle politikası, age public/private key erişimi, systemd zamanlaması ve gerçek veriyle restore tatbikatı.
- Servis ve tedarik: MinIO image kaynağı/provenance onayı; operations UI erişim yöntemi ve Alertmanager receiver endpoint'i.
- İşletim kararları: servis sahibi ve nöbet iletişim kanalı, incident güncelleme ritmi, release sürümü, migration rollback yöntemi, onaylı SLA/RPO/RTO.

Gerçek staging/production ortamı veya secret manager bağlantısı bu repository'de bulunmuyor. Hosting, secrets, gerçek off-host restore ve işletim kararları onaylanıp doğrulanmadan checklist production-ready olarak işaretlenemez.
