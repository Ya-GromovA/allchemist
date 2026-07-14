import type { Metadata } from "next";
import "../../../packages/ui/src/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Allchemist Web Foundation",
  description: "Allchemist parallel non-production frontend foundation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
