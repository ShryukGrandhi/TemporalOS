/**
 * Entry point for React app
 * This file is bundled and injected into the page
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Wait for DOM and React to be ready
function initApp() {
  const rootElement = document.getElementById('temporalos-root');
  
  if (rootElement) {
    try {
      const root = createRoot(rootElement);
      root.render(React.createElement(App));
      console.log('[TemporalOS] React app initialized');
    } catch (error) {
      console.error('[TemporalOS] Error initializing React app:', error);
    }
  } else {
    // Retry after a short delay
    setTimeout(initApp, 100);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
