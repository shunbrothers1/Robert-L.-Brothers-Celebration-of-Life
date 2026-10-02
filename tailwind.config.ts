import type { Config } from "tailwindcss";

// Celebration of Life palette, matching the service colors: navy blue for
// headings and actions, soft light-blue ("mist") backgrounds, white cards,
// and gold accents.
const config: Config = {
  content: ["./src/app/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        mist: {
          DEFAULT: "#f2f6fb",
          50: "#fbfcfe",
          100: "#f2f6fb",
          200: "#e3ecf7",
          300: "#cddcef",
          400: "#b3c8e3",
        },
        navy: {
          50: "#eef3fa",
          100: "#dce6f3",
          200: "#bccde6",
          300: "#93afd6",
          500: "#3a5c91",
          600: "#26467a",
          700: "#1b3561",
          800: "#13284b",
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
          DEFAULT: "#1a2740",
          50: "#24324d",
          100: "#1a2740",
          200: "#111b2e",
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
