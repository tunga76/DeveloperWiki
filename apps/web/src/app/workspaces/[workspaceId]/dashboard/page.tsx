"use client";
import Link from "next/link";
import AccountMenu from "../../../account-menu";
import { use, useEffect, useState } from "react";

type Category = { id: string; name: string; color: string | null };
type DocumentItem = {
  id: string;
  title: string;
  slug: string;
  updatedAt: string;
  lastViewedAt?: string;
  category: Category;
};
type Dashboard = {
  role: string;
  counts: {
    documents: number;
    categories: number;
    members: number;
    favorites: number;
  };
  latestDocuments: DocumentItem[];
  recentDocuments: DocumentItem[];
};

export default function DashboardPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void fetch(`/api/v1/workspaces/${workspaceId}/dashboard`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.replace("/login");
          return;
        }
        if (!response.ok) throw new Error("Dashboard yüklenemedi.");
        setData((await response.json()) as Dashboard);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Bağlantı kurulamadı."),
      )
      .finally(() => setLoading(false));
  }, [workspaceId]);
  const docHref = (id: string) =>
    `/workspaces/${workspaceId}/documents?open=${id}`;
  return (
    <main className="content-shell" id="main-content">
      <header className="content-topbar">
        <Link className="brand" href="/workspace/new">
          <span className="brand-mark">D</span> DevWiki
        </Link>
        <nav>
          <Link href={`/workspaces/${workspaceId}/documents`}>Dokümanlar</Link>
          <Link href={`/workspaces/${workspaceId}/categories`}>
            Kategoriler
          </Link>
          <Link href={`/workspaces/${workspaceId}/search`}>Ara</Link>
          <Link href={`/workspaces/${workspaceId}/favorites`}>Favoriler</Link>
          <Link href="/workspace/new">Workspace’ler</Link>
        </nav>
        <AccountMenu />
      </header>
      <div className="content-heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-dot" /> GENEL BAKIŞ
          </p>
          <h1>Workspace’iniz</h1>
          <p>Ekibinizin son dokümanları ve çalışma alanı özeti.</p>
        </div>
        <Link
          className="button button-primary"
          href={`/workspaces/${workspaceId}/documents`}
        >
          Doküman oluştur →
        </Link>
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <p className="empty-state">Workspace yükleniyor…</p>
      ) : (
        data && (
          <>
            <section className="dashboard-stats">
              <div>
                <small>TOPLAM DOKÜMAN</small>
                <b>{data.counts.documents}</b>
              </div>
              <div>
                <small>KATEGORİ</small>
                <b>{data.counts.categories}</b>
              </div>
              <div>
                <small>EKİP ÜYESİ</small>
                <b>{data.counts.members}</b>
              </div>
              <div>
                <small>FAVORİLERİM</small>
                <b>{data.counts.favorites}</b>
              </div>
            </section>
            <div className="content-grid dashboard-grid">
              <section className="content-panel">
                <div className="panel-heading">
                  <h2>Son güncellenenler</h2>
                  <Link
                    className="inline-button"
                    href={`/workspaces/${workspaceId}/documents`}
                  >
                    Tüm dokümanlar →
                  </Link>
                </div>
                {data.latestDocuments.length ? (
                  <ul className="document-list">
                    {data.latestDocuments.map((doc) => (
                      <li key={doc.id}>
                        <span className="document-icon">▤</span>
                        <div className="document-copy">
                          <Link href={docHref(doc.id)}>
                            <b>{doc.title}</b>
                          </Link>
                          <small>
                            <i
                              className="category-color small-dot"
                              style={{
                                backgroundColor:
                                  doc.category.color ?? "#68a881",
                              }}
                            />
                            {doc.category.name} ·{" "}
                            {new Intl.DateTimeFormat("tr-TR", {
                              dateStyle: "medium",
                            }).format(new Date(doc.updatedAt))}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-state">
                    <span>▤</span>
                    <h3>Henüz doküman yok</h3>
                    <p>İlk teknik notunuzu oluşturarak başlayın.</p>
                  </div>
                )}
              </section>
              <section className="content-panel">
                <div className="panel-heading">
                  <h2>Son görüntülenenler</h2>
                </div>
                {data.recentDocuments.length ? (
                  <ul className="document-list">
                    {data.recentDocuments.map((doc) => (
                      <li key={doc.id}>
                        <span className="document-icon">◷</span>
                        <div className="document-copy">
                          <Link href={docHref(doc.id)}>
                            <b>{doc.title}</b>
                          </Link>
                          <small>
                            {doc.category.name} ·{" "}
                            {doc.lastViewedAt
                              ? new Intl.DateTimeFormat("tr-TR", {
                                  dateStyle: "medium",
                                }).format(new Date(doc.lastViewedAt))
                              : ""}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-state">
                    <p>Açtığınız dokümanlar burada görünecek.</p>
                  </div>
                )}
              </section>
            </div>
          </>
        )
      )}
    </main>
  );
}
