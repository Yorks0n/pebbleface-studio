/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0f1115',
      },
      fontFamily: {
        display: ['"Departure Mono"', '"SFMono-Regular"', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
        body: ['"Departure Mono"', '"SFMono-Regular"', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        inset: 'inset 0 1px 0 0 rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [],
}
