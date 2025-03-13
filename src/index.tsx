import { createRoot } from "react-dom/client";

import "./index.css";

switch (import.meta.env.VITE_TARGET) {
  case "webrwkv":
    import("./targets/webrwkv/webrwkv.css");
    break;

  case "rwkv-hf-space":
    import("./targets/rwkv-hf-space/rwkv-hf-space.css");
    break;
  default:
    throw new Error(`Unknow target '${import.meta.env.VITE_TARGET}'`);
}

import { App } from "./App";
import { StrictMode } from "react";
import { PositionObserver } from "./utils/position-observer";


// i18n
import { i18n } from "@lingui/core";
import { messages as enMessages } from "./locales/en/messages";
import { detectLocals, i18nSetLocale } from "./i18n";
i18n.load({
  en: enMessages,
});
i18n.activate("en");
i18nSetLocale(detectLocals()[0]);

const app = createRoot(document.getElementById("root")!);

PositionObserver;

app.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
