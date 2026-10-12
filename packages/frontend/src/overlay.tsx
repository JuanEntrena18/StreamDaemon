import React from 'react';
import ReactDOM from 'react-dom/client';
import { OverlayContainer } from './components/OverlayContainer';
import { OverlayErrorBoundary } from './components/OverlayErrorBoundary';
import { TranslationProvider } from './i18n/context';
import { SocketProvider } from './contexts/SocketContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('overlay-root')!).render(
  <React.StrictMode>
    <TranslationProvider>
      <SocketProvider>
        <OverlayErrorBoundary>
          <OverlayContainer />
        </OverlayErrorBoundary>
      </SocketProvider>
    </TranslationProvider>
  </React.StrictMode>,
);
