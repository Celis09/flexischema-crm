/**
 * APPLICATION BOOTSTRAP
 * ----------------------
 * The root entry point of the React application. It wraps the app in 
 * essential providers (like BrowserRouter and ErrorBoundary) and mounts 
 * it to the DOM.
 */
// @ts-nocheck
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";

import ErrorBoundary from "./components/ErrorBoundary";

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
