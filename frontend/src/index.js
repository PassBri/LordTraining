import React from "react";
import ReactDOM from "react-dom/client";
import "@/i18n";
import "@/index.css";
import App from "@/App";

// Suprime el warning benigno de ResizeObserver (Radix Select en dev) que dispara el overlay de CRA
window.addEventListener("error", (e) => {
  if (e.message && e.message.includes("ResizeObserver loop")) {
    e.stopImmediatePropagation();
  }
}, true);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
