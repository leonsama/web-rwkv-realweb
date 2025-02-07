import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasmPack from "vite-plugin-wasm-pack";
import Pages from "vite-plugin-pages";

import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  base: "./",
  plugins: [
    wasmPack("./web-rwkv-wasm"),
    react(),
    Pages({
      routeStyle: "remix",
      importMode(filepath, options) {
        // default resolver
        for (const page of options.dirs) {
          if (
            (page.baseRoute === "" &&
              filepath.startsWith(`/${page.dir}/index`)) ||
            filepath.includes("chat")
          )
            return "sync";
        }
        return "async";
      },
    }),
    visualizer({
      gzipSize: true,
      brotliSize: true,
      emitFile: false,
      filename: "rollup_visualization.html",
      open: true,
      template: "flamegraph",
    }),
  ],
});
