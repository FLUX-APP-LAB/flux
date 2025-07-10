/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        flux: {
          primary: '#6366f1',
          'primary-dark': '#4338ca',
          'primary-light': '#a5b4fc',
          accent: {
            gold: '#fbbf24',
            purple: '#a855f7',
            green: '#10b981',
            red: '#ef4444',
          },
          bg: {
            primary: '#0f0f0f',
            secondary: '#1a1a1a',
            tertiary: '#262626',
          },
          text: {
            primary: '#ffffff',
            secondary: '#a3a3a3',
          },
          light: {
            bg: {
              primary: '#ffffff',
              secondary: '#f8fafc',
              tertiary: '#e2e8f0',
            },
            text: {
              primary: '#0f172a',
              secondary: '#64748b',
            },
          },
        },
      },
      backgroundImage: {
        'flux-gradient': 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        'flux-gradient-gold': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        'flux-gradient-live': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      },
      screens: {
        'xs': '375px',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};