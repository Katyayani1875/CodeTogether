// frontend/tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Ensure this includes all your files
  ],
  theme: {
    extend: {},
  },
  plugins: [],
   safelist: [
    {
      pattern: /bg-\[#[\w]+\]/,
   },
  ]
}