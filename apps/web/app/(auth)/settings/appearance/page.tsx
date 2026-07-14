"use client";

import { useState, useEffect } from "react";
import { Monitor, Sun, Moon } from "lucide-react";

type Theme = "system" | "light" | "dark";

const THEMES: { value: Theme; label: string; description: string; icon: typeof Sun }[] = [
  {
    value: "system",
    label: "System default",
    description: "Follow this device setting.",
    icon: Monitor,
  },
  {
    value: "light",
    label: "Light",
    description: "Use the light theme.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Use the dark theme.",
    icon: Moon,
  },
];

export default function AppearancePage() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("aryasdr-theme") as Theme | null;
    if (saved && ["system", "light", "dark"].includes(saved)) {
      setTheme(saved);
    }
  }, []);

  function handleChange(value: Theme) {
    setTheme(value);
    localStorage.setItem("aryasdr-theme", value);

    const root = document.documentElement;
    if (value === "dark") {
      root.classList.add("dark");
    } else if (value === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Appearance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Choose how AryaSDR looks on this device.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-2">
        <h2 className="text-base font-semibold text-gray-900">Theme</h2>
        <p className="text-sm text-gray-500 mb-4">
          Select a theme preference for your workspace.
        </p>

        <div className="space-y-3">
          {THEMES.map(({ value, label, description, icon: Icon }) => {
            const isActive = theme === value;
            return (
              <button
                key={value}
                onClick={() => handleChange(value)}
                className={`w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                  isActive
                    ? "border-violet-600 bg-violet-50/30"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    isActive ? "border-violet-600" : "border-gray-300"
                  }`}
                >
                  {isActive && (
                    <div className="h-2.5 w-2.5 rounded-full bg-violet-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-900">
                    {label}
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    {description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
