import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASY — social media on autopilot",
  description: "Draft, schedule and auto-publish social media posts for your business.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
