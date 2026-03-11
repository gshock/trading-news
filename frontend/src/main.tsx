import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import { ThemeProvider } from "./contexts/ThemeContext";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import App from "./App.tsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <App />
        <ToastContainer
          position="bottom-right"
          autoClose={4000}
          theme="colored"
          toastClassName="text-sm"
        />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
