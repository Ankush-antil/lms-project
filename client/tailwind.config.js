/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#0b1329", // Main Navy Blue
                secondary: "#1e293b", // Slate Accent
                dark: "#0b1329",
                light: "#ffffff",
                glass: "rgba(255, 255, 255, 0.1)",
                indigo: {
                    50: '#f4f6fc',
                    100: '#e8ecf7',
                    200: '#c5cfea',
                    300: '#a3b2dd',
                    400: '#5f79c2',
                    500: '#1d357d',
                    600: '#0b1329', // Main Navy Blue!
                    700: '#152244', // Darker Navy
                    800: '#080d1d',
                    900: '#03050a',
                    950: '#010204',
                },
                purple: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#0b1329', // Navy Accent
                    700: '#1e293b',
                    800: '#0f172a',
                    900: '#090d16',
                    950: '#020408',
                },
                slate: {
                    50: '#fafafa',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            backdropBlur: {
                xs: '2px',
            }
        },
    },
    plugins: [],
}
