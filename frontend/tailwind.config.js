/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#101828',
          800: '#172033',
          700: '#1D2939',
        },
        teal: {
          accent: '#22C7C9',
          dark: '#149B9D',
        },
        surface: {
          bg: '#F7F9FC',
          card: '#FFFFFF',
          border: '#E4E7EC',
        },
        text: {
          primary: '#172033',
          muted: '#667085',
        },
        status: {
          success: '#168A62',
          warning: '#B7791F',
          error: '#C43232',
          info: '#2563EB',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

