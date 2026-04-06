/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // ✅ Tells Tailwind to scan all components and pages
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#025899',
          dark: '#013b66',
          light: '#0370b8',
        },
      },
    },
  },
  plugins: [],
}
