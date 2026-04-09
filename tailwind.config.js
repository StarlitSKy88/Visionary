/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Nordic Frost tokens */
        'nord-bg': 'var(--bg-primary)',
        'nord-bg2': 'var(--bg-secondary)',
        'nord-bg3': 'var(--bg-tertiary)',
        'nord-card': 'var(--bg-card)',
        'nord-frost': 'var(--accent-frost)',
        'nord-aurora': 'var(--accent-aurora)',
        'nord-ember': 'var(--accent-ember)',
        'nord-snow': 'var(--text-primary)',
        'nord-dim': 'var(--text-muted)',
        'nord-border': 'var(--border-color)',

        /* Tailwind compat via CSS vars */
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: '#e8f4f8',
          100: '#c8e6ef',
          200: '#a0d3e3',
          300: '#6ebdd5',
          400: '#88c0d0',
          500: '#5eaabf',
          600: '#4a94aa',
          700: '#3d7b8e',
          800: '#356673',
          900: '#2e5460',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        sans: [
          'Space Grotesk',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        soft: '0 2px 8px -2px rgba(0, 0, 0, 0.2)',
        medium: '0 4px 12px -2px rgba(0, 0, 0, 0.25)',
        strong: '0 8px 24px -4px rgba(0, 0, 0, 0.3)',
        frost: '0 0 20px rgba(136, 192, 208, 0.1)',
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
