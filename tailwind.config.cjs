/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#f3f3f3',
        surface: '#ffffff', // Panels
        dim: '#666666',
        border: '#000000',
        active: '#000000',
      },
      fontFamily: {
        display: ['"Departure Mono"', 'monospace'],
        body: ['"Departure Mono"', 'monospace'],
        sans: ['"Departure Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0px',
        none: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '0px',
      },
    },
  },
  plugins: [],
}
