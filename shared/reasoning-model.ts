/**
 * Reasoning Model
 * Core reasoning structures for TemporalOS
 */

import { PanelItem } from './types';

export interface ClinicalInsight {
  label: string;
  value: string;
  why: string;
  confidence: number;
  evidence?: string[];
}

export interface ReasoningOutput {
  title: string;
  items: ClinicalInsight[];
  mode: 'past' | 'present' | 'future';
  timestamp: number;
}

export interface PrescriptionRecommendation {
  medication: string;
  dosage: string;
  duration: string;
  confidence: number;
  reasoning: string[];
  safetyChecklist: {
    renalDosing: boolean;
    drugInteractions: boolean;
    allergies: boolean;
    guidelineAlignment: boolean;
  };
  citations: string[];
}

export interface ConfirmationRequest {
  recommendation: PrescriptionRecommendation;
  clinicianAction: 'approve' | 'modify' | 'reject';
  rejectionReason?: {
    cost?: boolean;
    priorIntolerance?: boolean;
    clinicalNuance?: boolean;
    patientPreference?: boolean;
    other?: string;
  };
}


