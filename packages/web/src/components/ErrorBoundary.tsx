import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console
    console.error("🚨 [ErrorBoundary] Caught error:", error);
    console.error("📍 [ErrorBoundary] Component stack:", errorInfo.componentStack);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1a1a",
          color: "white",
          padding: "20px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>🚨</div>
          <h1 style={{ fontSize: "24px", marginBottom: "12px" }}>
            Algo salió mal
          </h1>
          <p style={{ fontSize: "16px", opacity: 0.7, marginBottom: "24px", maxWidth: "600px" }}>
            La aplicación encontró un error inesperado. Intenta recargar la página.
          </p>
          
          {this.state.error && (
            <div style={{
              background: "#2a2a2a",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "24px",
              maxWidth: "800px",
              textAlign: "left",
              fontFamily: "monospace",
              fontSize: "14px",
              overflow: "auto",
            }}>
              <div style={{ color: "#FF5722", marginBottom: "8px", fontWeight: "bold" }}>
                {this.state.error.toString()}
              </div>
              {this.state.errorInfo && (
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", opacity: 0.7 }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}
          
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 24px",
              background: "#4CAF50",
              border: "none",
              borderRadius: "6px",
              color: "white",
              fontSize: "16px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🔄 Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
