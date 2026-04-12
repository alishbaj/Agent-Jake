/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sf: {
          red: '#CC0000',
          'red-dark': '#a30000',
          blue: '#003087',
          /** Lighter hero blue (decorative circles / inner brand tone on landing) */
          'blue-mid': '#1a4ba0',
          /** Page shell behind cream panels (assessment + results) */
          'blue-page': '#1a4ba0',
          /** Soft inner panel */
          cream: '#f5f4eb',
          gold: '#F2A900',
          green: '#2e7d32',
          orange: '#e65100',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.6s ease forwards',
        'slide-up': 'slideUp 0.5s ease forwards',
        'stream-in': 'streamIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'orb-float': 'orbFloat 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        streamIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        orbFloat: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-20px) scale(1.05)' },
        },
        glow: {
          from: { boxShadow: '0 0 20px rgba(204,0,0,0.3)' },
          to: { boxShadow: '0 0 40px rgba(204,0,0,0.7)' },
        },
      },
    },
  },
  plugins: [],
}