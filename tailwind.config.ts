import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        muted: "#475569",
        paper: "#F8FAFC",
        brand: {
          DEFAULT: "#0284C7",
          strong: "#0369A1",
          light: "#F0F9FF",
          soft: "#E0F2FE",
          dark: "#0C4A6E"
        },
        line: "#E2E8F0"
      },
      boxShadow: {
        soft: "0 10px 30px -5px rgba(15, 23, 42, 0.05), 0 4px 6px -2px rgba(15, 23, 42, 0.02)",
        lift: "0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)"
      }
    }
  },
  plugins: []
};

export default config;
