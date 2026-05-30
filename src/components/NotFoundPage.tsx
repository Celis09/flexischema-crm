// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      padding: '2rem',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: 'var(--fs-bg-panel, #ffffff)',
        padding: '3rem 4rem',
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <h1 style={{ 
          fontSize: '5rem', 
          fontWeight: '800', 
          margin: '0', 
          color: 'var(--fs-primary-base, #3b82f6)'
        }}>
          404
        </h1>
        <h2 style={{ 
          fontSize: '1.5rem', 
          marginTop: '0.5rem',
          marginBottom: '1.5rem',
          color: 'var(--fs-text-strong, #111827)' 
        }}>
          Page Not Found
        </h2>
        <p style={{ 
          color: 'var(--fs-text-sub, #6b7280)', 
          marginBottom: '2.5rem', 
          lineHeight: '1.6' 
        }}>
          Oops! The page you are looking for doesn't exist or might have been moved.
        </p>
        <button 
          onClick={() => navigate('/')}
          style={{
            backgroundColor: 'var(--fs-primary-base, #3b82f6)',
            color: '#ffffff',
            border: 'none',
            padding: '0.75rem 2rem',
            borderRadius: '6px',
            fontSize: '1rem',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'background-color 0.2s ease-in-out'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--fs-primary-hover, #2563eb)'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--fs-primary-base, #3b82f6)'}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

