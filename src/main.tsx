import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import 'leaflet/dist/leaflet.css';
import './index.css';

document.documentElement.classList.add('dark');

if (Capacitor.isNativePlatform()) {
  void StatusBar.setStyle({ style: Style.Dark }).catch(() => {
    /* optional on web */
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
