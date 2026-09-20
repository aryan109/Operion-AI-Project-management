"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Calendar,
  FileText,
  Plug,
  Settings,
  Sparkles,
  Plus,
  Radio,
} from "lucide-react";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCommandBar: () => void;
  onOpenQuickAction: () => void;
}

export function MobileDrawer({
  isOpen,
  onClose,
  onOpenCommandBar,
  onOpenQuickAction,
}: MobileDrawerProps) {
  const pathname = usePathname();

  // Close drawer on path change
  useEffect(() => {
    onClose();
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
      />

      {/* Drawer content */}
      <div className="fixed top-0 bottom-0 left-0 w-4/5 max-w-xs bg-[#0a0e17] border-r border-slate-800 p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-250 z-10 overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-800">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/25">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1">
                  OPERION
                  <span className="text-[9px] uppercase font-semibold px-1 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    AI
                  </span>
                </span>
                <p className="text-[10px] text-slate-400 font-medium">Autonomous Project OS</p>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick AI & Action triggers */}
          <div className="grid grid-cols-2 gap-2 my-4">
            <button
              onClick={() => {
                onClose();
                onOpenCommandBar();
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold hover:bg-indigo-600/30 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ask AI</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenQuickAction();
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 hover:bg-indigo-500 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1 mt-2">
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
                  prefetch={true}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                    isActive
                      ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info: MCP status */}
        <div className="pt-4 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live MCP Server
              </span>
              <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Autonomous AI agent operations at <code className="text-slate-300">/api/mcp</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
