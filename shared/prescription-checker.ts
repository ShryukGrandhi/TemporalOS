/**
 * Prescription Checker
 * Step 5: Prescribing Validation Logic
 */

export interface SafetyValidation {
  safe: boolean;
  confidence: number;
  recommendation: string;
  safetyChecklist: {
    renalDosing: boolean;
    drugInteractions: boolean;
    allergies: boolean;
    guidelineAlignment: boolean;
  };
  warnings: string[];
  citations: string[];
}

export interface PrescriptionInput {
  medication: string;
  dosage: string;
  patientId: string;
  allergies?: string[];
  renalFunction?: {
    eGFR?: number;
    creatinine?: number;
  };
  currentMeds?: Array<{ name: string; dosage: string }>;
  labs?: Array<{ name: string; value: string; timestamp: number }>;
}


