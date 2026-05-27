import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        kitchen: { DEFAULT: "hsl(var(--kitchen))", foreground: "hsl(var(--kitchen-foreground))" },
        service: { DEFAULT: "hsl(var(--service))", foreground: "hsl(var(--service-foreground))" },
      },
      minHeight: { tap: "44px" },
      minWidth: { tap: "44px" },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
