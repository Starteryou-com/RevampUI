import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
  // Set NODE_ENV based on the mode
  if (mode === "production") {
    process.env.NODE_ENV = "production";
  } else {
    process.env.NODE_ENV = "development";
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@hooks": path.resolve(__dirname, "./src/hooks"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@utils": path.resolve(__dirname, "./src/utils"),
        "@config": path.resolve(__dirname, "./src/config"),
      },
    },
  };
});
