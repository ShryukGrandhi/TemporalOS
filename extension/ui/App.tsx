/**
 * Main App Component
 * Orchestrates ModeStrip and Panel
 */

import React, { useState, useEffect, useRef } from 'react';
import { ModeStrip } from './ModeStrip';
import { Panel } from './Panel';
import { SpeechRecognition } from './SpeechRecognition';
import { ReasoningMode, ModeState, PanelContent } from '@shared/types';
import { theme } from './theme';
import { api } from './api';

export const App: React.FC = () => {
  const [modeState, setModeState] = useState<ModeState>({
    mode: 'auto',
    confidence: 0,
    reason: 'Initializing...',
    timestamp: Date.now()
  });
  const [autoMode, setAutoMode] = useState(true);
  const [panelContent, setPanelContent] = useState<PanelContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>(''); // Live transcript from speech recognition
  const [inFutureLock, setInFutureLock] = useState(false); // Lock to prevent going back from future
  const analysisIntervalRef = useRef<number | null>(null);

  // Initialize session and start auto-detection
  useEffect(() => {
    console.log('[TemporalOS] Initializing application...');
    
    api.initializeSession().then(async (id) => {
      setSessionId(id);
      console.log('[TemporalOS] Session initialized:', id);
      
      if (autoMode) {
        console.log('[TemporalOS] Starting auto-detection (auto mode is ON)');
        startAutoDetection();
      }
      // Start medication detection
      startMedicationDetection(id);
      // Don't load demo medications on init - only load when mode is 'past'
    });

    // Listen for mode switch events from Panel (e.g., after approving medication)
    const handleModeSwitchEvent = (event: any) => {
      const targetMode = event.detail;
      console.log('[TemporalOS] Mode switch event received:', targetMode);
      handleModeChange(targetMode, true); // true = manual
    };
    
    window.addEventListener('temporalos:switchMode', handleModeSwitchEvent);

    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
      window.removeEventListener('temporalos:switchMode', handleModeSwitchEvent);
    };
  }, []);
  
  // Re-start auto-detection if autoMode changes
  useEffect(() => {
    if (autoMode && sessionId) {
      startAutoDetection();
    }
  }, [autoMode, sessionId]);

  // Listen for mode updates from background script
  useEffect(() => {
    const handleModeUpdate = (event: CustomEvent) => {
      const mode = event.detail;
      setModeState({
        mode: mode.mode || 'auto',
        confidence: mode.confidence || 0,
        reason: mode.reason || '',
        timestamp: Date.now()
      });
    };

    window.addEventListener('temporalos-mode-update', handleModeUpdate as EventListener);
    return () => {
      window.removeEventListener('temporalos-mode-update', handleModeUpdate as EventListener);
    };
  }, []);

  // Fetch panel content when mode changes
  useEffect(() => {
    if (modeState.mode !== 'auto' && (modeState.mode === 'past' || modeState.mode === 'present' || modeState.mode === 'future')) {
      fetchPanelContent(modeState.mode);
      api.updateSession(modeState.mode);
      
      // Load demo medications ONLY when mode is 'past'
      if (modeState.mode === 'past' && sessionId) {
        loadDemoMedications(sessionId);
      }
      
      // Clear transcript when switching to PAST mode
      if (modeState.mode === 'past') {
        console.log('[TemporalOS] Switched to PAST - clearing transcript');
        setLiveTranscript('');
      }
      
      // Keep transcript when in PRESENT or FUTURE (it's needed for Gemini)
      if (modeState.mode === 'future' && liveTranscript) {
        console.log('[TemporalOS] 📋 FUTURE mode - transcript ready for Gemini:', liveTranscript.substring(0, 100));
      }
    }
  }, [modeState.mode, sessionId]);

  const startAutoDetection = () => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
    }

    console.log('[TemporalOS] Starting auto-detection...');

    // Analyze every 3 seconds for more responsive detection
    analysisIntervalRef.current = window.setInterval(async () => {
      await performAnalysis();
    }, 3000);

    // Initial analysis
    performAnalysis();

    // Also listen for navigation changes
    window.addEventListener('popstate', performAnalysis);
    window.addEventListener('hashchange', performAnalysis);
    
    // Listen for URL changes (for SPAs)
    let lastUrl = window.location.href;
    const urlObserver = setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        console.log('[TemporalOS] URL changed, re-analyzing...');
        performAnalysis();
      }
    }, 1000);
    
    return () => {
      window.removeEventListener('popstate', performAnalysis);
      window.removeEventListener('hashchange', performAnalysis);
      clearInterval(urlObserver);
    };
  };

  const performAnalysis = async () => {
    if (!autoMode) return; // Don't analyze if auto mode is off
    if (inFutureLock) {
      console.log('[TemporalOS] In future lock - skipping auto-analysis');
      return; // Don't analyze if we're locked in future mode
    }
    
    try {
      console.log('[TemporalOS] Performing auto-analysis...');
      
      // Get transcript from page (simplified - would need actual EMR integration)
      const transcript = extractTranscriptFromPage();
      const recentActions = detectRecentActions();

      // Analyze text for entities and temporal tags
      const nlpResult = transcript ? await api.analyzeText(transcript) : null;

      // Classify mode
      const classification = await api.classifyMode({
        transcript,
        context: {
          entities: nlpResult?.entities,
          temporalTags: nlpResult?.temporalTags,
          recentActions
        }
      });

      console.log('[TemporalOS] Mode detected:', classification.mode, 'confidence:', classification.confidence, 'reason:', classification.reason);

      // Only update if mode actually changed
      if (classification.mode !== modeState.mode) {
        console.log('[TemporalOS] Mode changed from', modeState.mode, 'to', classification.mode);
        setModeState({
          mode: classification.mode,
          confidence: classification.confidence,
          reason: classification.reason,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('[TemporalOS] Error in auto detection:', error);
    }
  };

  const extractTranscriptFromPage = (): string | undefined => {
    // Extract visible text from the page for analysis
    try {
      // Get text from main content areas
      const mainContent = document.querySelector('main, [role="main"], #main, .main-content');
      if (mainContent) {
        const text = mainContent.textContent || '';
        return text.slice(0, 5000); // Limit to 5000 characters
      }
      
      // Fallback to body
      return document.body?.textContent?.slice(0, 5000);
    } catch (error) {
      console.error('[TemporalOS] Error extracting transcript:', error);
      return undefined;
    }
  };

  const detectRecentActions = (): string[] => {
    // Detect user actions and context
    const actions: string[] = [];
    
    try {
      // Check if user is scrolling
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop > 200) {
        actions.push('scrolling');
      }
      
      // Check if user is typing
      const activeElement = document.activeElement;
      if (activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      )) {
        actions.push('typing');
      }
      
      // Check for visible buttons/forms (using valid CSS selectors only)
      const prescribeButtons = document.querySelectorAll('[class*="prescribe"], [class*="order"]');
      if (prescribeButtons.length > 0) {
        actions.push('prescription_interface_visible');
      }
      
      // Also check button text content
      const allButtons = document.querySelectorAll('button');
      for (const button of Array.from(allButtons)) {
        const text = button.textContent?.toLowerCase() || '';
        if (text.includes('prescribe') || text.includes('order') || text.includes('prescription')) {
          actions.push('prescription_interface_visible');
          break;
        }
      }
      
      const historyElements = document.querySelectorAll('[class*="history"], [class*="past"]');
      if (historyElements.length > 0) {
        actions.push('history_view');
      }
    } catch (error) {
      console.error('[TemporalOS] Error detecting actions:', error);
    }
    
    return actions;
  };

  const fetchPanelContent = async (mode: 'past' | 'present' | 'future') => {
    setIsLoading(true);
    try {
      const content = await api.getPanelContent(mode);
      setPanelContent(content);
      setIsLoading(false);
    } catch (error) {
      console.error('[TemporalOS] Error fetching panel content:', error);
      setIsLoading(false);
    }
  };

  const handleModeChange = (mode: ReasoningMode, isManual: boolean = false) => {
    // If locked and it's an automatic change (not manual), block it
    if (inFutureLock && !isManual && mode !== 'future') {
      console.log('[TemporalOS] ⛔ Auto-mode blocked from switching from future');
      return;
    }
    
    // Manual changes are always allowed
    if (isManual) {
      console.log('[TemporalOS] ✅ Manual mode change allowed:', mode);
      // Unlock if manually going back
      if (inFutureLock && mode !== 'future') {
        console.log('[TemporalOS] 🔓 Future lock released by manual action');
        setInFutureLock(false);
      }
    }
    
    setModeState({
      ...modeState,
      mode,
      timestamp: Date.now()
    });
    api.updateSession(mode);
  };

  const handleAutoToggle = () => {
    // Can't enable auto mode if we're locked in future
    if (inFutureLock && !autoMode) {
      console.log('[TemporalOS] ⛔ Cannot enable auto mode - locked in future');
      return;
    }
    
    const newAutoMode = !autoMode;
    setAutoMode(newAutoMode);

    console.log('[TemporalOS] Auto mode toggled:', newAutoMode ? 'ON' : 'OFF');

    if (newAutoMode) {
      startAutoDetection();
      // Immediately analyze
      performAnalysis();
    } else {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
    }
  };

  // Detect medication confirmations on the page
  const startMedicationDetection = (sessionId: string) => {
    // Monitor for medication confirmation buttons/clicks
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Look for medication confirmation patterns
            const confirmButtons = node.querySelectorAll?.(
              'button[class*="confirm"], button[class*="approve"], button[class*="prescribe"], ' +
              '[data-action="confirm-medication"], [data-action="prescribe"]'
            ) || [];

            confirmButtons.forEach((button: any) => {
              if (!button.dataset.temporalosWatched) {
                button.dataset.temporalosWatched = 'true';
                button.addEventListener('click', async (e: Event) => {
                  e.stopPropagation();
                  await handleMedicationConfirmation(button, sessionId);
                });
              }
            });

            // Also watch for medication form submissions
            const forms = node.querySelectorAll?.('form[class*="medication"], form[class*="prescription"]') || [];
            forms.forEach((form: any) => {
              if (!form.dataset.temporalosWatched) {
                form.dataset.temporalosWatched = 'true';
                form.addEventListener('submit', async (e: Event) => {
                  await handleMedicationFormSubmit(form, sessionId);
                });
              }
            });
          }
        });
      });
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also check existing elements
    setTimeout(() => {
      const existingButtons = document.querySelectorAll(
        'button[class*="confirm"], button[class*="approve"], button[class*="prescribe"]'
      );
      existingButtons.forEach((button: any) => {
        if (!button.dataset.temporalosWatched) {
          button.dataset.temporalosWatched = 'true';
          button.addEventListener('click', async (e: Event) => {
            e.stopPropagation();
            await handleMedicationConfirmation(button, sessionId);
          });
        }
      });
    }, 1000);
  };

  const handleMedicationConfirmation = async (button: HTMLElement, sessionId: string) => {
    try {
      // Try to extract medication info from the DOM
      const medicationInfo = extractMedicationInfo(button);
      
      if (medicationInfo) {
        console.log('[TemporalOS] Medication confirmation detected:', medicationInfo);
        
        // Extract patient ID from URL or page
        const patientId = extractPatientId() || 'unknown';
        
        // Confirm medication via API
        const result = await api.confirmMedication({
          sessionId,
          patientId,
          medication: medicationInfo.medication,
          dosage: medicationInfo.dosage || '',
          ...(medicationInfo.route && { route: medicationInfo.route }),
          ...(medicationInfo.frequency && { frequency: medicationInfo.frequency })
        });

        console.log('[TemporalOS] Medication logged:', result);
        
        // Show notification
        showNotification(`Medication ${medicationInfo.medication} confirmed and analyzed!`);
      }
    } catch (error) {
      console.error('[TemporalOS] Error handling medication confirmation:', error);
    }
  };

  const handleMedicationFormSubmit = async (form: HTMLFormElement, sessionId: string) => {
    try {
      const formData = new FormData(form);
      const medication = formData.get('medication') || formData.get('medicationName') || '';
      const dosage = formData.get('dosage') || formData.get('dose') || '';
      const route = formData.get('route') || '';
      const frequency = formData.get('frequency') || '';

      if (medication) {
        const patientId = extractPatientId() || 'unknown';
        
        await api.confirmMedication({
          sessionId,
          patientId,
          medication: medication.toString(),
          dosage: dosage.toString(),
          route: route.toString(),
          frequency: frequency.toString()
        });

        showNotification(`Medication ${medication} confirmed and analyzed!`);
      }
    } catch (error) {
      console.error('[TemporalOS] Error handling medication form:', error);
    }
  };

  const extractMedicationInfo = (element: HTMLElement): { medication: string; dosage?: string; route?: string; frequency?: string } | null => {
    // Try to find medication info near the button
    const container = element.closest('[class*="medication"], [class*="prescription"], [class*="order"]') || element.parentElement;
    
    if (!container) return null;

    // Look for medication name
    const medicationEl = container.querySelector('[class*="medication-name"], [data-medication], input[name*="medication"]') as HTMLElement;
    const medication = medicationEl?.textContent?.trim() || 
                      medicationEl?.getAttribute('data-medication') ||
                      (medicationEl as HTMLInputElement)?.value ||
                      '';

    if (!medication) return null;

    // Look for dosage
    const dosageEl = container.querySelector('[class*="dosage"], [data-dosage], input[name*="dosage"]') as HTMLElement;
    const dosage = dosageEl?.textContent?.trim() || 
                   dosageEl?.getAttribute('data-dosage') ||
                   (dosageEl as HTMLInputElement)?.value ||
                   '';

    // Look for route
    const routeEl = container.querySelector('[class*="route"], [data-route], input[name*="route"]') as HTMLElement;
    const route = routeEl?.textContent?.trim() || 
                  routeEl?.getAttribute('data-route') ||
                  (routeEl as HTMLInputElement)?.value ||
                  '';

    // Look for frequency
    const frequencyEl = container.querySelector('[class*="frequency"], [data-frequency], input[name*="frequency"]') as HTMLElement;
    const frequency = frequencyEl?.textContent?.trim() || 
                      frequencyEl?.getAttribute('data-frequency') ||
                      (frequencyEl as HTMLInputElement)?.value ||
                      '';

    return {
      medication,
      ...(dosage && { dosage }),
      ...(route && { route }),
      ...(frequency && { frequency })
    };
  };

  const extractPatientId = (): string | null => {
    // Try to extract from URL
    const urlMatch = window.location.href.match(/patient[\/=]([^\/\?&]+)/i);
    if (urlMatch) return urlMatch[1];

    // Try to find in DOM
    const patientEl = document.querySelector('[data-patient-id], [class*="patient-id"]') as HTMLElement;
    if (patientEl) {
      return patientEl.getAttribute('data-patient-id') || patientEl.textContent?.trim() || null;
    }

    return null;
  };

  const showNotification = (message: string) => {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4A90E2;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 9999999;
      font-size: 14px;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  // Load demo medications for the knowledge graph
  const loadDemoMedications = async (sessionId: string) => {
    try {
      console.log('[TemporalOS] Loading demo medications for session:', sessionId);
      
      const demoMedications = [
        { medication: 'Lisinopril', dosage: '10mg', route: 'oral', frequency: 'once daily' },
        { medication: 'Metformin', dosage: '500mg twice daily', route: 'oral', frequency: 'twice daily' },
        { medication: 'Atorvastatin', dosage: '20mg', route: 'oral', frequency: 'once daily' },
        { medication: 'Aspirin', dosage: '81mg', route: 'oral', frequency: 'once daily' }
      ];

      const patientId = extractPatientId() || 'DEMO-PATIENT-001';
      console.log('[TemporalOS] Using patient ID:', patientId);

      // Confirm each demo medication with a small delay to avoid rate limiting
      for (let i = 0; i < demoMedications.length; i++) {
        const med = demoMedications[i];
        try {
          console.log(`[TemporalOS] Logging demo medication ${i + 1}/${demoMedications.length}: ${med.medication}`);
          const result = await api.confirmMedication({
            sessionId,
            patientId,
            ...med
          });
          console.log(`[TemporalOS] ✅ Demo medication logged: ${med.medication}`, result);
          
          // Small delay between requests
          if (i < demoMedications.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error: any) {
          console.error(`[TemporalOS] ❌ Failed to log demo medication ${med.medication}:`, error);
          // Continue with next medication even if one fails
        }
      }
      
      console.log('[TemporalOS] ✅ Finished loading demo medications');
    } catch (error) {
      console.error('[TemporalOS] ❌ Error loading demo medications:', error);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 999999,
        pointerEvents: 'none',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      {/* Mode Strip */}
      <div style={{ pointerEvents: 'auto' }}>
        <ModeStrip
          currentMode={modeState}
          onModeChange={(mode) => handleModeChange(mode, true)} // Manual click = true
          autoMode={autoMode}
          onAutoToggle={handleAutoToggle}
        />
      </div>

      {/* Panel - positioned below strip */}
      {modeState.mode !== 'auto' && (
        <div
          style={{
            marginTop: theme.spacing.sm,
            marginLeft: theme.spacing.lg,
            pointerEvents: 'auto'
          }}
        >
              <Panel
                mode={modeState.mode}
                content={panelContent}
                isLoading={isLoading}
                sessionId={sessionId || undefined}
                liveTranscript={liveTranscript}
              />
        </div>
      )}

      {/* Speech Recognition Indicator */}
      <SpeechRecognition
        currentMode={modeState.mode}
        fullTranscript={liveTranscript}
        onTranscript={(transcriptPiece) => {
          console.log('[TemporalOS] 🎤 Speech piece received:', transcriptPiece);
          // Accumulate transcript (append new pieces)
          setLiveTranscript(prev => {
            const updated = prev ? `${prev} ${transcriptPiece}` : transcriptPiece;
            console.log('[TemporalOS] 📋 Full accumulated transcript:', updated);
            return updated;
          });
        }}
        onModeDetected={(mode) => {
          console.log('[TemporalOS] Mode detected from speech:', mode);
          
          // If switching to "future", lock it and stop auto mode
          if (mode === 'future') {
            console.log('[TemporalOS] 🔒 FUTURE LOCK ENGAGED - Auto-mode cannot go back');
            setInFutureLock(true);
            setAutoMode(false);
            // Stop auto-detection interval
            if (analysisIntervalRef.current) {
              clearInterval(analysisIntervalRef.current);
              analysisIntervalRef.current = null;
            }
          }
          
          // Disable auto mode when manually switching via speech
          if (autoMode) {
            setAutoMode(false);
          }
          handleModeChange(mode, false); // Speech detection = automatic
        }}
        onSpeechStart={() => {
          // Don't auto-switch if we're locked in future mode
          if (inFutureLock) {
            console.log('[TemporalOS] Future lock active - ignoring speech start auto-switch');
            return;
          }
          
          // Auto-switch from past to present when user starts talking
          if (modeState.mode === 'past') {
            console.log('[TemporalOS] Speech started - auto-switching from past to present');
            if (autoMode) {
              setAutoMode(false);
            }
            handleModeChange('present', false); // Auto-switch = automatic
          }
        }}
      />
    </div>
  );
};

