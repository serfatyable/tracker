import type { Timestamp } from 'firebase/firestore';

export type RotationStatus = 'active' | 'inactive' | 'finished';

export type RotationSource = 'manual' | 'import';

export type Rotation = {
  id: string;
  name: string;
  name_en?: string;
  name_he?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  isCore?: boolean;
  ownerTutorIds?: string[]; // admins manage
  color?: string; // hex color assigned to rotation (e.g., #3B82F6)
  description?: string;
  status?: RotationStatus;
  source?: RotationSource;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

export type RotationNodeType =
  | 'category'
  | 'subject'
  | 'topic'
  | 'subTopic'
  | 'subSubTopic'
  | 'leaf';

export type RotationNode = {
  id: string;
  rotationId: string;
  parentId: string | null;
  type: RotationNodeType;
  name: string;
  name_en?: string;
  name_he?: string;
  order: number;
  // Content fields (available to any node)
  requiredCount?: number;
  links?: Array<{ label?: string; label_en?: string; label_he?: string; href: string }>;
  mcqUrl?: string;
  resources?: string; // Free text field for books, videos, etc.
  notes_en?: string; // English notes (max 500 chars)
  notes_he?: string; // Hebrew notes (max 500 chars)
};
