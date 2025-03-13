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
import { ToastContainer } from "react-toastify";
import { PositionObserver } from "./utils/position-observer";
import { PopupRoot } from "./components/popup/utils";

import {
  detect,
  fromUrl,
  fromStorage,
  fromNavigator,
} from "@lingui/detect-locale";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { i18nSetLocale } from "./i18n";

import { messages as enMessages } from "./locales/en/messages";
i18n.load({
  en: enMessages,
});
i18n.activate("cs");

const LOCALE_DEFAULT_FALLBACK = () => "en";
i18nSetLocale(
  detect(
    fromUrl("lang"),
    fromStorage("lang"),
    fromNavigator(),
    LOCALE_DEFAULT_FALLBACK,
  )!,
);

const app = createRoot(document.getElementById("root")!);

PositionObserver;

app.render(
  <StrictMode>
    <I18nProvider i18n={i18n}>
      <App />
      <ToastContainer></ToastContainer>
      <PopupRoot></PopupRoot>
    </I18nProvider>
  </StrictMode>,
);
