"use client";
import Link from "next/link";
import AccountMenu from "../../../account-menu";
import { use, useEffect, useState } from "react";

type Favorite = {
  id: string;
  title: string;
  slug: string;
  favoritedAt: string;
  category: { id: string; name: string; color: string | null };
};
async function csrf() {
  const response = await fetch("/api/v1/auth/csrf", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Güvenlik doğrulaması alınamadı.");
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}
export default function FavoritesPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    const response = await fetch(
      `/api/v1/workspaces/${workspaceId}/favorites?page=1&pageSize=50`,
      { credentials: "same-origin", cache: "no-store" },
    );
    if (response.status === 401) {
      window.location.replace("/login");
      return;
    }
    if (!response.ok) throw new Error("Favoriler yüklenemedi.");
    setFavorites(
      ((await response.json()) as { favorites: Favorite[] }).favorites,
    );
  }
  useEffect(() => {
    void load()
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Bağlantı kurulamadı."),
      )
      .finally(() => setLoading(false));
  }, [workspaceId]);
  async function remove(id: string) {
    try {
      const token = await csrf();
      const response = await fetch(
        `/api/v1/workspaces/${workspaceId}/documents/${id}/favorite`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "X-CSRF-Token": token },
        },
      );
      if (!response.ok) throw new Error("Favori kaldırılamadı.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı kurulamadı.");
    }
  }
  return (
    <main className="content-shell" id="main-content">
      <header className="content-topbar">
        <Link className="brand" href={`/workspaces/${workspaceId}/dashboard`}>
          <span className="brand-mark">D</span> DevWiki
        </Link>
        <nav>
          <Link href={`/workspaces/${workspaceId}/dashboard`}>Genel bakış</Link>
          <Link href={`/workspaces/${workspaceId}/documents`}>Dokümanlar</Link>
          <Link href={`/workspaces/${workspaceId}/search`}>Ara</Link>
        </nav>
        <AccountMenu />
      </header>
      <div className="content-heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-dot" /> KİŞİSEL LİSTEM
          </p>
          <h1>Favoriler</h1>
          <p>Tekrar dönmek istediğiniz önemli dokümanlar.</p>
        </div>
        <Link
          className="button button-primary"
          href={`/workspaces/${workspaceId}/search`}
        >
          Doküman ara →
        </Link>
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <section className="content-panel">
        <div className="panel-heading">
          <h2>Kaydettiklerim</h2>
          <span>{favorites.length} favori</span>
        </div>
        {loading ? (
          <p className="empty-state">Favoriler yükleniyor…</p>
        ) : favorites.length ? (
          <ul className="document-list">
            {favorites.map((item) => (
              <li key={item.id}>
                <span className="document-icon favorite-icon">★</span>
                <div className="document-copy">
                  <Link
                    href={`/workspaces/${workspaceId}/documents?open=${item.id}`}
                  >
                    <b>{item.title}</b>
                  </Link>
                  <small>
                    <i
                      className="category-color small-dot"
                      style={{
                        backgroundColor: item.category.color ?? "#68a881",
                      }}
                    />
                    {item.category.name} ·{" "}
                    {new Intl.DateTimeFormat("tr-TR", {
                      dateStyle: "medium",
                    }).format(new Date(item.favoritedAt))}
                  </small>
                </div>
                <button
                  className="button-quiet danger-text"
                  type="button"
                  onClick={() => void remove(item.id)}
                >
                  Favoriden çıkar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <span>☆</span>
            <h3>Henüz favoriniz yok</h3>
            <p>
              Bir dokümanı açıp yıldız simgesini seçtiğinizde burada görünür.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
