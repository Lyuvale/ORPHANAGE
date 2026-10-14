import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";

// Fonti za kuendeleza design system (globals.css hutumia var(--font-orphanage-*)).
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-orphanage-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-orphanage-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Children's Care Platform",
  description: "Children's Care Management & Accountability Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${inter.variable}`}>
      <body className="antialiased">
    {/* Tokens yenyewe hutolewa kwenye globals.css; layout hu-wire fonts tu.
        Usiongeze headers/gradiants za body baada ya globals.css body rules. */}
    {children}
  </body>
    </html>
  );
}
