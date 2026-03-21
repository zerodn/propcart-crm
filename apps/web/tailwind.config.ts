import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand Color System ──────────────────────────────────────────
        // Primary (Trust / Authority): dark navy
        'brand-primary':       '#0B1F3A',
        'brand-primary-hover': '#0F2A52',
        // Accent (Premium / CTA): gold
        'brand-accent':        '#CFAF6E',
        'brand-accent-hover':  '#B89655',
        // Text shades
        'brand-text':          '#0B1F3A',
        'brand-text-secondary':'#4B5563',
        'brand-text-muted':    '#9CA3AF',
        // Backgrounds
        'brand-subtle':        '#F5F7FA',
        'brand-dark':          '#0B1F3A',
        // ── shadcn/ui CSS-variable tokens ──────────────────────────────
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        // Montserrat — headings & buttons
        heading: ['var(--font-heading)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Open Sans — body text
        body:    ['var(--font-body)',    'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Override Tailwind's default `font-sans` → Open Sans
        sans:    ['var(--font-body)',    'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
