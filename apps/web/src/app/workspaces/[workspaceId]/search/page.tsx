"use client";
import Link from "next/link";
import AccountMenu from "../../../account-menu";
import { use, useState, type FormEvent } from "react";

type Result = {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  snippet: string;
  updatedAt: string;
  rank: number;
};
export default function SearchPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSearched(true);
    try {
      const response = await fetch(
        `/api/v1/workspaces/${workspaceId}/search?q=${encodeURIComponent(query)}&limit=20`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }
      const data = (await response.json()) as {
        error?: { message?: string };
        results?: Result[];
      };
      if (!response.ok)
        throw new Error(data.error?.message ?? "Arama tamamlanamadı.");
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı kurulamadı.");
      setResults([]);
    } finally {
      setBusy(false);
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
          <Link href={`/workspaces/${workspaceId}/favorites`}>Favoriler</Link>
        </nav>
        <AccountMenu />
      </header>
      <div className="content-heading">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-dot" /> WORKSPACE ARAMASI
          </p>
          <h1>Bilgiyi bulun</h1>
          <p>Başlıklar ve Markdown içeriğinde arayın.</p>
        </div>
      </div>
      <form className="search-form" onSubmit={(event) => void search(event)}>
        <span aria-hidden="true">⌕</span>
        <input
          autoFocus
          aria-label="Arama sorgusu"
          minLength={2}
          maxLength={100}
          required
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Örn. deployment, architecture…"
        />
        <button className="button button-primary" disabled={busy} type="submit">
          {busy ? "Aranıyor…" : "Ara"}
        </button>
      </form>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {searched && !busy && !error && (
        <section className="content-panel search-results">
          <div className="panel-heading">
            <h2>Arama sonuçları</h2>
            <span>{results.length} sonuç · en fazla 20</span>
          </div>
          {results.length ? (
            <ul className="document-list">
              {results.map((result) => (
                <li key={result.id}>
                  <span className="document-icon">⌕</span>
                  <div className="document-copy">
                    <Link
                      href={`/workspaces/${workspaceId}/documents?open=${result.id}`}
                    >
                      <b>{result.title}</b>
                    </Link>
                    <small>
                      <i
                        className="category-color small-dot"
                        style={{
                          backgroundColor: result.categoryColor ?? "#68a881",
                        }}
                      />
                      {result.categoryName} ·{" "}
                      {new Intl.DateTimeFormat("tr-TR", {
                        dateStyle: "medium",
                      }).format(new Date(result.updatedAt))}
                    </small>
                    <p className="search-snippet">{result.snippet}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <span>⌕</span>
              <h3>Sonuç bulunamadı</h3>
              <p>Başka kelimelerle aramayı deneyin.</p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
