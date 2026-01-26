import React from 'react';
import ReactDOM from 'react-dom/client';
import AppChatScope from './AppChatScope.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';

// Add error handler for unhandled errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppChatScope />
    </ErrorBoundary>
  </React.StrictMode>
);
