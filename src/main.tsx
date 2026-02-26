import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary";
// import "@douyinfe/semi-ui/dist/css/semi.min.css";
import "./index.css";

document.title = __APP_NAME__;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

window.ipcRenderer.on("main-process-message", (_event, message) => {
  console.log(message);
});
