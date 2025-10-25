import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  getFirestore,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, getStorage } from 'firebase/storage';

import { getFirebaseApp } from './client';

import type {
  Exam,
  ExamFormData,
  ExamSubject,
  CurrentExam,
  PastExam,
  ExamMaterial,
  MaterialFormData,
} from '@/types/exam';

const db = getFirestore(getFirebaseApp());
const storage = getStorage(getFirebaseApp());

const EXAMS_COLLECTION = 'exams';

/**
 * Generate a unique ID for exam materials and past exams
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Upload a file to Firebase Storage
 */
async function uploadFile(file: File, path: string): Promise<{ url: string; fileName: string }> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { url, fileName: file.name };
}

/**
 * Delete a file from Firebase Storage
 */
async function deleteFile(fileUrl: string): Promise<void> {
  try {
    const storageRef = ref(storage, fileUrl);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    // Don't throw - file might already be deleted
  }
}

/**
 * Create a new exam with subjects
 */
export async function createExam(formData: ExamFormData, userId: string): Promise<string> {
  const examId = doc(collection(db, EXAMS_COLLECTION)).id;
  const now = Timestamp.now();

  // Generate subjects with unique IDs
  const subjects: ExamSubject[] = formData.subjects.map((subjectData) => ({
    id: generateId(),
    titleEn: subjectData.titleEn,
    titleHe: subjectData.titleHe,
    descriptionEn: subjectData.descriptionEn,
    descriptionHe: subjectData.descriptionHe,
    topics: subjectData.topics,
    bookChapters: subjectData.bookChapters,
    examLink: subjectData.examLink,
  }));

  const exam: Exam = {
    id: examId,
    examDate: Timestamp.fromDate(formData.examDate),
    examLink: formData.examLink,
    subjects,
    pastExams: [],
    studyMaterials: [],
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
    isActive: formData.isActive,
  };

  await setDoc(doc(db, EXAMS_COLLECTION, examId), exam);
  return examId;
}

/**
 * Get a single exam by ID
 */
export async function getExam(examId: string): Promise<Exam | null> {
  const examDoc = await getDoc(doc(db, EXAMS_COLLECTION, examId));
  if (!examDoc.exists()) return null;
  return examDoc.data() as Exam;
}

/**
 * Get all exams, optionally filtered by active status
 */
