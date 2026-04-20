"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Lang = "ar" | "en";
type Theme = "light" | "dark";

interface UiContextType {
  lang: Lang;
  theme: Theme;
  toggleLang: () => void;
  toggleTheme: () => void;
}

const UiContext = createContext<UiContextType | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");
  const [theme, setTheme] = useState<Theme>("light");

  // Load saved preferences
  useEffect(() => {
    const savedLang = (localStorage.getItem("smos_lang") as Lang) || "ar";
    const savedTheme = (localStorage.getItem("smos_theme") as Theme) || "light";
    setLang(savedLang);
    setTheme(savedTheme);
  }, []);

  // Apply on body + html
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    if (lang === "en") {
      body.classList.add("ltr");
      html.setAttribute("dir", "ltr");
      html.setAttribute("lang", "en");
    } else {
      body.classList.remove("ltr");
      html.setAttribute("dir", "rtl");
      html.setAttribute("lang", "ar");
    }

    if (theme === "dark") body.classList.add("dark");
    else body.classList.remove("dark");

    localStorage.setItem("smos_lang", lang);
    localStorage.setItem("smos_theme", theme);
  }, [lang, theme]);

  const toggleLang = () => setLang((l) => (l === "ar" ? "en" : "ar"));
  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <UiContext.Provider value={{ lang, theme, toggleLang, toggleTheme }}>
      {children}
    </UiContext.Provider>
  );
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi must be used inside UiProvider");
  return ctx;
}
