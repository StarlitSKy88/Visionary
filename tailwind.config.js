/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '.light-mode'],
  theme: {
    extend: {
      colors: {
        /* ========================================
           Supabase Brand Colors (Teal/Green)
           Actual brand from official source
           ======================================== */
        'supabase': {
          DEFAULT: '#3ec489',
          hover: '#2eb06c',
          light: '#7ed6a8',
          dark: '#1a6645',
          50: '#e8f9f3',
          100: '#d1f3e7',
          200: '#a3e7cf',
          300: '#7ed6a8',
          400: '#5ac89c',
          500: '#3ec489',
          600: '#2eb06c',
          700: '#1a6645',
          800: '#134c33',
          900: '#0d3322',
        },

        /* ========================================
           Semantic Colors - Supabase Standard
           ======================================== */
        'success': {
          DEFAULT: '#3ec489',
          light: '#7ed6a8',
          dark: '#2eb06c',
          50: '#e8f9f3',
          100: '#d1f3e7',
          200: '#a3e7cf',
          300: '#7ed6a8',
          400: '#5ac89c',
          500: '#3ec489',
          600: '#2eb06c',
          700: '#1a6645',
        },
        'warning': {
          DEFAULT: '#f5b100',
          light: '#ffc107',
          dark: '#d49b00',
          50: '#fff8e1',
          100: '#ffecb3',
          200: '#ffe082',
          300: '#ffd54f',
          400: '#ffca28',
          500: '#f5b100',
          600: '#d49b00',
          700: '#b38600',
        },
        'error': {
          DEFAULT: '#f25d44',
          light: '#f58c7a',
          dark: '#b33d26',
          50: '#fef2f0',
          100: '#fde5e0',
          200: '#fbccc2',
          300: '#f8b3a4',
          400: '#f25d44',
          500: '#f25d44',
          600: '#b33d26',
          700: '#8a2f1d',
        },
        'destructive': {
          DEFAULT: '#f25d44',
          light: '#f58c7a',
          dark: '#b33d26',
          50: '#fef2f0',
          100: '#fde5e0',
          200: '#fbccc2',
          300: '#f8b3a4',
          400: '#f25d44',
          500: '#f25d44',
          600: '#b33d26',
          700: '#8a2f1d',
        },

        /* ========================================
           Tailwind compat - via CSS vars
           ======================================== */
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

        /* ========================================
           Direct Supabase colors
           ======================================== */
        'sb-brand': '#3ec489',
        'sb-brand-light': '#7ed6a8',
        'sb-brand-dark': '#2eb06c',
        'sb-warning': '#f5b100',
        'sb-error': '#f25d44',
        'sb-gray': {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },

      fontFamily: {
        sans: [
          'Inter',
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
        display: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },

      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },

      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },

      borderRadius: {
        'sm': '0.5rem',
        'DEFAULT': '0.75rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        'full': '9999px',
      },

      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },

      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
      },

      transitionTimingFunction: {
        'DEFAULT': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
