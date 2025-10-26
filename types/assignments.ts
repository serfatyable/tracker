import type { Timestamp } from 'firebase/firestore';

export type Assignment = {
  id: string;
  residentId: string;
  rotationId: string;
  tutorIds: string[];
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  isGlobal?: boolean; // true for global assignments (no specific rotation)
};

export type AssignmentWithDetails = Assignment & {
  residentName?: string;
  tutorNames?: string[];
  rotationName?: string;
};
