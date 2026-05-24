/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        surface: '#151A2D',
        primary: '#4F46E5',
        'primary-hover': '#6366F1',
        secondary: '#10B981',
        text: '#F3F4F6',
        'text-muted': '#9CA3AF',
        border: '#374151'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
