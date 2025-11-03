'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getAuth, onAuthStateChanged, type Unsubscribe as AuthUnsubscribe } from 'firebase/auth';
import {
  collection,
  getFirestore,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type FirestoreError,
  type QuerySnapshot,
} from 'firebase/firestore';

import { getFirebaseApp } from '../../lib/firebase/client';

export type ResidentActiveRotationContextValue = {
  rotationId: string | null;
  loading: boolean;
  error: string | null;
};

const ResidentActiveRotationContext = createContext<ResidentActiveRotationContextValue | undefined>(
  undefined,
);

export function ResidentActiveRotationProvider({ children }: { children: ReactNode }) {
  const [rotationId, setRotationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const assignmentUnsubRef = useRef<() => void>();

  useEffect(() => {
    const app = getFirebaseApp();
    const auth = getAuth(app);

    const cleanupAssignmentsListener = () => {
      if (assignmentUnsubRef.current) {
        assignmentUnsubRef.current();
        assignmentUnsubRef.current = undefined;
      }
    };

    const attachAssignmentsListener = (uid: string) => {
      const db = getFirestore(app);
      const assignmentsQuery = query(
        collection(db, 'assignments'),
        where('residentId', '==', uid),
        where('status', '==', 'active'),
      );

      assignmentUnsubRef.current = onSnapshot(
        assignmentsQuery,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const doc = snapshot.docs[0];
          if (doc) {
            const data = doc.data() as { rotationId?: string };
            setRotationId(data?.rotationId ?? null);
          } else {
            setRotationId(null);
          }
          setError(null);
          setLoading(false);
        },
        (snapshotError: FirestoreError) => {
          setError(snapshotError.message || 'Failed to load assignment');
          setRotationId(null);
          setLoading(false);
        },
      );
    };

    const handleAuthChange: Parameters<typeof onAuthStateChanged>[1] = (user) => {
      cleanupAssignmentsListener();

      if (!user) {
        setRotationId(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setRotationId(null);
      attachAssignmentsListener(user.uid);
    };

    const handleAuthError: Parameters<typeof onAuthStateChanged>[2] = (authError) => {
      cleanupAssignmentsListener();
      setRotationId(null);
      setError(authError?.message || 'Failed to load assignment');
      setLoading(false);
    };

    const authUnsub: AuthUnsubscribe = onAuthStateChanged(auth, handleAuthChange, handleAuthError);

    return () => {
      cleanupAssignmentsListener();
      authUnsub();
    };
  }, []);

  const value = useMemo(() => ({ rotationId, loading, error }), [rotationId, loading, error]);

  return (
    <ResidentActiveRotationContext.Provider value={value}>
      {children}
    </ResidentActiveRotationContext.Provider>
  );
}

export function useResidentActiveRotationContext() {
  const context = useContext(ResidentActiveRotationContext);
  if (!context) {
    throw new Error(
      'useResidentActiveRotation must be used within a ResidentActiveRotationProvider',
    );
  }
  return context;
}

export { ResidentActiveRotationContext };
