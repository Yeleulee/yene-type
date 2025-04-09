/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        dark: {
          bg: '#1a1b26',
          surface: '#24283b',
          border: '#414868',
          text: '#a9b1d6',
          accent: '#7aa2f7',
        },
      },
    },
  },
  plugins: [],
};