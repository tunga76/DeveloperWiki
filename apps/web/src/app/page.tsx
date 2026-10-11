import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing-shell" id="main-content">
      <nav className="topbar">
        <Link className="brand" href="/">
          {" "}
          <span className="brand-mark">D</span> DevWiki
        </Link>
        <div className="nav-actions">
          <Link className="button button-quiet" href="/login">
            Giriş yap
          </Link>
          <Link className="button button-primary" href="/register">
            Ücretsiz başla <span aria-hidden="true">→</span>
          </Link>
        </div>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="eyebrow-dot" /> EKİBİNİZİN TEKNİK HAFIZASI
          </p>
          <h1>
            Bilgi dağılmasın.
            <br />
            <span>İşiniz hızlansın.</span>
          </h1>
          <p className="hero-description">
            Mimari kararlar, kurulum rehberleri ve operasyon bilgisi. Ekibinizin
            aradığı her şey, güvenli bir workspace’te.
          </p>
          <div className="hero-actions">
            <Link
              className="button button-primary button-large"
              href="/register"
            >
              Workspace’inizi oluşturun <span aria-hidden="true">→</span>
            </Link>
            <Link className="text-link" href="/login">
              Zaten hesabınız var mı? Giriş yapın
            </Link>
          </div>
          <div className="trust-row">
            <span className="avatar-stack">
              <i>AY</i>
              <i>MK</i>
              <i>ED</i>
            </span>
            <span>Teknik ekipler için sade ve güvenli bilgi merkezi</span>
          </div>
        </div>
        <div
          className="preview-wrap"
          aria-label="Developer Wiki arayüz önizlemesi"
        >
          <div className="preview-glow" />
          <div className="preview-window">
            <div className="preview-bar">
              <div className="window-dots">
                <i />
                <i />
                <i />
              </div>
              <span>acme.devwiki.app</span>
              <span className="preview-status">● Workspace</span>
            </div>
            <div className="preview-app">
              <aside className="preview-sidebar">
                <div className="preview-workspace">
                  <span className="workspace-icon">A</span>
                  <span>
                    <b>Acme Engineering</b>
                    <small>Ücretsiz plan</small>
                  </span>
                  <span className="chevron">⌄</span>
                </div>
                <small className="side-label">ÇALIŞMA ALANI</small>
                <div className="side-item active">
                  <span>▦</span> Genel bakış
                </div>
                <div className="side-item">
                  <span>▤</span> Dokümanlar <b className="side-count">12</b>
                </div>
                <div className="side-item">
                  <span>◫</span> Kategoriler
                </div>
                <div className="side-item">
                  <span>☆</span> Favoriler
                </div>
                <small className="side-label side-label-spaced">
                  KATEGORİLER <span>＋</span>
                </small>
                <div className="category-item">
                  <i className="cat-dot purple" /> Mimari
                </div>
                <div className="category-item">
                  <i className="cat-dot blue" /> Başlangıç
                </div>
                <div className="category-item">
                  <i className="cat-dot green" /> Operasyon
                </div>
                <div className="preview-user">
                  <span className="user-avatar">JD</span>
                  <span>
                    <b>Jamie Doe</b>
                    <small>Yönetici</small>
                  </span>
                  <span className="chevron">···</span>
                </div>
              </aside>
              <div className="preview-content">
                <div className="preview-toolbar">
                  <span>Genel bakış</span>
                  <span>
                    ⌕　Ara　 <kbd>⌘ K</kbd>
                  </span>
                </div>
                <div className="welcome-line">
                  <div>
                    <small>PAZARTESİ, 12 EKİM 2026</small>
                    <h3>
                      Günaydın Jamie <span>✦</span>
                    </h3>
                    <p>Ekibinizin teknik bilgisini keşfedin.</p>
                  </div>
                  <span className="welcome-spark">✳</span>
                </div>
                <div className="stats-grid">
                  <div>
                    <small>TOPLAM DOKÜMAN</small>
                    <b>
                      24 <span>↗</span>
                    </b>
                    <em>Bu ay +4</em>
                  </div>
                  <div>
                    <small>KATEGORİ</small>
                    <b>6</b>
                    <em>İyi organize edilmiş</em>
                  </div>
                  <div>
                    <small>EKİP ÜYESİ</small>
                    <b>8</b>
                    <em>Aktif workspace</em>
                  </div>
                </div>
                <div className="recent-heading">
                  <b>Son dokümanlar</b>
                  <span>Tümünü gör →</span>
                </div>
                <div className="doc-preview">
                  <span className="doc-icon purple-doc">⌘</span>
                  <span>
                    <b>System Architecture Overview</b>
                    <small>Mimari · Jamie Doe · 2 saat önce</small>
                  </span>
                  <span className="doc-tag">Güncellendi</span>
                </div>
                <div className="doc-preview">
                  <span className="doc-icon blue-doc">↗</span>
                  <span>
                    <b>Local Development Setup</b>
                    <small>Başlangıç · Alex Kim · Dün</small>
                  </span>
                  <span className="doc-tag muted-tag">Markdown</span>
                </div>
                <div className="doc-preview">
                  <span className="doc-icon green-doc">⌁</span>
                  <span>
                    <b>Production Deployment Guide</b>
                    <small>Operasyon · Sam Lee · 3 gün önce</small>
                  </span>
                  <span className="doc-tag muted-tag">Markdown</span>
                </div>
              </div>
            </div>
          </div>
          <div className="floating-note">
            <span>✦</span>
            <b>Bilgi, doğru yerde.</b>
            <small>Ekibiniz için tek kaynak.</small>
          </div>
        </div>
      </section>
      <section className="feature-strip">
        <span>
          <b>⌕</b> Hızlı ve güçlü arama
        </span>
        <span>
          <b>▣</b> Düzenli workspace’ler
        </span>
        <span>
          <b>♧</b> Rol tabanlı erişim
        </span>
        <span>
          <b>↗</b> Her zaman güncel
        </span>
      </section>
      <footer className="landing-footer">
        <span>© 2026 DevWiki</span>
        <span>Teknik bilgi, ekip işi.</span>
      </footer>
    </main>
  );
}
