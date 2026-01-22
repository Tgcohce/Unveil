/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Cool Data-Driven Palette
        charcoal: {
          700: "#334155", // Main headline
          800: "#1E293B",
          900: "#0F172A",
        },
        tealGrey: {
          400: "#94A3B8",
          500: "#64748B", // Desaturated teal-grey for "Anonymity"
        },
        coolGrey: {
          50: "#F8FAFC",
          100: "#F1F5F9", // Very light cool grey
          200: "#E2E8F0", // Light grey for borders
          300: "#CBD5E1", // Mid-tone grey for borders
          400: "#94A3B8",
        },
        silverBlue: {
          100: "#E0E7FF",
          200: "#C7D2FE", // Highlights
        },
        // Original colors for compatibility
        primary: "#6366f1",
        secondary: "#8b5cf6",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Playfair Display", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      backgroundImage: {
        "cool-gradient": "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        "dark-gradient":
          "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
        "spin-slow": "spin 12s linear infinite",
        blob: "blob 10s infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
