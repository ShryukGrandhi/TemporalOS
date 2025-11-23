/**
 * Shared Type Definitions
 */

export type ReasoningMode = 'past' | 'present' | 'future' | 'auto' | 'insufficient_data';

export interface ModeState {
  mode: ReasoningMode;
  confidence: number;
  reason: string;
  timestamp: number;
}

export interface PanelItem {
  id?: string;
  label: string;
  value: string;
  why: string;
  type?: 'text' | 'metric' | 'date' | 'medication' | 'lab';
  highlight?: boolean;
}

export interface PanelContent {
  title: string;
  items: PanelItem[];
}

export interface Session {
  sessionId: string;
  lastMode: ReasoningMode;
  signalHistory: Signal[];
  timestamps: {
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface Signal {
  type: 'scroll' | 'transcript' | 'action' | 'heuristic';
  data: any;
  timestamp: number;
}
