# ADR-0003: Kimlik doğrulama ve oturum güvenliği

- **Durum:** Kabul edildi
- **Tarih:** 2026-10-11

## Bağlam

Tarayıcı istemcisi ve JSON API, register/login/logout gereksinimlerini güvenli biçimde karşılamalıdır. JWT'leri localStorage'da tutmak XSS halinde token sızıntısını kolaylaştırır.

## Karar

Kısa ömürlü access JWT ve opaque, rastgele refresh token kullanılacak. İkisi de HttpOnly cookie'de taşınır; access ömrü 15 dakika, refresh oturumu varsayılan 30 gün. Refresh token'ın yalnız SHA-256 özeti saklanır; her yenilemede rotasyon yapılır. Eski token tekrar görülürse ilgili session iptal edilir. Cookie'ler `Secure` (HTTPS'te), `HttpOnly`, `SameSite=Lax`, path ve domain en dar kapsamda ayarlanır. Browser mutasyon isteklerinde izinli Origin kontrolü ve CSRF token doğrulaması yapılır. Password hashing Argon2id; auth route rate limit; logout session revoke ve cookie clear uygular.

## Alternatifler

- LocalStorage JWT: CSRF riski daha düşük; XSS'te token doğrudan okunabilir.
- Server-side opaque session: iptal basit; her istekte session store erişimi ve JWT gereksiniminden sapma.
- Uzun ömürlü access token: daha az refresh çağrısı; sızıntı halinde daha büyük etki.

## Sonuçlar

- Cookie tabanlı oturum CSRF koruması ve CORS/origin yapılandırmasını zorunlu kılar.
- Refresh session verisi PostgreSQL'de tutulur; Redis kritik session kaynağı olmaz.
- E-posta doğrulama ve parola sıfırlama MVP ilk dilimine dahil değildir; dış kullanıma açmadan önce ürün/saha gereksinimi olarak ayrıca karara bağlanmalıdır.
- Secret rotasyonu, token key ID ve algoritma allowlist'i uygulamada belgelenmelidir.
