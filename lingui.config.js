import { defineConfig } from "@lingui/cli";

export default defineConfig({
  sourceLocale: "en",
  locales: ["zh", "en"],
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: ["src"],
    },
  ],
  fallbackLocales: {
    "zh-CN": ["zh"],
    "zh-Hant": ["zh"],
    default: "en",
  },
});
