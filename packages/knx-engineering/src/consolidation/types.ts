export type ConsolidationStatus = 'confirmed' | 'review' | 'separate';
export type ConsolidationDecision = 'merge' | 'separate';
export type ConsolidationDirection = 'producer' | 'consumer' | 'bidirectional' | 'unknown';

export interface ConsolidationMember {
  key: string;
  deviceId: string;
  deviceName: string;
  physicalAddress: string;
  manufacturer: string;
  articleNumber: string;
  productName: string;
  variantId: string;
  functionName: string;
  dpt: string;
  objectNumber: string;
  objectRef: string;
  objectName: string;
  objectFunction: string;
  objectSize: string;
  channelId: string;
  channelName: string;
  linkedGas: string[];
  role: 'command' | 'feedback' | 'unknown';
  direction: ConsolidationDirection;
}

export interface ConsolidationEvidence {
  kind: 'proof' | 'positive' | 'warning' | 'blocker' | 'info';
  label: string;
  detail?: string;
}

export interface RoomConsolidationCandidate {
  id: string;
  roomId: string;
  roomName: string;
  label: string;
  dpt: string;
  status: ConsolidationStatus;
  score: number;
  reason: string;
  evidence: ConsolidationEvidence[];
  members: ConsolidationMember[];
}

export interface RoomConsolidationSummary {
  candidates: RoomConsolidationCandidate[];
  confirmed: number;
  review: number;
  separate: number;
}
