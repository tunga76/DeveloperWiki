# Incident response runbook

Bu belge başlangıç şablonudur. Production öncesi `[owner]`, `[channel]`, `[update interval]`, escalation yolu ve erişim listesini operasyon sahibi doldurup ekipçe onaylamalıdır. Erişim bilgisi, secret, token veya müşteri verisini incident mesajlarına yazmayın.

## Hazırlık alanları

- Incident commander: `[primary / backup]`
- Teknik müdahale ve deploy sahibi: `[primary / backup]`
- İletişim kanalı ve müşteri iletişim sahibi: `[approved channel / owner]`
- Escalation ve sağlayıcı destek yolu: `[contact / account reference]`
- İlk durum güncellemesi hedefi ve sıklığı: `[interval]`
- Onaylı staging/production adresleri ve runbook erişimi: `[location]`

## Olay açma ve sınıflandırma

1. Grafana/Prometheus alarmını, kullanıcı raporunu veya deploy sonrası hatayı kaydedin. UTC başlangıç zamanı, etkilenen servisler ve kanıt bağlantılarını not edin.
2. Commander ve teknik müdahale sahibini atayın. Commander yoksa ilk müdahale eden kişi koordinasyonu geçici olarak üstlenip sahibini belirlesin.
3. Etkiyi kullanıcı/veri kapsamına göre sınıflandırın. Geniş erişilememe, veri kaybı/bozulması veya şüpheli yetkisiz erişim en yüksek öncelikle ele alınır; kurumun resmi severity/SLA tanımlarını burada kullanın.
4. Onaylı kanalda etki, alınan aksiyon, bilinen bilinmeyenler ve bir sonraki güncelleme zamanını paylaşın. Güncelleme aralığı kurum politikasıyla doldurulmalıdır.

## Müdahale

1. Değişiklik/release kaynaklıysa yeni deploy'u durdurun ve önceki digest-pinned web/API image'larına dönün. DB migration'ını otomatik geri almayın; uyumsuz şema varsa doğrulanmış ileri düzeltme veya restore planını kullanın.
2. API erişim sorunu için `docs/operations/monitoring.md` ve production Compose service health durumlarını kontrol edin. Hassas değerleri terminal çıktısı veya incident kanalına kopyalamayın.
3. Veri bütünlüğü/erişimi şüphesinde etkilenen erişimi sınırlandırın; log ve audit kanıtlarını koruyun. Secret rotation ve bildirim kararını güvenlik/operasyon sahibine eskale edin.
4. Geri yükleme gerekiyorsa `docs/operations/backup-restore.md` runbook'unu izole ortamda uygulayın. Son sağlam yedek zamanını kaydedin; veri kaybı aralığını ve restore süresini ölçün.
5. Düzeltme sonrası `/health`, `/ready`, auth ve temel içerik akışlarını doğrulayın. Monitoring alarmının normale döndüğünü gözleyin; commander kontrollü toparlanma ilan etsin.

## Durum güncellemesi şablonu

```text
Durum: [investigating | mitigating | monitoring | resolved]
Başlangıç (UTC): [timestamp]
Etki: [kullanıcı/servis/veri kapsamı]
Son değişiklik: [digest/deploy/migration veya bilinmiyor]
Yapılanlar: [kısa eylem ve sonuç]
Veri kaybı aralığı: [yok | ölçülüyor | tahmin]
Sonraki güncelleme: [UTC timestamp]
Incident commander: [name]
```

## Kapanış ve takip

- Etki penceresi, kök neden, tespit süresi, toparlanma süresi ve yedek/restore sonuçlarını kaydedin.
- Aksiyonları sahibi ve hedef tarihiyle issue/iş takip sistemine alın.
- Gerekli güvenlik, yasal veya müşteri bildirimlerini yalnız atanmış sorumlu ve onaylı süreç üzerinden yönetin.
- Runbook, alarm eşikleri ve rollback adımlarını tatbikat bulgularına göre güncelleyin.
