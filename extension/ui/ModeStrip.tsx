/**
 * ModeStrip Component
 * Displays reasoning mode buttons and auto toggle
 */

import React from 'react';
import { ReasoningMode, ModeState } from '@shared/types';

interface ModeStripProps {
  currentMode: ModeState;
  onModeChange: (mode: ReasoningMode) => void;
  autoMode: boolean;
  onAutoToggle: () => void;
}

export const ModeStrip: React.FC<ModeStripProps> = ({
  currentMode,
  onModeChange,
  autoMode,
  onAutoToggle
}) => {
  const modes: Array<{ key: ReasoningMode; label: string }> = [
    { key: 'past', label: 'PAST' },
    { key: 'present', label: 'PRESENT' },
    { key: 'future', label: 'FUTURE' }
  ];

  return (
    <div className="temporalos-mode-strip">
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '12px' }}>
        <span style={{ fontSize: '18px' }}>🧠</span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em'
          }}
        >
          TemporalOS
        </span>
      </div>

      {/* Mode Buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {modes.map(({ key, label }) => {
          const isActive = currentMode.mode === key;
          return (
            <button
              key={key}
              className={`temporalos-mode-button ${key} ${isActive ? 'active' : ''}`}
              onClick={() => onModeChange(key)} // Always allow manual clicks
              disabled={false} // Never disable manual control
              style={{
                cursor: 'pointer',
                opacity: autoMode && !isActive ? 0.7 : 1 // Slightly dimmed when auto, but still clickable
              }}
            >
              <span className="temporalos-mode-indicator" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Auto Toggle with visual indicator */}
      <button
        onClick={onAutoToggle}
        style={{
          marginLeft: '12px',
          padding: '6px 12px',
          fontSize: '11px',
          fontWeight: 600,
          color: autoMode ? '#4CAF50' : 'var(--text-secondary)',
          background: autoMode 
            ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.1))' 
            : 'transparent',
          border: `1px solid ${autoMode ? '#4CAF50' : 'var(--border)'}`,
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: autoMode ? '0 0 20px rgba(76, 175, 80, 0.3)' : 'none'
        }}
      >
        {autoMode && (
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#4CAF50',
            animation: 'pulse 2s ease-in-out infinite',
            boxShadow: '0 0 10px rgba(76, 175, 80, 0.8)'
          }} />
        )}
        <span>{autoMode ? '🤖 AUTO ON' : 'AUTO OFF'}</span>
      </button>
      
      {/* Mode confidence indicator */}
      {autoMode && currentMode.mode !== 'auto' && (
        <div style={{
          marginLeft: '12px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span>📊</span>
          <span>{(currentMode.confidence * 100).toFixed(0)}% confidence</span>
        </div>
      )}
    </div>
  );
};
