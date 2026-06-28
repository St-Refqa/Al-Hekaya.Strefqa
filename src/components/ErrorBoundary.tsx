import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#fff', color: '#000', direction: 'ltr', textAlign: 'left', minHeight: '100vh', width: '100vw', zIndex: 9999, position: 'fixed', top: 0, left: 0 }}>
          <h1 style={{ color: 'red', fontSize: '24px' }}>عفواً، حدث خطأ غير متوقع</h1>
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>برجاء تصوير هذه الشاشة وإرسالها للدعم الفني:</p>
          <div style={{ background: '#f5f5f5', padding: 15, borderRadius: 5, overflow: 'auto', maxHeight: '60vh', border: '1px solid #ccc' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>{this.state.error && this.state.error.toString()}</h3>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '12px' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: '10px 20px', background: '#e11d48', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer' }}
          >
            تحديث الصفحة (Refresh)
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
