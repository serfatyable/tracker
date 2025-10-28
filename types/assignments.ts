import type { Timestamp } from 'firebase/firestore';

export type AssignmentStatus = 'inactive' | 'active' | 'finished';

export type Assignment = {
  id: string;
  residentId: string;
  rotationId: string;
  tutorIds: string[];
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  status: AssignmentStatus; // Per-resident status: inactive (not started), active (working), finished (completed)
  isGlobal?: boolean; // true for global assignments (no specific rotation)
};

export type AssignmentWithDetails = Assignment & {
  residentName?: string;
  tutorNames?: string[];
  rotationName?: string;
};
