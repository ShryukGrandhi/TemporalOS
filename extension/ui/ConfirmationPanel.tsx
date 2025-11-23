/**
 * Confirmation Panel Component
 * Step 6: Output with APPROVE/MODIFY/REJECT buttons
 */

import React, { useState } from 'react';
import { PrescriptionRecommendation, ConfirmationRequest } from '@shared/reasoning-model';

interface ConfirmationPanelProps {
  recommendation: PrescriptionRecommendation;
  onApprove: () => void;
  onModify: () => void;
  onReject: (reason: ConfirmationRequest['rejectionReason']) => void;
}

export const ConfirmationPanel: React.FC<ConfirmationPanelProps> = ({
  recommendation,
  onApprove,
  onModify,
  onReject
}) => {
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<ConfirmationRequest['rejectionReason']>({
    cost: false,
    priorIntolerance: false,
    clinicalNuance: false,
    patientPreference: false
  });
  const [isSchedulingCall, setIsSchedulingCall] = useState(false);
  const [callStatus, setCallStatus] = useState<string | null>(null);

  const handleReject = () => {
    if (showRejectionForm) {
      onReject(rejectionReason);
    } else {
      setShowRejectionForm(true);
    }
  };

  const handleScheduleCall = async () => {
    setIsSchedulingCall(true);
    setCallStatus('Initiating call...');

    try {
      console.log('[ConfirmationPanel] 📞 Scheduling follow-up call via VAPI');
      
      const response = await fetch('http://localhost:3000/api/vapi/call/outbound', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: '+18582108648', // Demo number
          patientName: 'Demo Patient',
          purpose: `Follow-up for ${recommendation.medication} ${recommendation.dosage} prescription`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to initiate call');
      }

      const result = await response.json();
      console.log('[ConfirmationPanel] ✅ Call initiated:', result);
      
      setCallStatus(`✅ Call initiated successfully! Call ID: ${result.callId}`);
      
      // Clear status after 5 seconds
      setTimeout(() => {
        setCallStatus(null);
        setIsSchedulingCall(false);
      }, 5000);

    } catch (error) {
      console.error('[ConfirmationPanel] ❌ Error scheduling call:', error);
      setCallStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      setTimeout(() => {
        setCallStatus(null);
        setIsSchedulingCall(false);
      }, 5000);
    }
  };

  return (
    <div className="temporalos-confirmation-panel">
      {/* Recommendation Header */}
      <div className="temporalos-recommendation-header">
        <h3>Recommended: {recommendation.medication}</h3>
        <div className="temporalos-dosage">{recommendation.dosage}</div>
        <div className="temporalos-confidence">
          Confidence: {(recommendation.confidence * 100).toFixed(0)}%
        </div>
      </div>

      {/* Reasoning */}
      <div className="temporalos-reasoning">
        <h4>Reasoning:</h4>
        <ul>
          {recommendation.reasoning.map((reason, idx) => (
            <li key={idx}>{reason}</li>
          ))}
        </ul>
      </div>

      {/* Safety Checklist */}
      <div className="temporalos-safety-checklist">
        <h4>Safety Checklist:</h4>
        <div className="checklist-item">
          {recommendation.safetyChecklist.renalDosing ? '✔' : '✗'} Renal dosing verified
        </div>
        <div className="checklist-item">
          {recommendation.safetyChecklist.drugInteractions ? '✔' : '✗'} No drug interactions
        </div>
        <div className="checklist-item">
          {recommendation.safetyChecklist.allergies ? '✔' : '✗'} No relevant allergies
        </div>
        <div className="checklist-item">
          {recommendation.safetyChecklist.guidelineAlignment ? '✔' : '✗'} Meets guideline criteria
        </div>
      </div>

      {/* Citations */}
      {recommendation.citations.length > 0 && (
        <div className="temporalos-citations">
          <h4>Citations:</h4>
          <ul>
            {recommendation.citations.map((citation, idx) => (
              <li key={idx}>{citation}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="temporalos-action-buttons">
        <button 
          className="temporalos-btn-approve"
          onClick={onApprove}
        >
          APPROVE
        </button>
        <button 
          className="temporalos-btn-modify"
          onClick={onModify}
        >
          MODIFY DOSE
        </button>
        <button 
          className="temporalos-btn-reject"
          onClick={handleReject}
        >
          REJECT
        </button>
      </div>

      {/* Schedule Follow-up Call Button */}
      <div className="temporalos-schedule-call" style={{ marginTop: '20px' }}>
        <button 
          className="temporalos-btn-schedule-call"
          onClick={handleScheduleCall}
          disabled={isSchedulingCall}
          style={{
            width: '100%',
            padding: '12px 20px',
            background: isSchedulingCall 
              ? 'linear-gradient(135deg, #95a5a6, #7f8c8d)' 
              : 'linear-gradient(135deg, #3498db, #2980b9)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isSchedulingCall ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          {isSchedulingCall ? '📞 Calling...' : '📞 Schedule Follow-up Call'}
        </button>
        
        {callStatus && (
          <div 
            style={{
              marginTop: '10px',
              padding: '10px',
              borderRadius: '6px',
              background: callStatus.includes('✅') 
                ? 'rgba(46, 204, 113, 0.1)' 
                : 'rgba(231, 76, 60, 0.1)',
              color: callStatus.includes('✅') ? '#27ae60' : '#c0392b',
              fontSize: '12px',
              fontWeight: 500,
              textAlign: 'center'
            }}
          >
            {callStatus}
          </div>
        )}
      </div>

      {/* Rejection Form */}
      {showRejectionForm && (
        <div className="temporalos-rejection-form">
          <h4>Optional: Why?</h4>
          <label>
            <input 
              type="checkbox" 
              checked={rejectionReason?.cost || false}
              onChange={(e) => setRejectionReason({...rejectionReason, cost: e.target.checked})}
            />
            Cost/coverage
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={rejectionReason?.priorIntolerance || false}
              onChange={(e) => setRejectionReason({...rejectionReason, priorIntolerance: e.target.checked})}
            />
            Prior intolerance
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={rejectionReason?.clinicalNuance || false}
              onChange={(e) => setRejectionReason({...rejectionReason, clinicalNuance: e.target.checked})}
            />
            Clinical nuance not in structured record
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={rejectionReason?.patientPreference || false}
              onChange={(e) => setRejectionReason({...rejectionReason, patientPreference: e.target.checked})}
            />
            Patient preference
          </label>
          <label>
            <input 
              type="checkbox" 
              onChange={(e) => {
                if (e.target.checked) {
                  const other = prompt('Please specify:');
                  setRejectionReason({...rejectionReason, other: other || undefined});
                } else {
                  setRejectionReason({...rejectionReason, other: undefined});
                }
              }}
            />
            Other: <input type="text" placeholder="Specify" />
          </label>
          <button onClick={() => onReject(rejectionReason)}>Submit Rejection</button>
        </div>
      )}
    </div>
  );
};

