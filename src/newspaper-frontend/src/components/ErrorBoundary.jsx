import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("App error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "600px", margin: "2rem auto" }}>
          <h1 style={{ color: "#dc2626", marginBottom: "1rem" }}>오류가 발생했습니다</h1>
          <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
            {this.state.error?.message || "알 수 없는 오류"}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "0.5rem 1rem", background: "#2563eb", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer" }}
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
