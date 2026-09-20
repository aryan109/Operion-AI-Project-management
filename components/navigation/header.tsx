"use client";

import { Search, Sparkles, Plus, Terminal, Menu } from "lucide-react";
import { useState } from "react";
import { CommandBar } from "../ai/command-bar";
import { QuickActionModal } from "../quick-actions-modal";

interface HeaderProps {
  onOpenDrawer?: () => void;
}

export function Header({ onOpenDrawer }: HeaderProps) {
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);

  return (
    <>
      <header className="h-16 border-b border-slate-800/80 bg-[#07090e]/85 backdrop-blur-md px-3.5 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        {/* Mobile: Hamburger & Brand */}
        <div className="flex items-center gap-2.5 md:hidden">
          <button
            onClick={onOpenDrawer}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            aria-label="Open mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm tracking-tight text-white">OPERION</span>
            <span className="text-[9px] uppercase font-bold px-1 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              AI
            </span>
          </div>
        </div>

        {/* Desktop: Workspace Title & Search Bar */}
        <div className="hidden md:flex items-center gap-4 flex-1 max-w-xl">
          <button
            onClick={() => setCommandBarOpen(true)}
            className="flex items-center justify-between w-full max-w-md px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-700 transition"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-400" />
              <span>Search projects, tasks, or ask AI...</span>
            </div>
            <kbd className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Search Button */}
          <button
            onClick={() => setCommandBarOpen(true)}
            className="md:hidden p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* AI Command Center Trigger */}
          <button
            onClick={() => setCommandBarOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-cyan-600/20 border border-indigo-500/30 text-indigo-300 text-xs sm:text-sm font-semibold hover:border-indigo-500/50 hover:text-indigo-200 transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400 animate-pulse" />
            <span className="hidden sm:inline">AI Command Bar</span>
            <span className="sm:hidden">AI</span>
          </button>

          {/* Quick Create Button */}
          <button
            onClick={() => setQuickActionOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition shadow-md shadow-indigo-600/25"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Action</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </header>

      {/* AI Command Bar Modal */}
      {commandBarOpen && (
        <CommandBar isOpen={commandBarOpen} onClose={() => setCommandBarOpen(false)} />
      )}

      {/* Quick Action Modal */}
      {quickActionOpen && (
        <QuickActionModal isOpen={quickActionOpen} onClose={() => setQuickActionOpen(false)} />
      )}
    </>
  );
}
