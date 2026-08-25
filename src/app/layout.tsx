import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
