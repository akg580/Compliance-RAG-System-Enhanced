/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0A2540',
          'navy-light': '#1A3A5C',
          gold: '#F7B731',
          'gold-light': '#FCD34D',
          slate: '#475569',
          'slate-light': '#64748B',
        },
        accent: {
          emerald: '#10B981',
          ruby: '#EF4444',
          sapphire: '#3B82F6',
          amber: '#F59E0B',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #0A2540 0%, #1A3A5C 100%)',
        'gradient-gold': 'linear-gradient(135deg, #F7B731 0%, #FCD34D 100%)',
        'glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Clash Display', 'sans-serif'],
      },
    },
  },
  plugins: [],
}