# Yedekleme ve geri yükleme runbook'u

Bu prosedür üretim öncesi altyapı sahibince uyarlanmalı, şifreli off-host depoya bağlanmalı ve gerçek ortamda geri yükleme tatbikatıyla doğrulanmalıdır. Bu depo tek başına otomatik yedekleme sağlamaz.

## Yedek

1. Etki alanı, zaman damgası ve saklama politikasını belirleyin; yedek hedefinin uygulama hostu dışında ve şifreli olduğundan emin olun.
2. DB yedeğini alıp hedefe aktarın:

   ```sh
   docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "developer-wiki-$(date -u +%Y%m%dT%H%M%SZ).dump"
   ```

3. MinIO kullanılıyorsa bucket nesnelerini de version/retention politikasına uygun şekilde ayrı hedefe kopyalayın. Compose volume kopyasını tek yedek olarak kabul etmeyin.
4. Dosyaların bütünlüğünü kontrol edin (`pg_restore --list`) ve yedek envanteri ile saklama süresini kaydedin.

## Geri yükleme tatbikatı

1. İzole bir hostta uyumlu uygulama sürümü ve boş PostgreSQL başlatın.
2. Dump dosyasını PostgreSQL container'ına aktararak veritabanını geri alın: `docker compose exec -T postgres sh -c 'pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backup.dump`.
3. İlgili MinIO nesnelerini geri yükleyin; test ortamında dış e-posta/entegrasyonları kapalı tutun.
4. Migration durumunu, API `/health` ve `/ready`, auth, workspace, doküman listeleme ve dosya indirme akışlarını kontrol edin.
5. Tatbikat tarihini, ölçülen süreyi, bulunan veri kaybı aralığını ve düzeltmeleri kaydedin. Bu ölçümler onaylanmadan RPO/RTO taahhüdü vermeyin.

## Olay sonrası

Etkiyi ve son sağlam yedek zamanını belirleyin; kayıtları koruyun; restore edilmiş servisi smoke-check sonrası kontrollü açın; kök neden ve yedekleme aksiyonlarını takip edin.
