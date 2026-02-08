/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  important: '#root',
  theme: {
    extend: {
      colors: {
        primary: {
          main: '#42A5F5',
          DEFAULT: '#42A5F5',
        },
        secondary: {
          main: '#FFA726',
          DEFAULT: '#FFA726',
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
}

