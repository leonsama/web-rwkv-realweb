import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasmPack from "vite-plugin-wasm-pack";
import Pages from "vite-plugin-pages";

export default defineConfig({
  base: "./",
  plugins: [
    wasmPack("./web-rwkv-realweb"),
    react(),
    Pages({ routeStyle: "remix" }),
  ],
});
