/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                geogan: {
                    dark: '#1A3D2F',   // Verde bosque del logo
                    lime: '#8CB33E',   // Verde acción del logo
                    surface: '#121412' // Fondo Dashboard
                }
            }
        },
    },
    plugins: [],
}
