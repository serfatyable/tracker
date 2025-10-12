import type { Timestamp } from 'firebase/firestore';

export type Assignment = {
  id: string;
  residentId: string;
  rotationId: string;
  tutorIds: string[];
  startedAt: Timestamp;
  endedAt: Timestamp | null;
};
