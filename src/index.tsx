import { createRoot } from "react-dom/client";

import "./index.css";

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
