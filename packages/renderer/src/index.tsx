import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { handleTestDataRequest } from "./components/diagram/DiagramTestHelper";

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);

// FOR TESTING
window.addEventListener("message", handleTestDataRequest);
