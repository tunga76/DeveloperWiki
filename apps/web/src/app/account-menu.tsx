"use client";

import Link from "next/link";
import { useState } from "react";
import ThemeToggle from "./theme-toggle";

export default function AccountMenu() {
  const [error, setError] = useState("");

  async function logout() {
    setError("");
    try {
      const csrf = await fetch("/api/v1/auth/csrf", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!csrf.ok) throw new Error("Güvenlik doğrulaması alınamadı.");
      const { csrfToken } = (await csrf.json()) as { csrfToken: string };
      const response = await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": csrfToken },
      });
      if (!response.ok) throw new Error("Oturum kapatılamadı.");
      window.location.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı kurulamadı.");
    }
  }

  return (
    <div className="account-menu">
      <Link href="/profile">Profil</Link>
      <ThemeToggle />
      <button className="account-action" type="button" onClick={logout}>
        Çıkış yap
      </button>
      {error && (
        <span className="account-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
