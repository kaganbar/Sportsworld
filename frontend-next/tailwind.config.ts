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
        // Hero wordmark only (components/hero.tsx) — see layout.tsx.
        display: ["var(--font-anton)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // "Premium" layered shadows — soft, diffuse, with a subtle colored
        // glow option for accent surfaces — replacing the stock flat
        // shadow/shadow-sm everywhere a Card/panel wants real depth.
        soft: "0 2px 8px -2px rgb(0 0 0 / 0.15), 0 8px 24px -4px rgb(0 0 0 / 0.25)",
        premium: "0 4px 16px -4px rgb(0 0 0 / 0.25), 0 16px 48px -8px rgb(0 0 0 / 0.35)",
        glow: "0 0 32px -4px var(--sport-glow, var(--sport-accent, transparent))",
      },
      backgroundImage: {
        // The shared dark backdrop for every page NOT wrapped in ThemeLayout
        // (which has its own per-sport gradient + 3D canvas) — a "Galaxy
        // Style" deep-space gradient used by PageShell, so pages stop
        // hand-copying an inline gradient string per file.
        "galaxy-shell":
          "radial-gradient(circle at 50% 0%, rgba(124,108,255,0.14), transparent 55%), linear-gradient(180deg, #05050a, #0d0b16 55%, #05050a)",
      },
      colors: {
        // "Galaxy" accent scale — the deep-space palette backing the new
        // PageShell/sidebar chrome. Kept as plain hex (not the hsl(var(--x))
        // shadcn convention) since it's consumed via gradients/glows, not
        // discrete utility swaps.
        galaxy: {
          void: "#05050a",
          deep: "#0a0a12",
          nebula: "#171233",
          glow: "#7c6cff",
        },
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
      // Powers components/ui/background-gradient-animation.tsx's animate-first
      // .. animate-fifth classes — this project is on Tailwind v3 (config-file
      // theme, not v4's CSS `@theme inline` blocks), so these are declared
      // here rather than as a `@theme`/`@keyframes` block in globals.css.
      keyframes: {
        moveHorizontal: {
          "0%": { transform: "translateX(-50%) translateY(-10%)" },
          "50%": { transform: "translateX(50%) translateY(10%)" },
          "100%": { transform: "translateX(-50%) translateY(-10%)" },
        },
        moveInCircle: {
          "0%": { transform: "rotate(0deg)" },
          "50%": { transform: "rotate(180deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        moveVertical: {
          "0%": { transform: "translateY(-50%)" },
          "50%": { transform: "translateY(50%)" },
          "100%": { transform: "translateY(-50%)" },
        },
      },
      animation: {
        first: "moveVertical 30s ease infinite",
        second: "moveInCircle 20s reverse infinite",
        third: "moveInCircle 40s linear infinite",
        fourth: "moveHorizontal 40s ease infinite",
        fifth: "moveInCircle 20s ease infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
