// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class', // Enable dark mode support
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}", // Include all relevant files in src
    ],
    theme: {
      extend: {},
    },
    plugins: [],
    // Optional: Enable RTL plugin if needed (though direct RTL classes might suffice)
    // plugins: [require('tailwindcss-rtl')],
  }