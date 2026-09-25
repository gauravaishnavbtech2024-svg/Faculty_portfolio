import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        icfai: {
          navy: "#002147",
          "navy-dark": "#001633",
          "navy-light": "#0a356c",
          red: "#e31e34",
          "red-dark": "#c8102e",
          "red-light": "#fde8ea",
          blue: {
            50: "#eff4fa",
            100: "#dbe6f5",
            200: "#bad0ed",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;
