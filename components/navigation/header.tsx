"use client";

import { Search, Sparkles, Plus, Terminal } from "lucide-react";
import { useState } from "react";
import { CommandBar } from "../ai/command-bar";
import { QuickActionModal } from "../quick-actions-modal";

export function Header() {
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);

  return (
    <>
      <header className="h-16 border-b border-slate-800/80 bg-[#07090e]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        {/* Workspace Title & Search Bar */}
        <div className="flex items-center gap-4 flex-1 max-w-xl">
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
        <div className="flex items-center gap-3">
          {/* AI Command Center Trigger */}
          <button
            onClick={() => setCommandBarOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-cyan-600/20 border border-indigo-500/30 text-indigo-300 text-sm font-semibold hover:border-indigo-500/50 hover:text-indigo-200 transition shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>AI Command Bar</span>
          </button>

          {/* Quick Create Button */}
          <button
            onClick={() => setQuickActionOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-md shadow-indigo-600/25"
          >
            <Plus className="w-4 h-4" />
            <span>New Action</span>
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
