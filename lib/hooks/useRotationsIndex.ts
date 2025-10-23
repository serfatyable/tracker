'use client';

import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { useMemo, useState, useEffect } from 'react';

import { getFirebaseApp } from '../firebase/client';

import { useResidentActiveRotation } from './useResidentActiveRotation';

export type RotationMeta = {
  id: string;
  name: string;
  required?: number; // total required items across leaves (optional)
  approved?: number; // total approved count (optional)
  pending?: number; // total pending count (optional)
  assigned?: boolean; // true if this resident is assigned to it
};

export type Status = 'not-started' | 'in-progress' | 'completed';

export function useRotationsIndex() {
  const [all, setAll] = useState<RotationMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const { rotationId: activeRotationId } = useResidentActiveRotation();

  // Load all rotations from Firestore
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const db = getFirestore(getFirebaseApp());
        const snapshot = await getDocs(collection(db, 'rotations'));
        const rotations: RotationMeta[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || 'Unnamed Rotation',
          required: doc.data().required || 0,
          approved: doc.data().approved || 0,
          pending: doc.data().pending || 0,
          assigned: false, // Will be updated below
        }));
        setAll(rotations);
      } catch (error) {
        console.error('Failed to load rotations:', error);
        setAll([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Compute mine (assigned rotations) and status
  const { mine, statusById } = useMemo(() => {
    const mine: RotationMeta[] = [];
    const statusById: Record<string, Status> = {};

    all.forEach((rotation) => {
      // Mark as assigned if it's the active rotation (TODO: use proper assignment hook)
      const assigned = rotation.id === activeRotationId;
      if (assigned) {
        mine.push({ ...rotation, assigned: true });
      }

      // Compute status
      const required = rotation.required ?? 0;
      const approved = rotation.approved ?? 0;
      const pending = rotation.pending ?? 0;

      if (required > 0 && approved >= required) {
        statusById[rotation.id] = 'completed';
      } else if (approved > 0 || pending > 0) {
        statusById[rotation.id] = 'in-progress';
      } else {
        statusById[rotation.id] = 'not-started';
      }
    });

    // Sort mine by name
    mine.sort((a, b) => a.name.localeCompare(b.name));

    return { mine, statusById };
  }, [all, activeRotationId]);

  return {
    all,
    mine,
    statusById,
    loading,
  };
}
