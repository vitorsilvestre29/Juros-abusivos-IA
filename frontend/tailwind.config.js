/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#003366',
          600: '#002855',
          700: '#001e40',
          900: '#001428',
        }
      }
    },
  },
  plugins: [],
}
