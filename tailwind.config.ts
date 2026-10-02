import type { Config } from "tailwindcss";

// Warm, respectful Celebration of Life palette: cream/ivory backgrounds,
// muted sage for actions, subtle gold accents, charcoal text.
const config: Config = {
  content: ["./src/app/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#fbf8f2",
          50: "#fdfcf9",
          100: "#fbf8f2",
          200: "#f3ede1",
          300: "#e8dfcc",
          400: "#d6cab2",
        },
        sage: {
          50: "#f2f5f0",
          100: "#e3eadf",
          200: "#c9d6c3",
          300: "#a9bba2",
          500: "#7a9172",
          600: "#62785b",
          700: "#4d6047",
          800: "#3d4d39",
        },
        gold: {
          DEFAULT: "#c6a35d",
          50: "#f7f0dd",
          100: "#ecd9ad",
          400: "#d3b471",
          500: "#c6a35d",
          600: "#a5824a",
          700: "#8a6c3d",
        },
        charcoal: {
          DEFAULT: "#232320",
          50: "#2c2c28",
          100: "#232320",
          200: "#1a1a18",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
