/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        zen: {
          bg: "#fcfaf8",
          "text-main": "rgb(45 42 38 / <alpha-value>)",
          "text-sub": "rgb(120 113 108 / <alpha-value>)",
          indigo: "rgb(99 102 241 / <alpha-value>)",
          amber: "rgb(217 119 6 / <alpha-value>)",
        },
        charcoal: {
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
        primary: "#6366f1",
        secondary: "#8b5cf6",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "serif"],
        sans: ["Manrope", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        "soft-depth": "0 20px 40px -10px rgba(99, 102, 241, 0.05), 0 10px 20px -5px rgba(0, 0, 0, 0.02)",
        "sphere-glow": "0 0 80px 20px rgba(99, 102, 241, 0.15), inset 0 0 40px 10px rgba(255, 255, 255, 0.6)",
        "glass-card": "0 8px 32px rgba(0, 0, 0, 0.08)",
        "glass-card-hover": "0 12px 40px rgba(99, 102, 241, 0.12)",
      },
      animation: {
        "pulse-slow": "pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 8s ease-in-out infinite",
        "spin-slow": "spin 60s linear infinite",
        "spin-reverse-slow": "spin 45s linear infinite reverse",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
      },
    },
  },
  plugins: [],
};
