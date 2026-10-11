"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type Props = { mode: "login" | "register" };
type ApiError = {
  error?: { message?: string; fields?: Record<string, string[]> };
};

export function AuthForm({ mode }: Props) {
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const csrfResponse = await fetch("/api/v1/auth/csrf", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!csrfResponse.ok)
        throw new Error(
          "Güvenli bağlantı başlatılamadı. Lütfen tekrar deneyin.",
        );
      const { csrfToken } = (await csrfResponse.json()) as {
        csrfToken: string;
      };
      const response = await fetch(`/api/v1/auth/${mode}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(
          isRegister ? { name, email, password } : { email, password },
        ),
      });
      if (!response.ok) {
        const body = (await response.json()) as ApiError;
        const firstFieldError = Object.values(
          body.error?.fields ?? {},
        ).flat()[0];
        throw new Error(
          firstFieldError ?? body.error?.message ?? "İşlem tamamlanamadı.",
        );
      }
      window.location.assign("/workspace/new");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Bağlantı kurulamadı. Tekrar deneyin.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <aside className="auth-aside">
        <Link className="brand" href="/">
          <span className="brand-mark">D</span> DevWiki
        </Link>
        <div className="auth-aside-copy">
          <p className="eyebrow">
            <span className="eyebrow-dot" /> TEKNİK EKİBİNİZ İÇİN
          </p>
          <h2>
            Bilgi birlikte
            <br />
            <span>büyür.</span>
          </h2>
          <p>
            Ekibinizin kararlarını, rehberlerini ve bilgisini güvenle saklayın.
            Herkes aradığını kolayca bulsun.
          </p>
        </div>
        <div className="auth-aside-foot">
          © 2026 DevWiki · Teknik bilgi, ekip işi.
        </div>
      </aside>
      <main className="auth-main" id="main-content">
        <section className="auth-card">
          <Link className="back-link" href="/">
            ← Ana sayfaya dön
          </Link>
          <h1>{isRegister ? "Hesabınızı oluşturun" : "Tekrar hoş geldiniz"}</h1>
          <p className="auth-subtitle">
            {isRegister
              ? "Birkaç adımda ekibiniz için bilgi alanınızı kurun."
              : "Workspace’inize devam etmek için giriş yapın."}
          </p>
          <form onSubmit={submit}>
            {isRegister && (
              <div className="field">
                <label htmlFor="name">Ad soyad</label>
                <input
                  id="name"
                  autoComplete="name"
                  placeholder="Örn. Deniz Kaya"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  maxLength={120}
                  required
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="email">E-posta adresi</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="siz@sirket.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={320}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">
                Parola
                {!isRegister && (
                  <Link href="#forgot" className="forgot-link">
                    Parolamı unuttum
                  </Link>
                )}
              </label>
              <input
                id="password"
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder={
                  isRegister ? "En az 12 karakter" : "Parolanızı girin"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={isRegister ? 12 : 1}
                maxLength={128}
                required
              />
              {isRegister && (
                <div className="field-help">En az 12 karakter kullanın.</div>
              )}
            </div>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button
              className="button button-primary submit-button"
              type="submit"
              disabled={busy}
            >
              {busy
                ? "Lütfen bekleyin…"
                : isRegister
                  ? "Hesap oluştur"
                  : "Giriş yap"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="auth-switch">
            {isRegister ? "Zaten hesabınız var mı?" : "Henüz hesabınız yok mu?"}{" "}
            {isRegister ? (
              <Link href="/login">Giriş yapın</Link>
            ) : (
              <Link href="/register">Ücretsiz hesap oluşturun</Link>
            )}
          </p>
          {isRegister && (
            <p className="legal-note">
              Hesap oluşturarak kullanım koşullarımızı ve gizlilik politikamızı
              kabul etmiş olursunuz.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
