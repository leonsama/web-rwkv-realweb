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

const app = createRoot(document.getElementById("root")!);

PositionObserver;

app.render(
  <StrictMode>
    <App />
    <ToastContainer></ToastContainer>
    <PopupRoot></PopupRoot>
  </StrictMode>,
);
