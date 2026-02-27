import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./app/App.js";
import "./styles.css";

const appRoot = document.getElementById("app");
if (!appRoot) {
  throw new Error("Missing #app root element");
}

createRoot(appRoot).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
