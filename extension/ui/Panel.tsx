/**
 * Panel Component
 * Displays contextual information based on reasoning mode
 */

import React, { useState, useEffect } from 'react';
import { ReasoningMode, PanelContent } from '@shared/types';
import { PrescriptionRecommendation } from '@shared/reasoning-model';
import { KnowledgeGraph } from './KnowledgeGraph';
import { ConfirmationPanel } from './ConfirmationPanel';
import { api } from './api';

interface PanelProps {
  mode: ReasoningMode;
  content: PanelContent | null;
  isLoading: boolean;
  sessionId?: string;
  liveTranscript?: string; // Live transcript from speech recognition
}

export const Panel: React.FC<PanelProps> = ({ mode, content, isLoading, sessionId, liveTranscript }) => {
  const [showGraph, setShowGraph] = useState(false);  // Default to hidden
  const [showNormalView, setShowNormalView] = useState(true);  // Default to normal view
  const [isClosed, setIsClosed] = useState(false);
  const [recommendation, setRecommendation] = useState<PrescriptionRecommendation | null>(null);
  const sessionIdToUse = sessionId || api.getSessionId() || '';
  
  // Log mode changes for debugging
  useEffect(() => {
    console.log('[Panel] Mode changed to:', mode, 'Session ID:', sessionIdToUse);
  }, [mode, sessionIdToUse]);

  // Default to normal view only, load recommendation for future mode
  useEffect(() => {
    // Reset to normal view on mode change
    setShowGraph(false);
    setShowNormalView(true);
    
    // Load recommendation for future mode
    if (mode === 'future' && sessionIdToUse) {
      console.log('[Panel] Loading recommendation for future mode...');
      loadRecommendation();
    } else {
      setRecommendation(null);
    }
  }, [mode, sessionIdToUse, liveTranscript]); // Re-run when transcript changes

  const loadRecommendation = async () => {
    // Generate a medication recommendation based on patient context using Gemini AI
    try {
      console.log('[Panel] Requesting AI recommendation...');
      
      // Get recent transcript from speech recognition
      const recentTranscript = liveTranscript || '';
      
      console.log('[Panel] 📝 Transcript to send to Gemini:', recentTranscript);
      console.log('[Panel] 📝 Transcript length:', recentTranscript.length, 'characters');
      
      // Fetch patient data for context - use actual patient ID from session or URL
      // Extract patient ID from URL or use a real source, NOT hardcoded demo
      const urlParams = new URLSearchParams(window.location.search);
      const patientId = urlParams.get('patientId') || 'unknown-patient';
      
      console.log('[Panel] Loading recommendation for patient:', patientId);
      
      const patientData = await api.getPatientData(patientId);
      
      // Fetch current medications
      const logsResponse = await fetch(`http://localhost:3000/api/medications/logs/${sessionIdToUse}`);
      const logsData = await logsResponse.json();
      const medicationLogs = logsData.logs || [];
      
      console.log('[Panel] Found', medicationLogs.length, 'medications in history');
      
      // Build patient context - NO DEMO/FALLBACK DATA
      const patientContext = {
        age: patientData?.demographics?.age,
        gender: patientData?.demographics?.gender,
        currentMedications: medicationLogs.map((log: any) => ({
          name: log.medication,
          dosage: log.dosage,
          indication: log.analysis?.classification?.indication || ''
        })),
        conditions: [] as string[],
        allergies: [] as string[],
        labs: patientData?.labs?.map((lab: any) => ({
          name: lab.name,
          value: lab.value,
          unit: lab.unit
        })) || [],
        transcript: recentTranscript // Include live transcript for allergy detection
      };
      
      // Extract conditions from medication analyses
      medicationLogs.forEach((log: any) => {
        if (log.analysis?.graphNodes) {
          log.analysis.graphNodes.forEach((node: any) => {
            if (node.type === 'condition' && !patientContext.conditions.includes(node.label)) {
              patientContext.conditions.push(node.label);
            }
          });
        }
      });
      
      // Check for allergies in transcript
      if (recentTranscript.toLowerCase().includes('allergic to')) {
        const allergyMatch = recentTranscript.match(/allergic to (\w+)/i);
        if (allergyMatch && allergyMatch[1]) {
          patientContext.allergies.push(allergyMatch[1]);
          console.log('[Panel] Detected allergy from transcript:', allergyMatch[1]);
        }
      }
      
      console.log('[Panel] 📊 Patient context summary:');
      console.log('  - Current meds:', patientContext.currentMedications.length);
      console.log('  - Conditions:', patientContext.conditions.length);
      console.log('  - Allergies:', patientContext.allergies.length);
      console.log('  - Labs:', patientContext.labs.length);
      console.log('  - 🎤 Transcript included:', !!patientContext.transcript);
      console.log('  - 🎤 Transcript preview:', patientContext.transcript?.substring(0, 100) || '(empty)');
      
      // Request recommendation from backend
      const response = await fetch('http://localhost:3000/api/recommendations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdToUse,
          patientId,
          patientContext
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get recommendation: ${response.statusText}`);
      }
      
      const recommendationData = await response.json();
      console.log('[Panel] AI recommendation received:', recommendationData);
      
      setRecommendation(recommendationData);
    } catch (error) {
      console.error('[Panel] Error loading recommendation:', error);
      
      // Fallback recommendation
      setRecommendation({
        medication: 'Unable to generate recommendation',
        dosage: 'N/A',
        duration: 'N/A',
        confidence: 0,
        reasoning: [
          'Error connecting to recommendation service',
          'Please check backend server is running',
          'Ensure Gemini API key is configured'
        ],
        safetyChecklist: {
          renalDosing: false,
          drugInteractions: false,
          allergies: false,
          guidelineAlignment: false
        },
        citations: []
      });
    }
  };

  const handleApprove = async () => {
    if (!recommendation || !sessionIdToUse) return;
    console.log('[Panel] Approving medication:', recommendation.medication);
    
    try {
      // Log the medication to the system
      await api.confirmMedication({
        sessionId: sessionIdToUse,
        patientId: 'DEMO-PATIENT-001',
        medication: recommendation.medication,
        dosage: recommendation.dosage,
        startDate: new Date().toISOString().split('T')[0],
        confirmedBy: 'TemporalOS'
      });
      
      exportRecommendation(recommendation, 'approved');
      showNotification(`✅ Approved ${recommendation.medication}!`);
      setRecommendation(null);
    } catch (error) {
      console.error('[Panel] Error approving medication:', error);
      showNotification('❌ Error approving medication');
    }
  };

  const handleModify = () => {
    if (!recommendation) return;
    const newDosage = prompt(`Modify dosage for ${recommendation.medication}:`, recommendation.dosage);
    if (newDosage) {
      setRecommendation({
        ...recommendation,
        dosage: newDosage
      });
      showNotification('📝 Dosage modified');
    }
  };

  const handleReject = (reason: any) => {
    if (!recommendation) return;
    exportRecommendation(recommendation, 'rejected', reason);
    showNotification('🚫 Medication rejected');
    setRecommendation(null);
  };

  const exportRecommendation = (rec: PrescriptionRecommendation, action: string, reason?: any) => {
    const exportData = {
      timestamp: new Date().toISOString(),
      action,
      medication: rec.medication,
      dosage: rec.dosage,
      duration: rec.duration,
      confidence: `${(rec.confidence * 100).toFixed(0)}%`,
      reasoning: rec.reasoning,
      safetyChecklist: rec.safetyChecklist,
      citations: rec.citations,
      ...(reason && { rejectionReason: reason })
    };

    // Format as clean, readable text
    const exportText = `
MEDICATION DECISION EXPORT
Generated: ${exportData.timestamp}

Action: ${action.toUpperCase()}
Medication: ${exportData.medication}
Dosage: ${exportData.dosage}
Duration: ${exportData.duration}
Confidence: ${exportData.confidence}

REASONING:
${exportData.reasoning.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

SAFETY CHECKLIST:
✓ Renal Dosing: ${exportData.safetyChecklist.renalDosing ? 'Verified' : 'Not verified'}
✓ Drug Interactions: ${exportData.safetyChecklist.drugInteractions ? 'None found' : 'Check required'}
✓ Allergies: ${exportData.safetyChecklist.allergies ? 'None documented' : 'Check required'}
✓ Guideline Alignment: ${exportData.safetyChecklist.guidelineAlignment ? 'Meets criteria' : 'Review required'}

CITATIONS:
${exportData.citations.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}
${reason ? `\nREJECTION REASON:\n${JSON.stringify(reason, null, 2)}` : ''}
`;

    // Copy to clipboard
    navigator.clipboard.writeText(exportText).then(() => {
      console.log('[Panel] Recommendation exported to clipboard');
    }).catch(err => {
      console.error('[Panel] Failed to copy to clipboard:', err);
    });

    // Also log to console for easy access
    console.log('[Panel] EXPORT DATA:', exportText);
  };

  const showNotification = (message: string) => {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 24px;
      background: linear-gradient(135deg, #4A90E2, #357ABD);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 999999;
      font-size: 14px;
      font-weight: 600;
      animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  };

  const getModeConfig = () => {
    switch (mode) {
      case 'past':
        return {
          title: 'Historical Context',
          icon: '📜'
        };
      case 'present':
        return {
          title: 'Current Evaluation',
          icon: '🔍'
        };
      case 'future':
        return {
          title: 'Future Planning',
          icon: '📋'
        };
      default:
        return {
          title: 'Analyzing...',
          icon: '🧠'
        };
    }
  };

  const config = getModeConfig();

  // If panel is closed, show reopen button
  if (isClosed) {
    return (
      <button
        onClick={() => setIsClosed(false)}
        style={{
          position: 'fixed',
          top: '60px',
          right: '20px',
          padding: '12px 20px',
          backgroundColor: '#4A90E2',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 999998,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>📊</span>
        <span>Open TemporalOS</span>
      </button>
    );
  }

  return (
    <div className="temporalos-panel">
      {/* Header */}
      <div className="temporalos-panel-header">
        <h3 className="temporalos-panel-title">
          {config.icon} {config.title}
        </h3>
        <button 
          className="temporalos-panel-close" 
          onClick={() => setIsClosed(true)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666',
            padding: '0 8px'
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="temporalos-panel-content">
        {/* View Toggle */}
        <div style={{ 
          padding: '12px', 
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => {
                setShowGraph(true);
                setShowNormalView(false);
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                backgroundColor: showGraph && !showNormalView ? '#4A90E2' : '#f0f0f0',
                color: showGraph && !showNormalView ? 'white' : '#666',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: showGraph && !showNormalView ? 600 : 400
              }}
            >
              📊 Graph
            </button>
            <button
              onClick={() => {
                setShowGraph(false);
                setShowNormalView(true);
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                backgroundColor: showNormalView && !showGraph ? '#4A90E2' : '#f0f0f0',
                color: showNormalView && !showGraph ? 'white' : '#666',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: showNormalView && !showGraph ? 600 : 400
              }}
            >
              📋 Normal View
            </button>
          </div>
          <button
            onClick={() => {
              setShowGraph(true);
              setShowNormalView(true);
            }}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              backgroundColor: showGraph && showNormalView ? '#4A90E2' : '#f0f0f0',
              color: showGraph && showNormalView ? 'white' : '#666',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: showGraph && showNormalView ? 600 : 400
            }}
          >
            Both
          </button>
        </div>

        {/* Knowledge Graph */}
        {showGraph && sessionIdToUse && (
          <div style={{ padding: '16px', minHeight: '400px', borderBottom: showNormalView ? '1px solid #eee' : 'none' }}>
            <KnowledgeGraph sessionId={sessionIdToUse} />
          </div>
        )}

        {/* Panel Content */}
        {showNormalView && (
          mode === 'future' && recommendation ? (
            // Show ConfirmationPanel for future mode
            <ConfirmationPanel
              recommendation={recommendation}
              onApprove={handleApprove}
              onModify={handleModify}
              onReject={handleReject}
            />
          ) : mode === 'present' ? (
            // Show live transcript in present mode
            <div style={{ padding: '16px' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
                animation: 'fadeIn 0.5s ease-out'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'rgba(245, 158, 11, 1)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#f59e0b',
                    animation: 'pulse 2s ease-in-out infinite'
                  }} />
                  Live Transcript
                </div>
                <div style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: 'var(--text-primary)',
                  minHeight: '60px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  fontFamily: 'monospace'
                }}>
                  {liveTranscript || 'Listening for speech...'}
                </div>
              </div>
              
              {/* Show panel content items below transcript */}
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <div className="temporalos-loading" />
                  <div style={{ 
                    marginTop: '12px', 
                    fontSize: '13px', 
                    color: 'var(--text-muted)' 
                  }}>
                    Analyzing context...
                  </div>
                </div>
              ) : content && content.items.length > 0 ? (
                <>
                  {content.items.map((item, index) => (
                    <div
                      key={item.id}
                      className={`temporalos-panel-item ${item.highlight ? 'highlight' : ''}`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="temporalos-panel-item-label">
                        {item.label}
                      </div>
                      <div className="temporalos-panel-item-value">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </>
              ) : null}
            </div>
          ) : isLoading ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div className="temporalos-loading" />
              <div style={{ 
                marginTop: '12px', 
                fontSize: '13px', 
                color: 'var(--text-muted)' 
              }}>
                Analyzing context...
              </div>
            </div>
          ) : content && content.items.length > 0 ? (
            <>
              {content.items.map((item, index) => (
                <div
                  key={item.id}
                  className={`temporalos-panel-item ${item.highlight ? 'highlight' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="temporalos-panel-item-label">
                    {item.label}
                  </div>
                  <div className="temporalos-panel-item-value">
                    {item.value}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="temporalos-panel-empty">
              No relevant information detected for this mode.
            </div>
          )
        )}
      </div>
    </div>
  );
};
