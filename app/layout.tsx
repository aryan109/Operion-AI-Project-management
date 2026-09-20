import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/navigation/sidebar";
import { Header } from "@/components/navigation/header";

export const metadata: Metadata = {
  title: "Operion — AI-Native Project OS",
  description: "Autonomous, lightweight AI-driven project management system operating via MCP and modern web UI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#07090e] text-slate-100 flex min-h-screen">
        {/* Left Fixed Navigation Sidebar */}
        <Sidebar />

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
