
import type { Config } from "tailwindcss"
import { fontFamily } from "tailwindcss/defaultTheme"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        "attune-blue": "#EBF9FA",
        "attune-purple": "#7E22CD",
        "attune-indigo": "#6366F1",
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
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "sound-wave-1": {
          "0%, 100%": { height: "0.75rem" },
          "50%": { height: "2rem" },
        },
        "sound-wave-2": {
          "0%, 100%": { height: "0.5rem" },
          "50%": { height: "1.75rem" },
        },
        "sound-wave-3": {
          "0%, 100%": { height: "1.25rem" },
          "50%": { height: "3rem" },
        },
        "sound-wave-4": {
          "0%, 100%": { height: "0.85rem" },
          "50%": { height: "2.25rem" },
        },
        "sound-wave-5": {
          "0%, 100%": { height: "0.6rem" },
          "50%": { height: "1.5rem" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "sound-wave-1": "sound-wave-1 1s ease-in-out infinite",
        "sound-wave-2": "sound-wave-2 1.2s ease-in-out infinite",
        "sound-wave-3": "sound-wave-3 1.1s ease-in-out infinite",
        "sound-wave-4": "sound-wave-4 0.9s ease-in-out infinite",
        "sound-wave-5": "sound-wave-5 1.3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
