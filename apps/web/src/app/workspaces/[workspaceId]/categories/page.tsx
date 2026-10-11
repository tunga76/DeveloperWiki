"use client";

import Link from "next/link";
import AccountMenu from "../../../account-menu";
import { use, useCallback, useEffect, useState, type FormEvent } from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  _count?: { documents: number };
};
type Failure = {
  error?: { message?: string; fields?: Record<string, string[]> };
};

async function csrfToken() {
  const response = await fetch("/api/v1/auth/csrf", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Güvenlik doğrulaması alınamadı.");
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

export default function CategoryListPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(
      `/api/v1/workspaces/${workspaceId}/categories`,
      { credentials: "same-origin", cache: "no-store" },
    );
    if (response.status === 401) {
      window.location.replace("/login");
      return;
    }
    if (!response.ok) throw new Error("Kategoriler yüklenemedi.");
    const data = (await response.json()) as { categories: Category[] };
    setCategories(data.categories);
  }, [workspaceId]);

  useEffect(() => {
    void load()
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Bağlantı kurulamadı."),
      )
      .finally(() => setLoading(false));
  }, [load]);

  function startEdit(category: Category) {
    setEditing(category);
    setName(category.name);
    setSlug(category.slug);
    setDescription(category.description ?? "");
    setError("");
  }
  function clearForm() {
    setEditing(null);
    setName("");
    setSlug("");
    setDescription("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const token = await csrfToken();
      const response = await fetch(
        `/api/v1/workspaces/${workspaceId}/categories${editing ? `/${editing.id}` : ""}`,
        {
          method: editing ? "PATCH" : "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": token,
          },
          body: JSON.stringify({
            name,
            slug,
            description: description || null,
          }),
        },
      );
      if (!response.ok) {
        const body = (await response.json()) as Failure;
        throw new Error(body.error?.message ?? "Kategori kaydedilemedi.");
      }
      clearForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı kurulamadı.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(category: Category) {
    if (
      !window.confirm(
        `“${category.name}” kategorisi arşivlensin mi? İçindeki dokümanlar korunur ve görünmez olur.`,
      )
    )
      return;
    setError("");
    try {
      const token = await csrfToken();
      const response = await fetch(
        `/api/v1/workspaces/${workspaceId}/categories/${category.id}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "X-CSRF-Token": token },
        },
      );
      if (!response.ok) throw new Error("Kategori arşivlenemedi.");
      if (editing?.id === category.id) clearForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı kurulamadı.");
    }
  }

  return (
    <main className="content-shell" id="main-content">
      <header className="content-topbar">
        <Link className="brand" href="/workspace/new">
          <span className="brand-mark">D</span> DevWiki
        </Link>
        <nav>
          <Link href={`/workspaces/${workspaceId}/dashboard`}>Genel bakış</Link>
          <Link href={`/workspaces/${workspaceId}/documents`}>Dokümanlar</Link>
          <Link href={`/workspaces/${workspaceId}/search`}>Ara</Link>
          <Link href={`/workspaces/${workspaceId}/favorites`}>Favoriler</Link>
          <Link href="/workspace/new">Workspace’ler</Link>
          <Link href="/">Ana sayfa</Link>
        </nav>
        <AccountMenu />
      </header>
      <div className="content-heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-dot" /> ÇALIŞMA ALANI
          </p>
          <h1>Kategoriler</h1>
          <p>Teknik bilginizi ekibinizin bulabileceği şekilde düzenleyin.</p>
        </div>
        <Link
          className="button button-primary"
          href={`/workspaces/${workspaceId}/documents`}
        >
          Dokümanlara git →
        </Link>
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <div className="content-grid">
        <section className="content-panel">
          <div className="panel-heading">
            <h2>Kategori listesi</h2>
            <span>{categories.length} kategori</span>
          </div>
          {loading ? (
            <p className="empty-state">Kategoriler yükleniyor…</p>
          ) : categories.length === 0 ? (
            <div className="empty-state">
              <span>◇</span>
              <h3>Henüz kategori yok</h3>
              <p>
                İlk kategorinizi oluşturup dokümanlarınızı düzenlemeye başlayın.
              </p>
            </div>
          ) : (
            <ul className="category-list">
              {categories.map((category) => (
                <li key={category.id}>
                  <span
                    className="category-color"
                    style={{ backgroundColor: category.color ?? "#68a881" }}
                  />
                  <div className="category-copy">
                    <b>{category.name}</b>
                    <small>
                      {category.description || category.slug} ·{" "}
                      {category._count?.documents ?? 0} doküman
                    </small>
                  </div>
                  <button
                    className="button-quiet"
                    onClick={() => startEdit(category)}
                    type="button"
                  >
                    Düzenle
                  </button>
                  <button
                    className="button-quiet danger-text"
                    onClick={() => void remove(category)}
                    type="button"
                  >
                    Arşivle
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="content-panel category-form-panel">
          <div className="panel-heading">
            <h2>{editing ? "Kategoriyi düzenle" : "Yeni kategori"}</h2>
            {editing && (
              <button
                className="inline-button"
                onClick={clearForm}
                type="button"
              >
                Vazgeç
              </button>
            )}
          </div>
          <form onSubmit={(event) => void save(event)}>
            <div className="field">
              <label htmlFor="category-name">Ad</label>
              <input
                id="category-name"
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Örn. Altyapı"
              />
            </div>
            <div className="field">
              <label htmlFor="category-slug">Slug</label>
              <input
                id="category-slug"
                required
                minLength={2}
                maxLength={120}
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="altyapi"
              />
            </div>
            <div className="field">
              <label htmlFor="category-description">
                Açıklama <span className="field-help">İsteğe bağlı</span>
              </label>
              <textarea
                id="category-description"
                maxLength={500}
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Bu kategoride neler bulunur?"
              />
            </div>
            <button
              className="button button-primary submit-button"
              type="submit"
              disabled={busy}
            >
              {busy
                ? "Kaydediliyor…"
                : editing
                  ? "Değişiklikleri kaydet"
                  : "Kategori oluştur"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
