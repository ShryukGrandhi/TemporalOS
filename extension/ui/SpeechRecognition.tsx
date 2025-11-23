/**
 * Speech Recognition Component
 * Visual indicator for speech recognition status
 */

import React, { useState, useEffect, useRef } from 'react';

interface SpeechRecognitionProps {
  onTranscript?: (transcript: string) => void;
  onModeDetected?: (mode: 'past' | 'present' | 'future') => void;
  onSpeechStart?: () => void;
  currentMode?: string;
  fullTranscript?: string; // Full accumulated transcript to display
}

export const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({
  onTranscript,
  onModeDetected,
  onSpeechStart,
  currentMode,
  fullTranscript
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(true);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('[SpeechRecognition] Not supported in this browser');
      return;
    }

    setIsSupported(true);
    shouldRestartRef.current = true;
    
    // Initialize recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening continuously
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    
    // Increase tolerance for pauses - don't cut off easily
    // These settings make it more tolerant of silence
    if ('webkitSpeechRecognition' in window) {
      // Chrome/Edge specific settings for longer tolerance
      (recognition as any).maxAlternatives = 1;
    }

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      // Only log once to reduce console spam
      if (!recognitionRef.current?.started) {
        console.log('[SpeechRecognition] Started');
        if (recognitionRef.current) {
          (recognitionRef.current as any).started = true;
        }
      }
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);

      // Send ONLY final transcripts to parent (to accumulate properly)
      if (finalTranscript && onTranscript) {
        console.log('[SpeechRecognition] 📝 Final transcript piece:', finalTranscript);
        onTranscript(finalTranscript);
      }

      // Check for "done" to stop completely
      if (finalTranscript) {
        const lowerText = finalTranscript.toLowerCase().trim();
        
        if (lowerText === 'done' || lowerText.includes(' done') || lowerText.startsWith('done ')) {
          console.log('[SpeechRecognition] "Done" detected - PERMANENTLY stopping recognition');
          
          // CRITICAL: Set flag to false FIRST, before stopping
          shouldRestartRef.current = false;
          
          // Clear any pending restart timers
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = null;
          }
          
          // Stop recognition
          setIsListening(false);
          try {
            recognition.stop();
          } catch (e) {
            console.log('[SpeechRecognition] Already stopped');
          }
          
          // Switch to future mode
          if (onModeDetected) {
            onModeDetected('future');
          }
          
          // IMPORTANT: Don't process any more results after "done"
          return;
        }
        
        // Detect other mode keywords
        if (onModeDetected) {
          if (lowerText.includes('past') || lowerText.includes('history')) {
            onModeDetected('past');
          } else if (lowerText.includes('present') || lowerText.includes('current')) {
            onModeDetected('present');
          } else if (lowerText.includes('future') || lowerText.includes('plan')) {
            onModeDetected('future');
          }
        }
      }

      // Notify speech start
      if (currentTranscript && onSpeechStart) {
        onSpeechStart();
      }
    };

    recognition.onerror = (event: any) => {
      console.log('[SpeechRecognition] Error event:', event.error);
      
      // Silently ignore common errors and keep going
      if (event.error === 'no-speech') {
        console.log('[SpeechRecognition] No speech detected, but continuing to listen...');
        return; // Just keep listening
      }
      
      if (event.error === 'aborted') {
        console.log('[SpeechRecognition] Aborted, will restart...');
        return; // Will restart via onend
      }
      
      if (event.error === 'network') {
        console.warn('[SpeechRecognition] Network error, continuing...');
        return; // Keep trying
      }
      
      // Only stop on critical errors
      if (event.error === 'audio-capture' || event.error === 'not-allowed') {
        console.error('[SpeechRecognition] Critical permission error:', event.error);
        setError(event.error);
        shouldRestartRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Don't update isListening here - we're restarting immediately
      
      // Double-check the restart flag - if false, NEVER restart
      if (!shouldRestartRef.current) {
        console.log('[SpeechRecognition] Restart prevented - shouldRestartRef is false (said done)');
        setIsListening(false);
        return;
      }
      
      // Auto-restart IMMEDIATELY - don't wait, to prevent cutoffs
      if (shouldRestartRef.current) {
        console.log('[SpeechRecognition] 🔄 Recognition ended, restarting immediately to prevent cutoff...');
        
        // Clear any old timers
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
        }
        
        // Restart with minimal delay (50ms) to prevent gaps
        restartTimeoutRef.current = setTimeout(() => {
          try {
            // Triple-check before actually restarting
            if (shouldRestartRef.current) {
              recognition.start();
              setIsListening(true);
            } else {
              console.log('[SpeechRecognition] Restart cancelled - flag changed');
              setIsListening(false);
            }
          } catch (e) {
            console.warn('[SpeechRecognition] Error restarting:', e);
            // If already started, that's fine
          }
        }, 50); // Very short delay - just enough to prevent race conditions
      }
    };

    recognitionRef.current = recognition;

    // Don't auto-start - wait for user click
    console.log('[SpeechRecognition] Ready. Click microphone to start.');

    return () => {
      shouldRestartRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, [onTranscript, onModeDetected, onSpeechStart]);

  if (!isSupported) {
    return null; // Don't render if not supported
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        pointerEvents: 'none'
      }}
    >
      {/* Full accumulated transcript preview (PRESENT mode only) */}
      {currentMode === 'present' && fullTranscript && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9))',
            color: '#333',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            maxWidth: '400px',
            maxHeight: '300px',
            overflowY: 'auto',
            wordBreak: 'break-word',
            animation: 'fadeInUp 0.3s ease-out',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            border: '2px solid #E29A3B',
            pointerEvents: 'auto'
          }}
        >
          <div style={{ 
            fontSize: '11px', 
            fontWeight: 700, 
            color: '#E29A3B', 
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            📋 Captured for AI Analysis
          </div>
          {fullTranscript}
        </div>
      )}
      
      {/* Error notification */}
      {error && error !== 'no-speech' && error !== 'aborted' && (
        <div
          style={{
            background: '#E24A4A',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            pointerEvents: 'auto'
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Microphone indicator */}
      <div
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: isListening
            ? 'linear-gradient(45deg, #00d9ff, #00aaff)'
            : '#4A90E2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isListening
            ? '0 0 0 0 rgba(0, 217, 255, 0.7)'
            : '0 4px 12px rgba(0,0,0,0.2)',
          animation: isListening ? 'pulse 1.5s infinite' : 'none',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          pointerEvents: 'auto'
        }}
        title={isListening ? 'Listening...' : 'Click to start'}
        onClick={() => {
          if (isListening) {
            // Stop
            shouldRestartRef.current = false;
            if (restartTimeoutRef.current) {
              clearTimeout(restartTimeoutRef.current);
            }
            recognitionRef.current?.stop();
          } else {
            // Start
            shouldRestartRef.current = true;
            try {
              recognitionRef.current?.start();
            } catch (e) {
              console.error('[SpeechRecognition] Failed to start:', e);
            }
          }
        }}
      >
        <span style={{ fontSize: '24px', color: 'white' }}>
          {isListening ? '🎤' : '🎙️'}
        </span>
      </div>

      {/* Current mode indicator */}
      {currentMode && (
        <div
          style={{
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          {currentMode}
        </div>
      )}
    </div>
  );
};
