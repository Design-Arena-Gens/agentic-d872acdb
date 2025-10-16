import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        agent: {
          surface: "#0F172A",
          accent: "#38BDF8",
          secondary: "#94A3B8"
        }
      }
    }
  },
  plugins: []
};

export default config;
