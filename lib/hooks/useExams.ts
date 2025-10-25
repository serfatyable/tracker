import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
  getFirestore,
} from 'firebase/firestore';
import { useState, useEffect } from 'react';

import { getFirebaseApp } from '@/lib/firebase/client';
import type { Exam } from '@/types/exam';

const db = getFirestore(getFirebaseApp());

/**
 * Hook to fetch all active exams in real-time
 */
export function useExams(activeOnly = true) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const examsCol = collection(db, 'exams');
    let q = query(examsCol, orderBy('examDate', 'desc'));

    if (activeOnly) {
      q = query(examsCol, where('isActive', '==', true), orderBy('examDate', 'desc'));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const examData = snapshot.docs.map((doc) => doc.data() as Exam);
        setExams(examData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching exams:', err);
        setError(err as Error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [activeOnly]);

  return { exams, loading, error };
}

/**
 * Hook to fetch a single exam by ID in real-time
 */
export function useExam(examId: string | null) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!examId) {
      setExam(null);
      setLoading(false);
      return;
    }

    const examDoc = doc(db, 'exams', examId);

    const unsubscribe = onSnapshot(
      examDoc,
      (snapshot) => {
        if (snapshot.exists()) {
          setExam(snapshot.data() as Exam);
        } else {
          setExam(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching exam:', err);
        setError(err as Error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [examId]);

  return { exam, loading, error };
}

/**
 * Hook to fetch upcoming exams (future exams only)
 */
export function useUpcomingExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const now = Timestamp.now();
    const examsCol = collection(db, 'exams');
    const q = query(
      examsCol,
      where('isActive', '==', true),
      where('examDate', '>=', now),
      orderBy('examDate', 'asc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const examData = snapshot.docs.map((doc) => doc.data() as Exam);
        setExams(examData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching upcoming exams:', err);
        setError(err as Error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return { exams, loading, error };
}

/**
 * Hook to fetch past exams (exams that already occurred)
 */
export function usePastExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const now = Timestamp.now();
    const examsCol = collection(db, 'exams');
    const q = query(
      examsCol,
      where('isActive', '==', true),
      where('examDate', '<', now),
      orderBy('examDate', 'desc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const examData = snapshot.docs.map((doc) => doc.data() as Exam);
        setExams(examData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching past exams:', err);
        setError(err as Error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return { exams, loading, error };
}

/**
 * Helper hook to categorize exams into upcoming, current (within 7 days), and past
 */
export function useCategorizedExams() {
  const { exams, loading, error } = useExams(true);
  const [categorized, setCategorized] = useState<{
    upcoming: Exam[];
    current: Exam[];
    past: Exam[];
  }>({ upcoming: [], current: [], past: [] });

  useEffect(() => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const upcoming: Exam[] = [];
    const current: Exam[] = [];
    const past: Exam[] = [];

    exams.forEach((exam) => {
      const examDate = exam.examDate.toDate();

      if (examDate > sevenDaysFromNow) {
        upcoming.push(exam);
      } else if (examDate >= sevenDaysAgo && examDate <= sevenDaysFromNow) {
        current.push(exam);
      } else {
        past.push(exam);
      }
    });

    setCategorized({ upcoming, current, past });
  }, [exams]);

  return { ...categorized, loading, error };
}
