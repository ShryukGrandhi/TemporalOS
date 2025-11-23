/**
 * Mode Classifier
 * Step 3: Mode Classification Logic
 */

import { ReasoningMode } from './types';

export interface ClassificationResult {
  mode: ReasoningMode;
  confidence: number;
  reason: string;
}

export const MIN_CONFIDENCE_THRESHOLD = 0.75;

export function validateConfidence(confidence: number): boolean {
  return confidence >= MIN_CONFIDENCE_THRESHOLD;
}

