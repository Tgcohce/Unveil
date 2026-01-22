import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import Dashboard from "./Dashboard";
import "./index.css";

// Error boundary for catching React errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("React Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0f172a",
            color: "white",
            fontFamily: "Inter, sans-serif",
            padding: "20px",
          }}
        >
          <h1 style={{ color: "#ef4444", marginBottom: "20px" }}>
            Something went wrong
          </h1>
          <pre
            style={{
              backgroundColor: "#1e293b",
              padding: "20px",
              borderRadius: "8px",
              maxWidth: "80%",
              overflow: "auto",
            }}
          >
            {this.state.error?.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Add global error handler
window.onerror = function (message, source, lineno, colno, error) {
  console.error("Global error:", message, source, lineno, colno, error);
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #0f172a; color: white; font-family: Inter, sans-serif; padding: 20px;">
        <h1 style="color: #ef4444; margin-bottom: 20px;">JavaScript Error</h1>
        <pre style="background-color: #1e293b; padding: 20px; border-radius: 8px; max-width: 80%; overflow: auto;">${message}</pre>
      </div>
    `;
  }
  return true;
};

console.log("UNVEIL: Starting app...");

const rootElement = document.getElementById("root");
if (rootElement) {
  console.log("UNVEIL: Root element found, rendering...");
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
  console.log("UNVEIL: Render complete");
} else {
  console.error("UNVEIL: Root element not found!");
}
