import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './content.css'; // Import CSS to ensure it's included in build if configured, or we'll inject it manually

const CONTAINER_ID = 'temporalos-container';

function initialize() {
  // Prevent multiple injections
  if (document.getElementById(CONTAINER_ID)) {
    return;
  }

  console.log('[TemporalOS] Initializing Isolated World Content Script...');

  // Create container
  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  
  // Ensure high z-index and fixed positioning to stay on top
  Object.assign(container.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    zIndex: '2147483647', // Max z-index
    pointerEvents: 'none', // Let clicks pass through wrapper
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
  });

  document.body.appendChild(container);

  // Create Shadow DOM
  const shadowRoot = container.attachShadow({ mode: 'open' });

  // Inject Styles
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('content.css');
  shadowRoot.appendChild(styleLink);

  // Add some inline styles for the root to ensure visibility
  const style = document.createElement('style');
  style.textContent = `
    :host { 
      all: initial; 
      display: block; 
      font-family: 'Inter', sans-serif;
    }
    #temporalos-root {
      pointer-events: none;
    }
    /* Re-enable pointer events for actual UI elements */
    #temporalos-root > * {
      pointer-events: auto;
    }
  `;
  shadowRoot.appendChild(style);

  // Create React Root
  const rootDiv = document.createElement('div');
  rootDiv.id = 'temporalos-root';
  shadowRoot.appendChild(rootDiv);

  // Mount React App
  try {
    const root = createRoot(rootDiv);
    root.render(<App />);
    console.log('[TemporalOS] React App mounted successfully');
  } catch (error) {
    console.error('[TemporalOS] Error mounting React App:', error);
  }
}

// Listen for background messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TEMPORAL_MODE_UPDATE') {
    window.dispatchEvent(new CustomEvent('temporalos-mode-update', {
      detail: message
    }));
  }
});

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

