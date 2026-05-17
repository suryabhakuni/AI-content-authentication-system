import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import blockchainService from "./services/blockchainService";

// Expose blockchainService to window for testing/debugging
if (import.meta.env.DEV) {
  window.blockchainService = blockchainService;
  console.log("Dev mode: blockchainService available in console");
}

createRoot(document.getElementById("root")).render(<App />);
