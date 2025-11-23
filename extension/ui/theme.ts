/**
 * TemporalOS Design Tokens
 * Design Language: "Apple Notes × Notion × Heidi"
 */

export const theme = {
  colors: {
    past: '#4C7AF2',
    present: '#E29A3B',
    future: '#2DA178',
    autoActive: '#4CAF50',
    text: {
      primary: '#1F1F1F',
      secondary: '#666666',
      muted: '#999999'
    },
    bg: {
      panel: 'rgba(255, 255, 255, 0.95)',
      glass: 'rgba(255, 255, 255, 0.8)'
    },
    border: '#E5E5E5',
    shadow: 'rgba(0, 0, 0, 0.06)'
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
  },
  borderRadius: {
    default: '12px',
    sm: '6px',
    lg: '16px'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px'
  },
  animation: {
    fadeSlide: '150ms ease-out',
    stagger: '80ms'
  },
  layout: {
    maxPanelWidth: '320px'
  }
} as const;
