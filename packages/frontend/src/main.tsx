import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { TranslationProvider } from './i18n/context';
import './index.css';

try {
  const zoom = localStorage.getItem('sf-ui-zoom') || 'auto';
  document.documentElement.setAttribute('data-zoom', zoom);
} catch {}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TranslationProvider>
      <App />
    </TranslationProvider>
  </React.StrictMode>,
);
