"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import AccountMenu from "../../account-menu";

type Workspace = { id: string; name: string; slug: string; role: string };
type ApiFailure = {
  error?: { message?: string; fields?: Record<string, string[]> };
};

export default function NewWorkspacePage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Workspace | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/v1/workspaces", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (response.status === 401) {
          window.location.replace("/login");
          return;
        }
        if (response.ok) {
          const data = (await response.json()) as { workspaces: Workspace[] };
          setWorkspaces(data.workspaces);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const csrfResponse = await fetch("/api/v1/auth/csrf", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const { csrfToken } = (await csrfResponse.json()) as {
        csrfToken: string;
      };
      const response = await fetch("/api/v1/workspaces", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ name, ...(slug ? { slug } : {}) }),
      });
      if (!response.ok) {
        const body = (await response.json()) as ApiFailure;
        const firstFieldError = Object.values(
          body.error?.fields ?? {},
        ).flat()[0];
        throw new Error(
          firstFieldError ?? body.error?.message ?? "Workspace oluşturulamadı.",
        );
      }
      const data = (await response.json()) as { workspace: Workspace };
      setCreated(data.workspace);
      setWorkspaces((current) => [...current, data.workspace]);
      setName("");
      setSlug("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı kurulamadı.");
    } finally {
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
            <span className="eyebrow-dot" /> BİRLİKTE DAHA İYİ
          </p>
          <h2>
            Ekibiniz için
            <br />
            <span>yer açın.</span>
          </h2>
          <p>
            Teknik bilgiyi ortak bir yerde toplayın. Ekibinizi daha sonra
            workspace ayarlarından davet edebilirsiniz.
          </p>
        </div>
        <div className="auth-aside-foot">
          Workspace’iniz güvende ve size özel.
        </div>
      </aside>
      <main className="auth-main" id="main-content">
        <section className="auth-card workspace-card">
          <div className="workspace-account">
            <AccountMenu />
          </div>
          <Link className="back-link" href="/">
            ← Ana sayfaya dön
          </Link>
          <div className="workspace-icon-large">▦</div>
          <h1>Workspace’inizi kurun</h1>
          <p className="auth-subtitle">
            Ekibinizin teknik bilgilerini bir araya getirecek çalışma alanına
            bir isim verin.
          </p>
          {loading ? (
            <p className="field-help">Workspace’ler yükleniyor…</p>
          ) : null}
          {workspaces.length > 0 && (
            <div>
              <p className="field-label-link">Mevcut workspace’leriniz</p>
              {workspaces.map((workspace) => (
                <div className="workspace-preview" key={workspace.id}>
                  <span className="workspace-icon">
                    {workspace.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    <Link href={`/workspaces/${workspace.id}/categories`}>
                      <b>{workspace.name}</b>
                    </Link>
                    <small>
                      {workspace.slug} ·{" "}
                      {workspace.role === "ADMIN" ? "Yönetici" : workspace.role}
                    </small>
                  </span>
                  <span className="workspace-actions">
                    <Link href={`/workspaces/${workspace.id}/dashboard`}>
                      Genel bakış
                    </Link>
                    <Link href={`/workspaces/${workspace.id}/categories`}>
                      Kategoriler
                    </Link>
                    <Link href={`/workspaces/${workspace.id}/documents`}>
                      Dokümanlar
                    </Link>
                    <Link href={`/workspaces/${workspace.id}/search`}>Ara</Link>
                  </span>
                </div>
              ))}
            </div>
          )}
          {created && (
            <div className="form-success" role="status">
              <b>{created.name}</b> workspace’i oluşturuldu. Yönetici olarak
              eklendiniz.{" "}
              <Link href={`/workspaces/${created.id}/dashboard`}>
                Workspace’inize geçin →
              </Link>
            </div>
          )}
          <form onSubmit={createWorkspace}>
            <div className="field">
              <label htmlFor="workspace-name">Workspace adı</label>
              <input
                id="workspace-name"
                placeholder="Örn. Acme Engineering"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (!slug) setSlug("");
                }}
                minLength={2}
                maxLength={100}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="workspace-slug">
                Workspace adresi{" "}
                <span className="field-help">İsteğe bağlı</span>
              </label>
              <input
                id="workspace-slug"
                placeholder="acme-engineering"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                minLength={2}
                maxLength={80}
              />
              <div className="field-help">
                Adres, boşluklar tireye çevrilerek otomatik oluşturulur.
              </div>
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
              {busy ? "Oluşturuluyor…" : "Workspace oluştur"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="auth-switch">
            Workspace zaten sizde mi?{" "}
            <Link className="inline-button" href="/login">
              Başka hesapla giriş yapın
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
