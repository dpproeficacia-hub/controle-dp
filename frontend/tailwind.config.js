/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        bg: '#F4F3EF',
        surface: '#FFFFFF',
        surface2: '#F8F7F4',
        ink: '#1C1B19',
        muted: '#6B6A66',
        faint: '#9B9A96',
        border: '#E4E3DF',
        border2: '#D0CFC9',
      }
    }
  },
  plugins: []
};
