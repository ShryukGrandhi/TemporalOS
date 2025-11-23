/**
 * Confirmation Panel Component
 * Step 6: Output with APPROVE/MODIFY/REJECT buttons
 */

import React, { useState } from 'react';
import { PrescriptionRecommendation, ConfirmationRequest } from '@shared/reasoning-model';
import jsPDF from 'jspdf';

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

  const handleExportPDF = () => {
    try {
      console.log('[ConfirmationPanel] 📄 Generating PDF export...');
      
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let yPosition = 20;

      // Header
      pdf.setFillColor(74, 144, 226); // #4A90E2
      pdf.rect(0, 0, pageWidth, 30, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TemporalOS', margin, 15);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('AI-Powered Medication Recommendation', margin, 23);

      // Date
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      yPosition = 40;
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);

      // Divider
      yPosition += 10;
      pdf.setDrawColor(74, 144, 226);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);

      // Medication Title
      yPosition += 15;
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(46, 204, 113); // Green
      pdf.text('RECOMMENDED MEDICATION', margin, yPosition);

      // Medication Details
      yPosition += 10;
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${recommendation.medication}`, margin, yPosition);
      
      yPosition += 8;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Dosage: ${recommendation.dosage}`, margin + 5, yPosition);
      
      yPosition += 6;
      pdf.text(`Duration: ${recommendation.duration}`, margin + 5, yPosition);
      
      yPosition += 6;
      pdf.setTextColor(74, 144, 226);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Confidence: ${(recommendation.confidence * 100).toFixed(0)}%`, margin + 5, yPosition);

      // Reasoning Section
      yPosition += 15;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CLINICAL REASONING', margin, yPosition);
      
      yPosition += 8;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      recommendation.reasoning.forEach((reason, idx) => {
        const lines = pdf.splitTextToSize(`${idx + 1}. ${reason}`, pageWidth - 2 * margin - 5);
        lines.forEach((line: string) => {
          if (yPosition > 270) { // Check if near bottom of page
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(line, margin + 5, yPosition);
          yPosition += 5;
        });
        yPosition += 2;
      });

      // Safety Checklist
      yPosition += 10;
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SAFETY CHECKLIST', margin, yPosition);
      
      yPosition += 8;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const safetyItems = [
        { label: 'Renal dosing verified', checked: recommendation.safetyChecklist.renalDosing },
        { label: 'No drug interactions', checked: recommendation.safetyChecklist.drugInteractions },
        { label: 'No relevant allergies', checked: recommendation.safetyChecklist.allergies },
        { label: 'Meets guideline criteria', checked: recommendation.safetyChecklist.guidelineAlignment }
      ];

      safetyItems.forEach(item => {
        pdf.setTextColor(item.checked ? 46 : 231, item.checked ? 204 : 76, item.checked ? 113 : 60);
        pdf.text(`${item.checked ? '✔' : '✗'} ${item.label}`, margin + 5, yPosition);
        yPosition += 6;
      });

      // Citations
      if (recommendation.citations.length > 0) {
        yPosition += 10;
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('EVIDENCE-BASED CITATIONS', margin, yPosition);
        
        yPosition += 8;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        recommendation.citations.forEach((citation, idx) => {
          const lines = pdf.splitTextToSize(`[${idx + 1}] ${citation}`, pageWidth - 2 * margin - 5);
          lines.forEach((line: string) => {
            if (yPosition > 270) {
              pdf.addPage();
              yPosition = 20;
            }
            pdf.text(line, margin + 5, yPosition);
            yPosition += 5;
          });
          yPosition += 2;
        });
      }

      // Alternatives (if available)
      if ((recommendation as any).alternatives && (recommendation as any).alternatives.length > 0) {
        yPosition += 10;
        if (yPosition > 260) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ALTERNATIVE OPTIONS', margin, yPosition);
        
        yPosition += 6;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        (recommendation as any).alternatives.forEach((alt: string, idx: number) => {
          pdf.text(`• ${alt}`, margin + 5, yPosition);
          yPosition += 5;
        });
      }

      // Footer
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.setFont('helvetica', 'italic');
        pdf.text(
          `TemporalOS - AI-Powered Clinical Decision Support | Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pdf.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      const filename = `TemporalOS_Recommendation_${recommendation.medication.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      
      console.log('[ConfirmationPanel] ✅ PDF exported:', filename);

    } catch (error) {
      console.error('[ConfirmationPanel] ❌ Error exporting PDF:', error);
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

      {/* Export to PDF Button */}
      <div className="temporalos-action-buttons-secondary" style={{ marginTop: '20px' }}>
        <button 
          className="temporalos-btn-export-pdf"
          onClick={handleExportPDF}
          style={{
            width: '100%',
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(155, 89, 182, 0.3)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          📄 Export to PDF
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

