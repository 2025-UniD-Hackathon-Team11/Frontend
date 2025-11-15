/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#bfe0ff',
          300: '#8ec7ff',
          400: '#5eabff',
          500: '#2e8cff',
          600: '#1f6fdb',
        },
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
      boxShadow: {
        subtle: '0 6px 24px rgba(30, 64, 175, 0.08)',
        glow: '0 8px 40px rgba(46, 140, 255, 0.25)',
      },
    },
  },
  plugins: [],
}


