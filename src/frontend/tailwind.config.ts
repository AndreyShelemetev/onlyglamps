import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f4fce4",
          100: "#e6f7c0",
          200: "#cdef85",
          300: "#a9dd3f",
          400: "#8dcc14",
          500: "#71BB00",
          600: "#5a9600",
          700: "#447100",
          800: "#365a00",
          900: "#2a4600",
        },
        accent: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#E95E02",
          600: "#c44e02",
          700: "#9a3412",
          800: "#7c2d12",
          900: "#6c2710",
        },
        navy: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
      },
    },
  },
  plugins: [],
  safelist: [
    'from-emerald-400', 'to-emerald-700',
    'from-orange-500', 'to-red-600',
    'from-sky-400', 'to-cyan-700',
    'from-amber-300', 'to-amber-600',
    'from-violet-400', 'to-indigo-700',
    'from-lime-400', 'to-green-700',
    'from-navy-500', 'to-navy-700',
  ],
};
export default config;
