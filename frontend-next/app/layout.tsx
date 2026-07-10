import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SportsWorld",
  description: "AI-powered sports platform",
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
