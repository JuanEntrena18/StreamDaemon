import React from 'react';
import ReactDOM from 'react-dom/client';
import { OverlayContainer } from './components/OverlayContainer';
import './index.css';

ReactDOM.createRoot(document.getElementById('overlay-root')!).render(
  <React.StrictMode>
    <OverlayContainer />
  </React.StrictMode>,
);
