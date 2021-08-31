import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { handleTestDataRequest } from "./components/TestDataExtractor";

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById("root")
);

// FOR TESTING
window.addEventListener("message", handleTestDataRequest);
