import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './lib/i18n';

// Suppress Firestore quota and backoff logs in the console to prevent infinite error loops in the preview environment
const originalConsoleError = console.error;
console.error = (...args) => {
  const msg = typeof args[0] === 'string' ? args[0] : args.join(' ');
  if (
    (msg.includes('@firebase/firestore') && msg.includes('resource-exhausted')) ||
    msg.includes('Using maximum backoff delay to prevent overloading') ||
    msg.includes('Quota limit exceeded')
  ) {
    return;
  }
  originalConsoleError(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

