/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#111827',
          700: '#374151',
          500: '#6B7280',
          300: '#D1D5DB',
        },
        mist: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E5F0FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Pretendard', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'Apple SD Gothic Neo', 'Apple SD 산돌고딕 Neo', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


