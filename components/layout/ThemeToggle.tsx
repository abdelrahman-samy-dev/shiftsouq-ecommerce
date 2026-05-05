"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={`btn-icon ${className || ''}`} />;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`btn-icon relative overflow-hidden group ${className || ''}`}
      aria-label="Toggle Theme"
    >
      {/* Animated Background Blob */}
      <div className="absolute inset-0 bg-surface-elevated rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300 origin-center opacity-50"></div>

      <div className="relative flex items-center justify-center w-full h-full">
        {/* Sun Icon */}
        <Sun 
          className={`absolute h-5 w-5 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isDark ? "rotate-[180deg] scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          }`} 
          strokeWidth={2} 
        />
        
        {/* Moon Icon */}
        <Moon 
          className={`absolute h-[18px] w-[18px] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-[180deg] scale-0 opacity-0"
          }`} 
          strokeWidth={2.5} 
        />
      </div>
    </button>
  );
}
