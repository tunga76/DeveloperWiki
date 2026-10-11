import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Developer Wiki",
  description: "Technical knowledge for your team, in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        <Link className="skip-link" href="#main-content">
          İçeriğe geç
        </Link>
        {children}
      </body>
    </html>
  );
}
