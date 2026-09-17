/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#f0faf9",
          100: "#d0eceb",
          200: "#a1d8d5",
          300: "#6bbfbb",
          400: "#6b9d99",
          500: "#2e908b",
          600: "#26756f",
          700: "#1f5f5a",
          800: "#1a4d49",
          900: "#163e3b",
          950: "#0b2424",
        },
      },
    },
  },
  plugins: [],
}
