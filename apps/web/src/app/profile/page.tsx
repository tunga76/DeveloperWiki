"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import AccountMenu from "../account-menu";

type User = { id: string; email: string; name: string | null };

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/v1/auth/me", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.replace("/login");
          return;
        }
        if (!response.ok) throw new Error("Profil yüklenemedi.");
        const data = (await response.json()) as { user: User };
        setUser(data.user);
        setName(data.user.name ?? "");
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Bağlantı kurulamadı."),
      )
      .finally(() => setLoading(false));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const csrf = await fetch("/api/v1/auth/csrf", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!csrf.ok) throw new Error("Güvenlik doğrulaması alınamadı.");
      const { csrfToken } = (await csrf.json()) as { csrfToken: string };
      const response = await fetch("/api/v1/auth/me", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ name: name.trim() || null }),
      });
      const body = (await response.json()) as {
        user?: User;
        error?: { message?: string };
      };
      if (!response.ok || !body.user)
        throw new Error(body.error?.message ?? "Profil kaydedilemedi.");
      setUser(body.user);
      setName(body.user.name ?? "");
      setMessage("Profil güncellendi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı kurulamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="content-shell" id="main-content">
      <header className="content-topbar">
        <Link className="brand" href="/workspace/new">
          <span className="brand-mark">D</span> DevWiki
        </Link>
        <nav aria-label="Hesap gezinmesi">
          <Link href="/workspace/new">Workspace’ler</Link>
        </nav>
        <AccountMenu />
      </header>
      <div className="content-heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-dot" /> HESAP
          </p>
          <h1>Profil</h1>
          <p>Hesap bilgilerinizi ve görünüm tercihinizi yönetin.</p>
        </div>
      </div>
      <section className="content-panel profile-panel">
        {loading ? (
          <p role="status">Profil yükleniyor…</p>
        ) : (
          user && (
            <form className="form-stack" onSubmit={save}>
              <label htmlFor="profile-email">E-posta</label>
              <input
                id="profile-email"
                type="email"
                value={user.email}
                readOnly
              />
              <label htmlFor="profile-name">Adınız</label>
              <input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={120}
                placeholder="Adınızı girin"
              />
              <p className="form-hint">
                Ad alanını boş bırakarak kaldırabilirsiniz.
              </p>
              {error && (
                <div className="form-error" role="alert">
                  {error}
                </div>
              )}
              {message && (
                <div className="form-success" role="status">
                  {message}
                </div>
              )}
              <button
                className="button button-primary"
                type="submit"
                disabled={busy || name.trim().length === 1}
              >
                {busy ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
              </button>
            </form>
          )
        )}
        {!loading && !user && !error && <p>Profil bilgisi bulunamadı.</p>}
      </section>
    </main>
  );
}
