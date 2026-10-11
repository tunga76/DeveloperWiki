"use client";

import Link from "next/link";
import AccountMenu from "../../../account-menu";
import {
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

type Category = { id: string; name: string; color: string | null };
type DocumentItem = {
  id: string;
  title: string;
  slug: string;
  updatedAt: string;
  content?: string;
  categoryId?: string;
  category: Category;
};
type Failure = { error?: { message?: string } };
type Version = {
  id: string;
  version: number;
  title: string;
  content: string;
  createdAt: string;
  createdById: string;
};

function safeMarkdownLink(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    return ["http:", "https:", "mailto:"].includes(parsed.protocol)
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const inline = (text: string) =>
    text
      .split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g)
      .map((part, index) => {
        if (part.startsWith("`") && part.endsWith("`"))
          return <code key={index}>{part.slice(1, -1)}</code>;
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={index}>{part.slice(1, -1)}</em>;
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          const label = link[1] ?? "";
          const href = link[2] ? safeMarkdownLink(link[2]) : null;
          return href ? (
            <a key={index} href={href} rel="noreferrer" target="_blank">
              {label}
            </a>
          ) : (
            label
          );
        }
        return part;
      });
  const lines = markdown.split("\n");
  const nodes: React.ReactNode[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index]?.startsWith("```")) {
        code.push(lines[index] ?? "");
        index += 1;
      }
      nodes.push(
        <pre key={`code-${index}`}>
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    const item = line.match(/^\s*[-*]\s+(.+)$/);
    if (item) {
      nodes.push(<li key={index}>{inline(item[1] ?? "")}</li>);
      continue;
    }
    if (!line.trim()) {
      nodes.push(<div className="preview-space" key={index} />);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const Tag = `h${heading[1]?.length ?? 1}` as "h1" | "h2" | "h3";
      nodes.push(<Tag key={index}>{inline(heading[2] ?? "")}</Tag>);
      continue;
    }
    nodes.push(<p key={index}>{inline(line)}</p>);
  }
  const grouped: React.ReactNode[] = [];
  let list: React.ReactNode[] = [];
  for (const node of nodes) {
    if (
      node &&
      typeof node === "object" &&
      "type" in node &&
      node.type === "li"
    )
      list.push(node);
    else {
      if (list.length) {
        grouped.push(<ul key={`list-${grouped.length}`}>{list}</ul>);
        list = [];
      }
      grouped.push(node);
    }
  }
  if (list.length) grouped.push(<ul key="list-end">{list}</ul>);
  return <div className="markdown-preview">{grouped}</div>;
}