export async function getExams(activeOnly = false): Promise<Exam[]> {
  const examsCol = collection(db, EXAMS_COLLECTION);
  let q = query(examsCol, orderBy('examDate', 'desc'));

  if (activeOnly) {
    q = query(examsCol, where('isActive', '==', true), orderBy('examDate', 'desc'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as Exam);
}

/**
 * Get upcoming exams (future exams only)
 */
export async function getUpcomingExams(): Promise<Exam[]> {
  const now = Timestamp.now();
  const examsCol = collection(db, EXAMS_COLLECTION);
  const q = query(
    examsCol,
    where('isActive', '==', true),
    where('examDate', '>=', now),
    orderBy('examDate', 'asc'),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as Exam);
}

/**
 * Get past exams (exams that already occurred)
 */
export async function getPastExams(): Promise<Exam[]> {
  const now = Timestamp.now();
  const examsCol = collection(db, EXAMS_COLLECTION);
  const q = query(
    examsCol,
    where('isActive', '==', true),
    where('examDate', '<', now),
    orderBy('examDate', 'desc'),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as Exam);
}

/**
 * Update an exam's basic information and subjects
 */
export async function updateExam(
  examId: string,
  formData: Partial<ExamFormData>,
  userId: string,
): Promise<void> {
  const updateData: any = {
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  };

  if (formData.examDate) {
    updateData.examDate = Timestamp.fromDate(formData.examDate);
  }

  if (formData.examLink !== undefined) {
    updateData.examLink = formData.examLink;
  }

  if (formData.isActive !== undefined) {
    updateData.isActive = formData.isActive;
  }

  if (formData.subjects) {
    // Generate subjects with unique IDs (preserve existing IDs if updating)
    updateData.subjects = formData.subjects.map((subjectData) => ({
      id: generateId(),
      titleEn: subjectData.titleEn,
      titleHe: subjectData.titleHe,
      descriptionEn: subjectData.descriptionEn,
      descriptionHe: subjectData.descriptionHe,
      topics: subjectData.topics,
      bookChapters: subjectData.bookChapters,
      examLink: subjectData.examLink,
    }));
  }

  await updateDoc(doc(db, EXAMS_COLLECTION, examId), updateData);
}

/**
 * Delete an exam (soft delete by setting isActive to false)
 */
export async function deleteExam(examId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, EXAMS_COLLECTION, examId), {
    isActive: false,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

/**
 * Hard delete an exam and all its files
 */
export async function hardDeleteExam(examId: string): Promise<void> {
  const exam = await getExam(examId);
  if (!exam) return;

  // Delete all files from storage
  if (exam.currentExam) {
    await deleteFile(exam.currentExam.fileUrl);
  }

  for (const pastExam of exam.pastExams) {
    await deleteFile(pastExam.fileUrl);
  }

  for (const material of exam.studyMaterials) {
    if (material.type === 'pdf') {
      await deleteFile(material.url);
    }
  }

  // Delete the document
  await deleteDoc(doc(db, EXAMS_COLLECTION, examId));
}

/**
 * Upload current exam file
 */
export async function uploadCurrentExam(examId: string, file: File, userId: string): Promise<void> {
  const exam = await getExam(examId);
  if (!exam) throw new Error('Exam not found');

  // Delete old current exam if exists
  if (exam.currentExam) {
    await deleteFile(exam.currentExam.fileUrl);
  }

  // Upload new file
  const path = `exams/${examId}/current/${file.name}`;
  const { url, fileName } = await uploadFile(file, path);

  const currentExam: CurrentExam = {
    fileUrl: url,
    fileName,
    uploadedAt: Timestamp.now(),
    uploadedBy: userId,
  };

  await updateDoc(doc(db, EXAMS_COLLECTION, examId), {
    currentExam,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

/**
 * Delete current exam file
 */
export async function deleteCurrentExam(examId: string, userId: string): Promise<void> {
  const exam = await getExam(examId);
  if (!exam?.currentExam) return;

  await deleteFile(exam.currentExam.fileUrl);

  await updateDoc(doc(db, EXAMS_COLLECTION, examId), {
    currentExam: null,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

/**
 * Add a past exam file to the archive
 */
export async function addPastExam(
  examId: string,
  file: File,
  examDate: Date,
  userId: string,
): Promise<void> {
  const exam = await getExam(examId);
  if (!exam) throw new Error('Exam not found');

  const pastExamId = generateId();
  const path = `exams/${examId}/past/${pastExamId}/${file.name}`;
  const { url, fileName } = await uploadFile(file, path);

  const pastExam: PastExam = {
    id: pastExamId,
    fileUrl: url,
    fileName,
    examDate: Timestamp.fromDate(examDate),
    uploadedAt: Timestamp.now(),
    uploadedBy: userId,
  };

  const updatedPastExams = [...exam.pastExams, pastExam];

  await updateDoc(doc(db, EXAMS_COLLECTION, examId), {
    pastExams: updatedPastExams,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

/**
 * Delete a past exam from the archive
 */
export async function deletePastExam(
  examId: string,
  pastExamId: string,
  userId: string,
): Promise<void> {
  const exam = await getExam(examId);
  if (!exam) return;

  const pastExam = exam.pastExams.find((pe) => pe.id === pastExamId);
  if (pastExam) {
    await deleteFile(pastExam.fileUrl);
  }

  const updatedPastExams = exam.pastExams.filter((pe) => pe.id !== pastExamId);

  await updateDoc(doc(db, EXAMS_COLLECTION, examId), {
    pastExams: updatedPastExams,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

/**
 * Add study material (PDF or link)
 */
export async function addStudyMaterial(
  examId: string,
  formData: MaterialFormData,
  userId: string,
): Promise<void> {
  const exam = await getExam(examId);
  if (!exam) throw new Error('Exam not found');

  const materialId = generateId();
  let url = formData.url || '';
  let fileName: string | undefined;

  // Upload file if type is PDF
  if (formData.type === 'pdf' && formData.file) {
    const path = `exams/${examId}/materials/${materialId}/${formData.file.name}`;
    const uploadResult = await uploadFile(formData.file, path);
    url = uploadResult.url;
    fileName = uploadResult.fileName;
  }

  const material: ExamMaterial = {
    id: materialId,
    type: formData.type,
    title: formData.title,
    titleHe: formData.titleHe,
    url,
    fileName,
    description: formData.description,
    descriptionHe: formData.descriptionHe,
    uploadedAt: Timestamp.now(),
    uploadedBy: userId,
  };

  const updatedMaterials = [...exam.studyMaterials, material];

  await updateDoc(doc(db, EXAMS_COLLECTION, examId), {
    studyMaterials: updatedMaterials,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

/**
 * Delete study material
 */
export async function deleteStudyMaterial(
  examId: string,
  materialId: string,
  userId: string,
): Promise<void> {
  const exam = await getExam(examId);
  if (!exam) return;

  const material = exam.studyMaterials.find((m) => m.id === materialId);
  if (material && material.type === 'pdf') {
    await deleteFile(material.url);
  }

  const updatedMaterials = exam.studyMaterials.filter((m) => m.id !== materialId);

  await updateDoc(doc(db, EXAMS_COLLECTION, examId), {
    studyMaterials: updatedMaterials,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}

/**
 * Update study material metadata (title, description)
 */
export async function updateStudyMaterial(
  examId: string,
  materialId: string,
  updates: Partial<Pick<ExamMaterial, 'title' | 'titleHe' | 'description' | 'descriptionHe'>>,
  userId: string,
): Promise<void> {
  const exam = await getExam(examId);
  if (!exam) throw new Error('Exam not found');

  const updatedMaterials = exam.studyMaterials.map((m) =>
    m.id === materialId ? { ...m, ...updates } : m,
  );

  await updateDoc(doc(db, EXAMS_COLLECTION, examId), {
    studyMaterials: updatedMaterials,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}
