
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        longevity: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },

        sage: {
          50: '#f6f7f6',
          100: '#e3e7e3',
          200: '#c7d0c7',
          300: '#a3b2a3',
          400: '#7f937f',
          500: '#637863',
          600: '#4e5f4e',
          700: '#3e4c3e',
          800: '#333e33',
          900: '#2c342c',
        },

        ikaria: {
          amber: '#f59e0b',
          gold: '#eab308',
          sky: '#0284c7',
        },
      },

      fontFamily: {
        sans: [
          'Be Vietnam Pro',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
      },
    },
  },

  plugins: [],
};
