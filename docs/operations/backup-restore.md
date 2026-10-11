# Yedekleme ve geri yükleme runbook'u

Bu prosedür üretim öncesi altyapı sahibince uyarlanmalı, şifreli off-host depoya bağlanmalı ve gerçek ortamda geri yükleme tatbikatıyla doğrulanmalıdır. `scripts/backup-postgres-offsite.sh` yedek akışını uygular; hedef, kimlik ve zamanlama operatör tarafından yapılandırılmalıdır.

Production Compose ve secret injection hazırlığı için [deployment runbook'una](deployment.md) bakın.

## Yedek

1. Off-host S3 uyumlu bucket'ı, erişimi sınırlı bir IAM role/profile'ı, lifecycle saklama kuralını ve şifreleme için age public recipient anahtarını hazırlayın. `AGE_RECIPIENT` public anahtardır; private identity ayrı ve çevrimdışı/secret manager korumasında tutulmalıdır.
2. `DEPLOY_ENV_FILE`, `BACKUP_S3_URI` ve `AGE_RECIPIENT` değişkenlerini tanımlayın. Hostta `docker`, `age`, AWS CLI v2 ve `sha256sum` bulunmalıdır. Örnek çalıştırma:

   ```sh
   DEPLOY_ENV_FILE=/etc/developer-wiki/deploy.env \
   BACKUP_S3_URI=s3://company-backups/developer-wiki \
   AGE_RECIPIENT=age1... \
   bash scripts/backup-postgres-offsite.sh
   ```

   Script PostgreSQL custom dump'ını container'dan stream eder, geçici host dosyasına yalnız age ile şifrelenmiş dump yazar, SHA-256 sidecar üretip ikisini S3 hedefe yükler ve her iki nesnenin varlığını kontrol eder. Başarılı çıktıdaki SHA-256'yı yedek envanterine kaydedin. Bucket lifecycle, versioning/object-lock ve IAM erişim politikasını ayrıca sağlayıcı tarafında tanımlayıp denetleyin.

3. Linux hostta örnek zamanlayıcıyı kurun. `/opt/developer-wiki` repo yolunu ve dedicated `developer-wiki-backup` kullanıcısını ortama göre uyarlayın. `backup.env` içinde `DEPLOY_ENV_FILE`, `BACKUP_S3_URI` ve `AGE_RECIPIENT` tanımlayın; deployment env dosyasına okuma izni verin. AWS erişimini instance role ile sağlayın; age private identity yedek hostuna koymayın.

   ```sh
   sudo useradd --system --home-dir /nonexistent --shell /usr/sbin/nologin developer-wiki-backup
   sudo usermod -aG docker developer-wiki-backup
   sudo install -o root -g root -m 0644 infrastructure/systemd/developer-wiki-backup.service /etc/systemd/system/
   sudo install -o root -g root -m 0644 infrastructure/systemd/developer-wiki-backup.timer /etc/systemd/system/
   sudo install -d -o root -g developer-wiki-backup -m 0750 /etc/developer-wiki
   sudo install -o root -g developer-wiki-backup -m 0640 /path/to/backup.env /etc/developer-wiki/backup.env
   sudo systemctl daemon-reload
   sudo systemctl start developer-wiki-backup.service
   sudo journalctl -u developer-wiki-backup.service
   ```

   Backup hesabının repo ve deployment env dosyalarında yalnız okuma/geçiş izni bulunmalıdır. Service user Docker socket'ine erişmek için host Docker group'unda olmalıdır; bu erişim hostta root-equivalent yetkidir. Bunu yalnız dedicated backup hesabına verin ve kurumun rootless Docker/backup agent standardı varsa systemd birimini ona uyarlayın. İlk manuel çalıştırma başarılı olduktan sonra `developer-wiki-backup.timer` birimini etkinleştirin. Timer günlük 02:15 ve en çok 30 dakika rastgele gecikme örneğidir; onaylı RPO, bakım penceresi ve hedef bölge saatine göre değiştirin.

4. MinIO uygulama verisi saklamaya başladığında nesne yedeklemesini de ayrı hedefe ekleyin. Şu an uygulamada dosya eki akışı yok; Compose volume kopyasını tek yedek kabul etmeyin.

## Geri yükleme tatbikatı

1. İzole bir hostta uyumlu uygulama sürümü ve boş PostgreSQL başlatın; `aws s3 cp s3://bucket/prefix/backup.dump.age .` ve `aws s3 cp s3://bucket/prefix/backup.dump.age.sha256 .` komutlarıyla iki nesneyi alın.
2. SHA sidecar ile `sha256sum --check` doğrulamasını yapın. Private age identity'yi secret manager'dan güvenli biçimde sağlayın ve `set -o pipefail` etkin terminalde dump listesini doğrulayın: `age --decrypt -i /secure/path/backup-identity.txt backup.dump.age | pg_restore --list`.
3. Geri yüklemeyi doğrudan pipe ile yapın: `age --decrypt -i /secure/path/backup-identity.txt backup.dump.age | docker compose exec -T postgres sh -c 'pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"'`.
4. İlgili MinIO nesnelerini geri yükleyin; test ortamında dış e-posta/entegrasyonları kapalı tutun.
5. Migration durumunu, API `/health` ve `/ready`, auth, workspace, doküman listeleme ve dosya indirme akışlarını kontrol edin.
6. Tatbikat tarihini, ölçülen süreyi, bulunan veri kaybı aralığını ve düzeltmeleri kaydedin. Bu ölçümler onaylanmadan RPO/RTO taahhüdü vermeyin.

## Olay sonrası

Etkiyi ve son sağlam yedek zamanını belirleyin; kayıtları koruyun; restore edilmiş servisi smoke-check sonrası kontrollü açın; kök neden ve yedekleme aksiyonlarını takip edin.

## Tatbikat kaydı

**2026-10-11 — izole yerel akış:** Disposable PostgreSQL 17 kaynağından `scripts/backup-postgres-offsite.sh` çalıştırıldı; dump age ile şifrelendi, geçici MinIO bucket'ına ve SHA-256 sidecar'ına yüklendi, ikisi geri indirildi ve checksum doğrulandı. Ayrı PostgreSQL 17 instance'ına geri yüklenen fixture satırı eşleşti. Dump→şifreleme→yükleme→checksum→indirme→restore→doğrulama toplam **9 saniye** sürdü. Tatbikatta yalnız üretilmiş geçici age identity ve test parolaları kullanıldı; işlem sonunda silindi. Veri kümesi tek test satırı olduğu için bu süre production RTO'su sayılmaz. Gerçek off-host provider/bucket, lifecycle, private identity erişimi ve production veri hacmiyle restore ayrıca operatör ortamında doğrulanmalıdır.
