import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: "#FE2C55",
        ink: "#050505",
        surface: "#1A1A1D",
        surface2: "#242426",
        line: "#2A2A2E",
        muted: "#8A8A8E",
        success: "#25D366",
        warning: "#FFD60A",
        danger: "#FF3B30",
        info: "#0A84FF",
      },
    },
  },
  plugins: [],
}

export default config
