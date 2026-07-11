import type { Config } from "tailwindcss";

// shadcn/ui-style theme: CSS-variable-driven colors so light/dark mode is a
// single class toggle, not a duplicated color palette.
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-rubik)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // "Premium" layered shadows — soft, diffuse, with a subtle colored
        // glow option for accent surfaces — replacing the stock flat
        // shadow/shadow-sm everywhere a Card/panel wants real depth.
        soft: "0 2px 8px -2px rgb(0 0 0 / 0.15), 0 8px 24px -4px rgb(0 0 0 / 0.25)",
        premium: "0 4px 16px -4px rgb(0 0 0 / 0.25), 0 16px 48px -8px rgb(0 0 0 / 0.35)",
        glow: "0 0 32px -4px var(--sport-glow, var(--sport-accent, transparent))",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
