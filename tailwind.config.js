/** Tailwind config for PSA (App Router) */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./styles/**/*.{css}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        lavender: "#EDE7F6"
      }
    }
  },
  plugins: []
};
