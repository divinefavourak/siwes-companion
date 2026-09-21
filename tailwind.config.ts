import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { ink: "#111827", muted: "#667085", paper: "#F6F8FB", brand: "#635BFF", line: "#E6EAF0" },
      boxShadow: { soft: "0 18px 50px rgba(16, 24, 40, 0.08)" }
    }
  },
  plugins: []
};

export default config;
