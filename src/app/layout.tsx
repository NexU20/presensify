import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Presensify",
  description:
    "Single-page presensi assistant untuk login, ambil foto kamera, konversi WebP, dan kirim request presensi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
