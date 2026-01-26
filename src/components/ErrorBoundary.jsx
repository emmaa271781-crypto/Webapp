import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '2rem',
          color: '#e8f5e9',
          background: '#0a1418'
        }}>
          <h1 style={{ color: '#f87171', marginBottom: '1rem' }}>Something went wrong</h1>
          <pre style={{
            background: '#0f1d22',
            padding: '1rem',
            borderRadius: '0.5rem',
            overflow: 'auto',
            maxWidth: '600px',
            fontSize: '0.85rem'
          }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: '#4ade80',
              color: '#0a1418',
              border: 'none',
              borderRadius: '0.4rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
