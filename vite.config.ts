import { defineConfig, loadEnv } from "vite";
import { execSync } from "child_process";

import react from "@vitejs/plugin-react";
import wasmPack from "vite-plugin-wasm-pack";
import Pages from "vite-plugin-pages";

import { visualizer } from "rollup-plugin-visualizer";

function getGitInfo() {
  return {
    // SHA
    VITE_GIT_SHA: execSync("git rev-parse --short HEAD").toString().trim(),
    // 提交时间
    VITE_GIT_COMMIT_DATE: execSync("git log -1 --format=%cI").toString().trim(),
    //HASH
    VITE_GIT_HASH: execSync("git rev-parse HEAD").toString().trim(),

    VITE_GIT_BRANCH: execSync("git branch --show-current").toString().trim(),
  };
}

export default defineConfig(({ mode }) => {
  process.env = Object.assign(
    process.env,
    loadEnv(mode, process.cwd(), ""),
    getGitInfo(),
  );

  return {
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
  };
});
