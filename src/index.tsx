import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";

import { App } from "./App";
import { StrictMode } from "react";
import { Toaster } from "react-hot-toast";

const app = createRoot(document.getElementById("root")!);

const BASENAME = import.meta.env.DEV ? "/" : "/web-rwkv-realweb/";

app.render(
  <StrictMode>
    <BrowserRouter basename={BASENAME}>
      <App />
      <Toaster />
    </BrowserRouter>
  </StrictMode>
);
