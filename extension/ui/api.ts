/**
 * API Client for TemporalOS Backend
 */

import { PanelContent, PanelItem } from '@shared/types';
import { CareFlowAdapter } from '../utils/careflow-adapter';

const API_BASE = 'http://localhost:3000/api';

export interface AnalyzeRequest {
  transcript?: string;
  context?: {
    entities?: any[];
    temporalTags?: any[];
    patientData?: any;
    recentActions?: string[];
  };
}

export interface ModeClassification {
  mode: 'past' | 'present' | 'future';
  confidence: number;
  reason: string;
}

export class TemporalOSAPI {
  private sessionId: string | null = null;

  async initializeSession(): Promise<string> {
    try {
      const response = await fetch(`${API_BASE}/state/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const session = await response.json();
      this.sessionId = session.sessionId;
      return session.sessionId;
    } catch (error) {
      console.error('[TemporalOS] Error initializing session:', error);
      // Fallback to local session ID
      this.sessionId = `local-${Date.now()}`;
      return this.sessionId;
    }
  }

  async classifyMode(request: AnalyzeRequest): Promise<ModeClassification> {
    // Try to detect mode from the DOM first
    try {
      const domMode = CareFlowAdapter.detectMode();
      if (domMode !== 'auto') {
        return {
          mode: domMode,
          confidence: 0.9,
          reason: 'Detected from CareFlow UI context'
        };
      }
    } catch (e) {
      console.warn('DOM detection failed, falling back to API');
    }

    try {
      const response = await fetch(`${API_BASE}/reasoning/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      return await response.json();
    } catch (error) {
      console.error('[TemporalOS] Error classifying mode:', error);
      // Fallback
      return {
        mode: 'present',
        confidence: 0.5,
        reason: 'Fallback: unable to connect to backend'
      };
    }
  }

  async analyzeText(text: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/nlp/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, includePHI: false, includeICD10: false })
      });
      return await response.json();
    } catch (error) {
      console.error('[TemporalOS] Error analyzing text:', error);
      return { entities: [], temporalTags: [] };
    }
  }

  async getPatientData(patientId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE}/heidi/patient/${patientId}`);
      return await response.json();
    } catch (error) {
      console.error('[TemporalOS] Error fetching patient data:', error);
      return null;
    }
  }

  async updateSession(mode: string, signal?: { type: string; data: any }): Promise<void> {
    if (!this.sessionId) return;

    try {
      await fetch(`${API_BASE}/state/session/${this.sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastMode: mode,
          signal
        })
      });
    } catch (error) {
      console.error('[TemporalOS] Error updating session:', error);
    }

  }

  async getPanelContent(mode: 'past' | 'present' | 'future' | 'auto', context?: any): Promise<PanelContent> {
    const sessionId = this.sessionId;
    if (!sessionId) {
      const fallbackMode = mode === 'auto' ? 'present' : mode;
      return CareFlowAdapter.getRealData(fallbackMode);
    }

    try {
      // Fetch medication logs for historical context
      const logsResponse = await fetch(`${API_BASE}/medications/logs/${sessionId}`);
      const logsData = await logsResponse.json();
      const medicationLogs = logsData.logs || [];

      // Fetch patient data
      const patientId = 'DEMO-PATIENT-001'; // Or extract from context
      const patientData = await this.getPatientData(patientId);

      // Build panel content from medications and patient data
      const items: PanelItem[] = [];

      if (mode === 'past' || mode === 'present') {
        // Show medications
        if (medicationLogs.length > 0) {
          items.push({
            id: 'meds-header',
            label: 'Active Medications',
            value: `${medicationLogs.length} medications`,
            why: 'From medication logs',
            type: 'medication',
            highlight: true
          });

          medicationLogs.forEach((log: any, index: number) => {
            const analysis = log.analysis;
            const classification = analysis?.classification;
            
            items.push({
              id: `med-${index}`,
              label: log.medication,
              value: `${log.dosage}${log.frequency ? ` - ${log.frequency}` : ''}`,
              why: classification 
                ? `${classification.category} - ${classification.indication}`
                : 'Active medication',
              type: 'medication'
            });

            // Add interactions if available
            if (analysis?.interactions && analysis.interactions.length > 0) {
              const majorInteractions = analysis.interactions.filter((i: any) => 
                i.type === 'major' || i.type === 'contraindication'
              );
              if (majorInteractions.length > 0) {
                items.push({
                  id: `med-${index}-interactions`,
                  label: '⚠️ Interactions',
                  value: `${majorInteractions.length} major interaction(s)`,
                  why: majorInteractions.map((i: any) => i.medication).join(', '),
                  type: 'text',
                  highlight: true
                });
              }
            }
          });
        }

        // Show patient demographics
        if (patientData?.demographics) {
          items.push({
            id: 'demo-header',
            label: 'Patient Demographics',
            value: `${patientData.demographics.age || 'N/A'} years, ${patientData.demographics.gender || 'N/A'}`,
            why: 'From patient record',
            type: 'text'
          });
        }

        // Show conditions from medication analyses
        const conditions = new Set<string>();
        medicationLogs.forEach((log: any) => {
          if (log.analysis?.graphNodes) {
            log.analysis.graphNodes.forEach((node: any) => {
              if (node.type === 'condition') {
                conditions.add(node.label);
              }
            });
          }
        });

        if (conditions.size > 0) {
          items.push({
            id: 'conditions-header',
            label: 'Active Conditions',
            value: Array.from(conditions).join(', '),
            why: 'Derived from medication indications',
            type: 'text',
            highlight: true
          });
        }

        // Show labs if available
        if (patientData?.labs && patientData.labs.length > 0) {
          items.push({
            id: 'labs-header',
            label: 'Recent Lab Results',
            value: `${patientData.labs.length} results`,
            why: 'From patient record',
            type: 'lab',
            highlight: true
          });

          patientData.labs.slice(0, 3).forEach((lab: any, index: number) => {
            items.push({
              id: `lab-${index}`,
              label: lab.name,
              value: `${lab.value} ${lab.unit || ''}`,
              why: `Measured ${new Date(lab.timestamp).toLocaleDateString()}`,
              type: 'lab'
            });
          });
        }
      } else if (mode === 'future') {
        // Future planning mode
        items.push({
          id: 'future-header',
          label: 'Planning Considerations',
          value: 'Review medication interactions and patient history',
          why: 'Based on current medications and conditions',
          type: 'text',
          highlight: true
        });

        if (medicationLogs.length > 0) {
          items.push({
            id: 'future-meds',
            label: 'Current Medications',
            value: `${medicationLogs.length} active medications`,
            why: 'Consider interactions when adding new medications',
            type: 'medication'
          });
        }
      }

      // If no items, fall back to CareFlow adapter
      if (items.length === 0) {
        const fallbackMode = mode === 'auto' ? 'present' : mode;
        return CareFlowAdapter.getRealData(fallbackMode);
      }

      return {
        title: mode === 'past' ? 'Historical Context' : mode === 'future' ? 'Future Planning' : 'Current Evaluation',
        items
      };
    } catch (error) {
      console.error('[TemporalOS] Error building panel content:', error);
      // Fall back to CareFlow adapter
      const fallbackMode = mode === 'auto' ? 'present' : mode;
      return CareFlowAdapter.getRealData(fallbackMode);
    }
  }

  async confirmMedication(medication: {
    sessionId: string;
    patientId: string;
    medication: string;
    dosage: string;
    route?: string;
    frequency?: string;
    startDate?: string;
    confirmedBy?: string;
  }): Promise<{ success: boolean; logId: string; analysis?: any }> {
    try {
      const response = await fetch(`${API_BASE}/medications/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(medication)
      });
      return await response.json();
    } catch (error) {
      console.error('[TemporalOS] Error confirming medication:', error);
      throw error;
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

}

export const api = new TemporalOSAPI();

