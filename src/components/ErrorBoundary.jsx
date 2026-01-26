import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, errorCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught an error:', error, errorInfo);
    const errorCount = this.state.errorCount + 1;
    this.setState({
      error,
      errorInfo,
      errorCount,
    });
    
    // Log to console with full details
    if (errorCount === 1) {
      console.group('🚨 Error Boundary - First Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo?.componentStack);
      console.groupEnd();
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--error)' }}>
            ⚠️ Something went wrong
          </h1>
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            {this.state.error?.toString() || 'An unexpected error occurred'}
          </p>
          <p style={{ marginBottom: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Don't worry, your data is safe. Try reloading the page.
          </p>
          {this.state.errorInfo && (
            <details style={{
              marginBottom: '2rem',
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: '0.5rem',
              maxWidth: '600px',
              width: '100%',
              textAlign: 'left',
              border: '1px solid var(--border-color)',
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Error Details (Click to expand)
              </summary>
              <pre style={{
                fontSize: '0.75rem',
                overflow: 'auto',
                color: 'var(--text-muted)',
                marginTop: '0.5rem',
                padding: '0.5rem',
                background: 'var(--bg-primary)',
                borderRadius: '0.25rem',
              }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                background: 'var(--accent)',
                color: 'var(--bg-primary)',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
