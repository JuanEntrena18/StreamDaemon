import React from 'react';
import ReactDOM from 'react-dom/client';
import { OverlayContainer } from './components/OverlayContainer';
import { OverlayErrorBoundary } from './components/OverlayErrorBoundary';
import { TranslationProvider } from './i18n/context';
import './index.css';

ReactDOM.createRoot(document.getElementById('overlay-root')!).render(
  <React.StrictMode>
    <TranslationProvider>
      <OverlayErrorBoundary>
        <OverlayContainer />
      </OverlayErrorBoundary>
    </TranslationProvider>
  </React.StrictMode>,
);
