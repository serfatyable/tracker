/**
 * Firestore Data Converters
 *
 * Provides type-safe converters for Firestore documents, eliminating the need for 'as any' casts.
 * Each converter handles:
 * - Type conversion (Timestamp <-> Date)
 * - Runtime validation (basic)
 * - Proper TypeScript typing
 */

import type {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions} from 'firebase/firestore';
import {
  Timestamp,
} from 'firebase/firestore';

import type { UserProfile } from '@/types/auth';
import type { RotationPetition } from '@/types/rotationPetitions';
import type { Rotation, RotationNode } from '@/types/rotations';

/**
 * Generic helper to convert Firestore data with ID
 */
export function withId<T>(id: string, data: T): T & { id: string } {
  return { id, ...data };
}

/**
 * Convert Firestore Timestamp to Date (nullable)
 */
function timestampToDate(timestamp: unknown): Date | undefined {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return undefined;
}

/**
 * UserProfile Converter
 */
export const userProfileConverter: FirestoreDataConverter<UserProfile> = {
  toFirestore: (profile: UserProfile) => {
    // Remove id if present before writing
    const { uid: _, ...data } = profile as any;
    return data;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): UserProfile => {
    const data = snapshot.data(options);

    return {
      uid: snapshot.id,
      fullName: data.fullName,
      fullNameHe: data.fullNameHe,
      email: data.email ?? null,
      role: data.role,
      status: data.status ?? 'pending',
      settings: data.settings ?? { language: 'en' },
      createdAt: timestampToDate(data.createdAt),
      // Resident-specific fields
      ...(data.role === 'resident' && {
        residencyStartDate: data.residencyStartDate,
        studyprogramtype: data.studyprogramtype ?? '4-year',
        completedRotationIds: data.completedRotationIds ?? [],
        currentRotationId: data.currentRotationId,
        rotationSelectionRequest: data.rotationSelectionRequest,
      }),
    } as UserProfile;
  },
};

/**
 * Rotation Converter
 */
export const rotationConverter: FirestoreDataConverter<Rotation> = {
  toFirestore: (rotation: Rotation) => {
    const { id: _, ...data } = rotation;
    return data;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): Rotation => {
    const data = snapshot.data(options);

    return {
      id: snapshot.id,
      name: data.name,
      name_en: data.name_en,
      name_he: data.name_he,
      startDate: data.startDate,
      endDate: data.endDate,
      isCore: data.isCore ?? false,
      ownerTutorIds: data.ownerTutorIds ?? [],
      color: data.color,
      description: data.description,
      status: data.status ?? 'active',
      source: data.source ?? 'manual',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};

/**
 * RotationNode Converter
 */
export const rotationNodeConverter: FirestoreDataConverter<RotationNode> = {
  toFirestore: (node: RotationNode) => {
    const { id: _, ...data } = node;
    return data;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): RotationNode => {
    const data = snapshot.data(options);

    return {
      id: snapshot.id,
      rotationId: data.rotationId,
      parentId: data.parentId ?? null,
      type: data.type,
      name: data.name,
      name_en: data.name_en,
      name_he: data.name_he,
      order: data.order ?? 0,
      requiredCount: data.requiredCount,
      links: data.links ?? [],
      mcqUrl: data.mcqUrl,
      resources: data.resources,
      notes_en: data.notes_en,
      notes_he: data.notes_he,
    };
  },
};

/**
 * RotationPetition Converter
 */
export const rotationPetitionConverter: FirestoreDataConverter<RotationPetition> = {
  toFirestore: (petition: RotationPetition) => {
    const { id: _, ...data } = petition as any;
    return data;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): RotationPetition => {
    const data = snapshot.data(options);

    return {
      id: snapshot.id,
      userId: data.userId,
      userFullName: data.userFullName,
      rotationId: data.rotationId,
      rotationName: data.rotationName,
      type: data.type,
      reason: data.reason,
      status: data.status ?? 'pending',
      createdAt: timestampToDate(data.createdAt),
      resolvedAt: timestampToDate(data.resolvedAt),
      resolvedBy: data.resolvedBy,
      adminNotes: data.adminNotes,
    } as RotationPetition;
  },
};

/**
 * Generic Task Document Type
 * (Defined here to avoid circular dependencies)
 */
export type TaskDoc = {
  id: string;
  userId: string;
  rotationId: string;
  itemId: string;
  count: number;
  requiredCount: number;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: Array<{ by: string; text: string; timestamp?: Date }>;
  note?: string;
  tutorIds?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Task Converter
 */
export const taskConverter: FirestoreDataConverter<TaskDoc> = {
  toFirestore: (task: TaskDoc) => {
    const { id: _, createdAt: _createdAt, updatedAt: _updatedAt, ...data } = task;
    return {
      ...data,
      // Timestamps are handled by serverTimestamp() in creation logic
    };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): TaskDoc => {
    const data = snapshot.data(options);

    return {
      id: snapshot.id,
      userId: data.userId,
      rotationId: data.rotationId,
      itemId: data.itemId,
      count: data.count ?? 0,
      requiredCount: data.requiredCount ?? 1,
      status: data.status ?? 'pending',
      feedback: data.feedback ?? [],
      note: data.note,
      tutorIds: data.tutorIds ?? [],
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    };
  },
};

/**
 * Generic helper function to query Firestore with a converter
 * Eliminates repetitive code and 'as any' casts
 */
export async function queryToArray<T>(
  querySnapshot: Awaited<ReturnType<typeof import('firebase/firestore').getDocs>>,
): Promise<(T & { id: string })[]> {
  return querySnapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as T & { id: string },
  );
}

/**
 * Helper to get a single document with proper typing
 */
export function docToData<T>(snapshot: QueryDocumentSnapshot): T & { id: string } {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as T & { id: string };
}
