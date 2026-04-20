"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useUi } from "@/contexts/UiContext";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

interface Props {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, title, subtitle }: Props) {
  const { user, loading } = useAuth();
  const { lang, theme, toggleLang, toggleTheme } = useUi();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg0)" }}>
        <span style={{ color: "var(--tx2)" }}>جاري التحميل…</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar lang={lang} theme={theme} onToggleLang={toggleLang} onToggleTheme={toggleTheme} />
      <main className="main">
        <Topbar title={title} subtitle={subtitle} />
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--pad)", background: "var(--bg0)" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
