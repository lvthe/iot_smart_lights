/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        'primary-dark': '#4f46e5',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        'bg-dark': '#1e293b',
        'bg-darker': '#0f172a',
        'text-light': '#f1f5f9',
        'text-dim': '#94a3b8',
        'card-bg': '#334155',
        'card-bg-light': '#1e2433',
        'card-border': '#2a3656',
        amber: '#ffb648',
        'amber-soft': '#ffd089',
        'amber-glow': '#ff8a3d',
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 1.5s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        glow: {
          'from': {
            textShadow: '0 0 5px #ffd700, 0 0 10px #ffd700',
          },
          'to': {
            textShadow: '0 0 10px #ffd700, 0 0 20px #ffd700, 0 0 30px #ffd700',
          },
        },
        fadeIn: {
          'from': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  plugins: [],
}
