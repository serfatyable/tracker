import type { Timestamp } from 'firebase/firestore';

/**
 * Material that can be uploaded for an exam (study guides, PDFs, etc.)
 */
export interface ExamMaterial {
  id: string;
  type: 'pdf' | 'link';
  title: string;
  titleHe: string;
  url: string; // Firebase Storage URL or external link
  fileName?: string; // For PDF files
  description?: string;
  descriptionHe?: string;
  uploadedAt: Timestamp;
  uploadedBy: string; // User ID
}

/**
 * Past exam file in the archive
 */
export interface PastExam {
  id: string;
  fileUrl: string;
  fileName: string;
  examDate: Timestamp; // When this exam was actually given
  uploadedAt: Timestamp;
  uploadedBy: string; // User ID
}

/**
 * Current exam file
 */
export interface CurrentExam {
  fileUrl: string;
  fileName: string;
  uploadedAt: Timestamp;
  uploadedBy: string; // User ID
}

/**
 * Individual subject/topic within an exam
 * Multiple subjects can be tested on the same date (max 2)
 */
export interface ExamSubject {
  id: string; // Unique ID for this subject
  titleEn: string;
  titleHe: string;
  descriptionEn?: string;
  descriptionHe?: string;
  topics: string[]; // e.g., ["Pharmacology", "Drug Interactions"]
  bookChapters: string[]; // e.g., ["Chapter 5", "Chapter 6"]
  examLink?: string; // Optional separate link for this specific subject
}

/**
 * Main exam document in Firestore
 * Represents an exam date with one or more subjects
 */
export interface Exam {
  id: string;

  // Scheduling
  examDate: Timestamp;

  // Default exam link (shared by all subjects unless subject has its own)
  examLink?: string; // URL to the exam (Google Form, etc.)

  // Subjects being tested on this date (max 2 recommended)
  subjects: ExamSubject[];

  // Materials
  currentExam?: CurrentExam;
  pastExams: PastExam[];
  studyMaterials: ExamMaterial[];

  // Metadata
  createdAt: Timestamp;
  createdBy: string; // User ID
  updatedAt: Timestamp;
  updatedBy: string; // User ID
  isActive: boolean; // Can be archived/hidden
}

/**
 * Subject form data (before creating ExamSubject)
 */
export interface SubjectFormData {
  titleEn: string;
  titleHe: string;
  descriptionEn?: string;
  descriptionHe?: string;
  topics: string[];
  bookChapters: string[];
  examLink?: string; // Optional separate link for this subject
}

/**
 * Form data for creating/editing an exam (before Firestore conversion)
 */
export interface ExamFormData {
  examDate: Date;
  examLink?: string; // Default link for all subjects
  subjects: SubjectFormData[]; // Array of subjects (max 2 recommended)
  isActive: boolean;
}

/**
 * Material form data (before upload)
 */
export interface MaterialFormData {
  type: 'pdf' | 'link';
  title: string;
  titleHe: string;
  url?: string; // For links
  file?: File; // For PDFs
  description?: string;
  descriptionHe?: string;
}
