import { createRoot } from "react-dom/client";

import "./index.css";

import { App } from "./App";
import { StrictMode } from "react";
import { Toaster } from "react-hot-toast";
import { HashRouter } from "react-router";

const app = createRoot(document.getElementById("root")!);

const BASENAME = import.meta.env.DEV ? "/" : "/web-rwkv-realweb/";
// const BASENAME = "/"

app.render(
  <StrictMode>
    <HashRouter basename={BASENAME}>
      <App />
      <Toaster />
    </HashRouter>
  </StrictMode>
);
