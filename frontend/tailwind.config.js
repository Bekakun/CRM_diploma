/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        fadeSlideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeSlideUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(14,165,233,0.4)' },
          '50%':       { opacity: '0.85', boxShadow: '0 0 0 8px rgba(14,165,233,0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.93)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideRight: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        fadeSlideDown: 'fadeSlideDown 0.4s ease both',
        fadeSlideUp:   'fadeSlideUp 0.5s ease both',
        fadeIn:        'fadeIn 0.4s ease both',
        shimmer:       'shimmer 2.5s linear infinite',
        float:         'float 3s ease-in-out infinite',
        pulseGlow:     'pulseGlow 2s ease-in-out infinite',
        scaleIn:       'scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
        slideRight:    'slideRight 1.5s ease-in-out infinite',
      },
      colors: {
        primary: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        gray: {
          50:  '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#0f1117',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':  'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'shimmer-light':   'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
        'shimmer-dark':    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
        'mesh-light':      'radial-gradient(at 40% 20%, hsla(207,100%,94%,1) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,90%,1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(220,100%,95%,1) 0px, transparent 50%)',
        'mesh-dark':       'radial-gradient(at 40% 20%, hsla(207,70%,8%,0.8) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,70%,6%,0.8) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(220,70%,6%,0.8) 0px, transparent 50%)',
        'sidebar-light':   'linear-gradient(160deg, #f8faff 0%, #f0f6ff 50%, #eaf3ff 100%)',
        'sidebar-dark':    'linear-gradient(160deg, #0d1117 0%, #0f1520 50%, #0a1020 100%)',
      },
      boxShadow: {
        'card':       '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-md':    '0 4px 16px -2px rgba(0,0,0,0.08), 0 2px 6px -2px rgba(0,0,0,0.06)',
        'card-lg':    '0 10px 40px -4px rgba(0,0,0,0.1), 0 4px 16px -4px rgba(0,0,0,0.06)',
        'card-xl':    '0 20px 60px -8px rgba(0,0,0,0.14), 0 8px 24px -6px rgba(0,0,0,0.08)',
        'glow-sm':    '0 0 12px 2px rgba(14,165,233,0.2)',
        'glow-md':    '0 0 24px 4px rgba(14,165,233,0.25)',
        'glow-lg':    '0 0 40px 8px rgba(14,165,233,0.2)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.1)',
        'sidebar':    '4px 0 24px -4px rgba(0,0,0,0.08)',
        'sidebar-dark': '4px 0 24px -4px rgba(0,0,0,0.4)',
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
