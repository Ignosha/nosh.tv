"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);
  function flip() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (next === "dark") document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("kl-theme", next);
    } catch {
      /* storage unavailable */
    }
  }
  return (
    <button type="button" className="theme-toggle" onClick={flip} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
      {theme === "light" ? "☾" : "☀"}
    </button>
  );
}
