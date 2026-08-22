/** @type {import('tailwindcss').Config} */
// TrustMart brand tokens — CLAUDE.md SS3 / SSOT SS15. Do not change without founder approval.
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "tm-navy": "#0B2C5F",
        "tm-gold": "#D4A017",
        "tm-white": "#FFFFFF",
        "tm-dark": "#1A1A1A",
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "Montserrat", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
