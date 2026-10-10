import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voice MOM — voice notes to Minutes of Meeting",
  description:
    "Record a voice note or meeting and get a clean transcript, summary, and action items, powered by OpenRouter.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
