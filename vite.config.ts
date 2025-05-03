import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailWindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailWindcss(),

    tsconfigPaths(), // 👈 Add this
  ],
});
