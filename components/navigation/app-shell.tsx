"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileDrawer } from "./mobile-drawer";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { ProgressBar } from "./progress-bar";
import { CommandBar } from "../ai/command-bar";
import { QuickActionModal } from "../quick-actions-modal";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  return (
    <div className="bg-[#07090e] text-slate-100 flex min-h-screen">
      {/* Route Navigation Glow Progress Bar */}
      <ProgressBar />

      {/* Desktop Fixed Left Navigation Sidebar */}
      <Sidebar />

      {/* Slide-in Mobile Navigation Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpenCommandBar={() => setIsCommandBarOpen(true)}
        onOpenQuickAction={() => setIsQuickActionOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header onOpenDrawer={() => setIsDrawerOpen(true)} />

        {/* Page Content with responsive padding & safe-area clearance for bottom nav */}
        <main className="flex-1 px-3.5 py-4 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <MobileBottomNav onOpenDrawer={() => setIsDrawerOpen(true)} />

      {/* Shared Modals triggered from drawer or header */}
      {isCommandBarOpen && (
        <CommandBar
          isOpen={isCommandBarOpen}
          onClose={() => setIsCommandBarOpen(false)}
        />
      )}

      {isQuickActionOpen && (
        <QuickActionModal
          isOpen={isQuickActionOpen}
          onClose={() => setIsQuickActionOpen(false)}
        />
      )}
    </div>
  );
}
