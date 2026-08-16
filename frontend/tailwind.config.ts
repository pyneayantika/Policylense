import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f0eee9",
        foreground: "#1a1a1a",
        primary: {
          DEFAULT: "#1a6b5a",
          dark: "#0f2922",
          accent: "#1a4a3a",
          hover: "#145447",
        },
        safe: {
          DEFAULT: "#22c55e",
          bg: "#f0faf7",
          border: "#d0ece5",
          text: "#1a6b5a",
        },
        warning: {
          DEFAULT: "#f59e0b",
          bg: "#fffbeb",
          border: "#fde68a",
          text: "#d97706",
        },
        critical: {
          DEFAULT: "#ef4444",
          bg: "#fef2f2",
          border: "#fecaca",
          text: "#dc2626",
        },
        info: {
          DEFAULT: "#3b82f6",
          bg: "#f0f4ff",
          border: "#dbeafe",
          text: "#1e40af",
        },
        dark: "#1a1a1a",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;

