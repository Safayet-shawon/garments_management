export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'], display: ['"Playfair Display"', 'Georgia', 'serif'] },
      colors: {
        slate: { 500: '#556174' },
        brand: { 50: '#eef1fb', 100: '#dbe2f6', 200: '#b5c3ea', 500: '#2f4ba3', 600: '#1b2d6b', 700: '#14214f', 900: '#0b1432' },
        gold: { 50: '#fdf8e8', 100: '#faefc4', 400: '#e6bd4a', 500: '#d4a21f', 600: '#8a5f0c' },
        ink: { 900: '#0b1230', 800: '#131c42' },
      },
      boxShadow: { card: '0 1px 2px rgba(15,23,60,.05), 0 1px 3px rgba(15,23,60,.06)' },
    },
  },
  plugins: [],
}