async function getCsrf() {
  const response = await fetch("/api/v1/auth/csrf", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Güvenlik doğrulaması alınamadı.");
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

export default function DocumentListPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [history, setHistory] = useState<Version[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<DocumentItem | null>(null);

  const load = useCallback(async () => {
    const [categoryResponse, documentResponse] = await Promise.all([
      fetch(`/api/v1/workspaces/${workspaceId}/categories`, {
        credentials: "same-origin",
        cache: "no-store",
      }),
      fetch(`/api/v1/workspaces/${workspaceId}/documents?page=1&pageSize=50`, {
        credentials: "same-origin",
        cache: "no-store",
      }),
    ]);
    if (categoryResponse.status === 401 || documentResponse.status === 401) {
      window.location.replace("/login");
      return;
    }
    if (!categoryResponse.ok || !documentResponse.ok)
      throw new Error("Dokümanlar yüklenemedi.");
    const categoryData = (await categoryResponse.json()) as {
      categories: Category[];
    };
    const documentData = (await documentResponse.json()) as {
      documents: DocumentItem[];
    };
    setCategories(categoryData.categories);
    setDocuments(documentData.documents);
    if (!categoryId && categoryData.categories[0])
      setCategoryId(categoryData.categories[0].id);
  }, [workspaceId]);

  useEffect(() => {
    void load()
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Bağlantı kurulamadı."),
      )
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (loading || !documents.length) return;
    const requested = new URLSearchParams(window.location.search).get("open");
    if (!requested) return;
    window.history.replaceState(null, "", window.location.pathname);
    void openEditor({ id: requested });
  }, [loading, documents]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const token = await getCsrf();
      const response = await fetch(
        `/api/v1/workspaces/${workspaceId}/documents${editing ? `/${editing.id}` : ""}`,
        {
          method: editing ? "PATCH" : "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": token,
          },
          body: JSON.stringify(
            editing
              ? { title, content, expectedUpdatedAt: editing.updatedAt }
              : { title, categoryId },
          ),
        },
      );
      if (!response.ok) {
        const body = (await response.json()) as Failure;
        throw new Error(body.error?.message ?? "Doküman kaydedilemedi.");
      }
      setTitle("");
      setContent("");
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı kurulamadı.");
    } finally {
      setBusy(false);
    }
  }
  async function openEditor(document: Pick<DocumentItem, "id">) {
    setError("");
    try {
      const response = await fetch(
        `/api/v1/workspaces/${workspaceId}/documents/${document.id}`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok) throw new Error("Doküman açılamadı.");
      const data = (await response.json()) as { document: DocumentItem };
      setEditing(data.document);
      setTitle(data.document.title);
      setContent(data.document.content ?? "");
      setShowHistory(false);
      setHistory([]);
      const [favoriteResponse] = await Promise.all([
        fetch(
          `/api/v1/workspaces/${workspaceId}/documents/${document.id}/favorite`,
          { credentials: "same-origin", cache: "no-store" },
        ),
        (async () => {
          const token = await getCsrf();
          return fetch(
            `/api/v1/workspaces/${workspaceId}/documents/${document.id}/recent`,
            {
              method: "POST",
              credentials: "same-origin",
              headers: { "X-CSRF-Token": token },
            },
          );
        })(),
      ]);
      if (favoriteResponse.ok)
        setIsFavorite(
          ((await favoriteResponse.json()) as { isFavorite: boolean })
            .isFavorite,
        );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Doküman açılamadı.");
    }
  }
  async function toggleFavorite() {
    if (!editing) return;
    try {
      const token = await getCsrf();
      const response = await fetch(
        `/api/v1/workspaces/${workspaceId}/documents/${editing.id}/favorite`,
        {
          method: isFavorite ? "DELETE" : "POST",
          credentials: "same-origin",
          headers: { "X-CSRF-Token": token },
        },
      );
      if (!response.ok) throw new Error("Favori durumu güncellenemedi.");
      setIsFavorite(!isFavorite);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Favori durumu güncellenemedi.",
      );
    }
  }
  async function toggleHistory() {
    if (!editing) return;
    const next = !showHistory;
    setShowHistory(next);
    if (!next || history.length) return;
    try {
      const response = await fetch(
        `/api/v1/workspaces/${workspaceId}/documents/${editing.id}/versions`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok) throw new Error("Sürüm geçmişi alınamadı.");
      setHistory(((await response.json()) as { versions: Version[] }).versions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sürüm geçmişi alınamadı.");
    }
  }
  function insertMarkdown(before: string, after = "") {
    const textarea = editorRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || "metin";
    setContent(
      `${content.slice(0, start)}${before}${selected}${after}${content.slice(end)}`,
    );
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  }
  async function remove(document: DocumentItem) {
    if (!window.confirm(`“${document.title}” dokümanı arşivlensin mi?`)) return;
    setError("");
    try {
      const token = await getCsrf();
      const response = await fetch(
        `/api/v1/workspaces/${workspaceId}/documents/${document.id}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "X-CSRF-Token": token },
        },
      );
      if (!response.ok) throw new Error("Doküman arşivlenemedi.");
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
          <Link href={`/workspaces/${workspaceId}/categories`}>
            Kategoriler
          </Link>
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
          <h1>Dokümanlar</h1>
          <p>Workspace’inizin güncel teknik dokümantasyonu.</p>
        </div>
        <Link
          className="button button-primary"
          href={`/workspaces/${workspaceId}/categories`}
        >
          Kategorileri yönet →
        </Link>
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <div className="content-grid documents-grid">
        <section className="content-panel">
          <div className="panel-heading">
            <h2>Tüm dokümanlar</h2>
            <span>{documents.length} kayıt · son güncellenen</span>
          </div>
          {loading ? (
            <p className="empty-state">Dokümanlar yükleniyor…</p>
          ) : documents.length === 0 ? (
            <div className="empty-state">
              <span>▤</span>
              <h3>Henüz doküman yok</h3>
              <p>Bir kategori seçip ilk teknik notunuzu oluşturun.</p>
            </div>
          ) : (
            <ul className="document-list">
              {documents.map((document) => (
                <li key={document.id}>
                  <span className="document-icon">▤</span>
                  <div className="document-copy">
                    <b>{document.title}</b>
                    <small>
                      <span
                        className="category-color small-dot"
                        style={{
                          backgroundColor: document.category.color ?? "#68a881",
                        }}
                      />
                      {document.category.name} ·{" "}
                      {new Intl.DateTimeFormat("tr-TR", {
                        dateStyle: "medium",
                      }).format(new Date(document.updatedAt))}
                    </small>
                  </div>
                  <button
                    className="button-quiet"
                    type="button"
                    onClick={() => {
                      void openEditor(document);
                    }}
                  >
                    Düzenle
                  </button>
                  <button
                    className="button-quiet danger-text"
                    type="button"
                    onClick={() => void remove(document)}
                  >
                    Arşivle
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="field-help editor-note">
            Bir dokümanı açarak Markdown editörüne ve sürüm geçmişine erişin.
          </p>
        </section>
        <section className="content-panel category-form-panel">
          <div className="panel-heading">
            <h2>{editing ? "Doküman editörü" : "Yeni doküman"}</h2>
            {editing && (
              <div className="editor-actions">
                <button
                  className="inline-button"
                  type="button"
                  onClick={() => void toggleFavorite()}
                >
                  {isFavorite ? "★ Favoride" : "☆ Favoriye ekle"}
                </button>
                <button
                  className="inline-button"
                  type="button"
                  onClick={() => void toggleHistory()}
                >
                  {showHistory ? "Geçmişi gizle" : "Sürüm geçmişi"}
                </button>
                <button
                  className="inline-button"
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setTitle("");
                    setContent("");
                    setShowHistory(false);
                  }}
                >
                  Kapat
                </button>
              </div>
            )}
          </div>
          <form onSubmit={(event) => void save(event)}>
            <div className="field">
              <label htmlFor="document-title">Başlık</label>
              <input
                id="document-title"
                required
                minLength={2}
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Örn. Servis dağıtım rehberi"
              />
            </div>
            {!editing && (
              <div className="field">
                <label htmlFor="document-category">Kategori</label>
                <select
                  id="document-category"
                  required
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                >
                  <option value="" disabled>
                    Kategori seçin
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="field-help">Önce bir kategori oluşturun.</p>
                )}
              </div>
            )}
            {editing && (
              <>
                <div
                  className="markdown-toolbar"
                  aria-label="Markdown araçları"
                >
                  <button type="button" onClick={() => insertMarkdown("# ")}>
                    H1
                  </button>
                  <button type="button" onClick={() => insertMarkdown("## ")}>
                    H2
                  </button>
                  <button type="button" onClick={() => insertMarkdown("### ")}>
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("**", "**")}
                  >
                    <b>B</b>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("*", "*")}
                  >
                    <i>I</i>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("`", "`")}
                  >
                    Kod
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("```\n", "\n```")}
                  >
                    Kod bloğu
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("[", "](https://)")}
                  >
                    Bağlantı
                  </button>
                  <button type="button" onClick={() => insertMarkdown("- ")}>
                    • Liste
                  </button>
                </div>
                <div className="editor-preview-grid">
                  <div className="field">
                    <label htmlFor="document-content">Markdown</label>
                    <textarea
                      ref={editorRef}
                      id="document-content"
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      rows={18}
                      maxLength={500000}
                      spellCheck={false}
                      placeholder="# Başlık\n\nTeknik notlarınızı burada yazın…"
                    />
                  </div>
                  <section className="preview-pane">
                    <div className="preview-label">ÖNİZLEME</div>
                    <MarkdownPreview markdown={content} />
                  </section>
                </div>
                {showHistory && (
                  <aside className="version-panel">
                    <div className="panel-heading">
                      <h3>Sürüm geçmişi</h3>
                      <span>Salt okunur</span>
                    </div>
                    {history.length ? (
                      <ul>
                        {history.map((version) => (
                          <li key={version.id}>
                            <b>
                              v{version.version} · {version.title}
                            </b>
                            <small>
                              {new Intl.DateTimeFormat("tr-TR", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }).format(new Date(version.createdAt))}
                            </small>
                            <pre>{version.content}</pre>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="field-help">
                        İçerik değiştiğinde ilk sürüm burada görünür.
                      </p>
                    )}
                  </aside>
                )}
              </>
            )}
            <button
              className="button button-primary submit-button"
              type="submit"
              disabled={busy || (!editing && categories.length === 0)}
            >
              {busy
                ? "Kaydediliyor…"
                : editing
                  ? "Dokümanı kaydet"
                  : "Doküman oluştur"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
