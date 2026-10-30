/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        legal: {
          50: '#f0f5fa',
          100: '#e1ecf5',
          200: '#c3d9eb',
          300: '#94bedc',
          400: '#5e9ec9',
          500: '#3882b3',
          600: '#286896',
          700: '#21547b',
          800: '#1e4766',
          900: '#0f2942', // Primary AdvD Navy
          950: '#0a1a2c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

