import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        chrome: "#000000",
        surface: "#191A1B",
        panel: "#242728",
        "panel-2": "#303436",
        line: "#2F3234",
        "line-2": "#6A7275",
        text: "#FFFFFF",
        "text-2": "#B8BBBE",
        "text-3": "#818182",
        accent: "#EC5E31",
        positive: "#59C376",
        warn: "#F5C042",
        risk: "#E5484D",
        "neutral-bar": "#949B9E",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0",
        none: "0",
        sm: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        field: "2px",
        full: "9999px",
      },
      maxWidth: {
        shell: "1680px",
      },
    },
  },
  plugins: [],
};

export default config;
