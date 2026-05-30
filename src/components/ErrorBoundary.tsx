// @ts-nocheck
import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
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
          width: '100%',
          backgroundColor: 'var(--fs-bg-base, #f9fafb)',
          color: 'var(--fs-text-main, #111827)',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            background: 'var(--fs-bg-panel, #ffffff)',
            padding: '2.5rem 3rem',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            textAlign: 'center',
            maxWidth: '450px'
          }}>
            <h1 style={{ marginTop: 0, fontSize: '1.5rem', color: 'var(--fs-text-strong, #000)' }}>
              Something went wrong
            </h1>
            <p style={{ color: 'var(--fs-text-sub, #6b7280)', marginBottom: '2rem', lineHeight: '1.5' }}>
              We're sorry, but an unexpected error occurred while rendering this page.
            </p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: 'var(--fs-primary-base, #3b82f6)',
                color: '#ffffff',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                fontSize: '0.95rem',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'background-color 0.2s ease-in-out'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--fs-primary-hover, #2563eb)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--fs-primary-base, #3b82f6)'}
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

