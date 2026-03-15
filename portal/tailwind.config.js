/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'p4c-navy':    '#1a365d',
        'p4c-dark':    '#0d233e',
        'p4c-alt':     '#122847',
        'p4c-blue':    '#60a5fa',
        'p4c-cream':   '#fdf2e9',
        'p4c-orange':  '#f6aa3c',
        'p4c-purple':  '#9d174d',
        'p4c-text':    '#f8fafc',
      },
      fontFamily: {
        heading: ['Montserrat', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        serif:   ['Josefin Slab', 'serif'],
      },
    },
  },
  plugins: [],
}
