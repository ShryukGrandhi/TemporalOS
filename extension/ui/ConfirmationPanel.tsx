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

  const handleReject = () => {
    if (showRejectionForm) {
      onReject(rejectionReason);
    } else {
      setShowRejectionForm(true);
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

