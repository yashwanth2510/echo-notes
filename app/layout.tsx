import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Echo Notes — voice notes to Minutes of Meeting",
  description:
    "Record a voice note or meeting and get a clean transcript, summary, and action items — everything runs on your device, free and offline.",
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
