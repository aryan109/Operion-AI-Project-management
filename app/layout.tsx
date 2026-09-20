import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/navigation/app-shell";

export const metadata: Metadata = {
  title: "Operion — AI-Native Project OS",
  description: "Autonomous, lightweight AI-driven project management system operating via MCP and modern web UI.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#07090e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#07090e] text-slate-100 min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
