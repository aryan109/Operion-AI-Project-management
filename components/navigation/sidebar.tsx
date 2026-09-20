"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Calendar,
  Sparkles,
  Settings,
  FileText,
  ShieldCheck,
  Plug,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Projects", href: "/projects", icon: FolderKanban },
    { label: "My Work", href: "/my-work", icon: CheckSquare },
    { label: "Today", href: "/today", icon: Calendar },
    { label: "Reports", href: "/reports", icon: FileText },
    { label: "Connectors", href: "/connectors", icon: Plug },
    { label: "Settings & API", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-[#0a0e17]/95 flex flex-col justify-between py-5 px-3 min-h-screen sticky top-0">
      <div>
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 px-3 py-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
              OPERION
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                AI
              </span>
            </span>
            <p className="text-[11px] text-slate-400 font-medium">Autonomous Project OS</p>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold shadow-sm shadow-indigo-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer info: MCP & Status */}
      <div className="pt-4 border-t border-slate-800/60 px-3">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              MCP Server
            </span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
              v1.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            AI agents operating via JSON-RPC at <code className="text-slate-300">/api/mcp</code>
          </p>
        </div>
      </div>
    </aside>
  );
}
