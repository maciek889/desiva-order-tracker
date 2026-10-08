/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: { primary: "#ffffff", secondary: "#f9fafb", sidebar: "#f3f4f6", card: "#ffffff", input: "#f9fafb" },
        accent: { DEFAULT: "#000000", hover: "#374151" },
        border: "#e5e7eb",
      },
    },
  },
  plugins: [],
};
