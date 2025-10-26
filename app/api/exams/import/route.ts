import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { parseExamsExcel } from '@/lib/exams/excel';

// Initialize Firebase Admin
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

/**
 * POST /api/exams/import
 * Bulk import exams from Excel file
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'MISSING_AUTH' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'MISSING_AUTH' }, { status: 401 });
    }

    // Verify user is admin/tutor
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();

    if (!userData || !['admin', 'tutor'].includes(userData.role)) {
      return NextResponse.json({ error: 'ADMIN_REQUIRED' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'NO_FILE' }, { status: 400 });
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'FILE_TOO_LARGE' }, { status: 400 });
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();

    // Get existing exams for duplicate detection
    const examsSnapshot = await db.collection('exams').where('isActive', '==', true).get();
    const existingExams = examsSnapshot.docs.map((doc) => ({
      examDate: doc.data().examDate.toDate(),
    }));

    // Parse Excel
    const { exams, errors, warnings, duplicates } = parseExamsExcel(
      Buffer.from(arrayBuffer),
      existingExams,
    );

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          errors,
          warnings,
          duplicates,
          examCount: exams.length,
        },
        { status: 400 },
      );
    }

    // Import exams
    const batch = db.batch();
    const importResults = {
      created: 0,
      updated: 0,
      skipped: 0,
    };

    for (const examGroup of exams) {
      // Parse date from DD/MM/YYYY
      const [day, month, year] = examGroup.examDate.split('/').map((n) => parseInt(n, 10));
      const examDate = new Date(year!, month! - 1, day!);

      // Check if exam already exists for this date
      const existingDoc = examsSnapshot.docs.find((doc) => {
        const data = doc.data();
        return data.examDate.toDate().toDateString() === examDate.toDateString();
      });

      // Generate subject IDs and format subjects
      const subjects = examGroup.subjects.map((subject) => ({
        id: crypto.randomUUID(),
        titleEn: subject.titleEn,
        titleHe: subject.titleHe,
        descriptionEn: subject.descriptionEn || '',
        descriptionHe: subject.descriptionHe || '',
        topics: subject.topics
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        bookChapters: subject.bookChapters
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        ...(subject.examLink && { examLink: subject.examLink }),
      }));

      if (existingDoc) {
        // Update existing exam
        const docRef = db.collection('exams').doc(existingDoc.id);
        batch.update(docRef, {
          ...(examGroup.examLink && { examLink: examGroup.examLink }),
          subjects,
          updatedAt: Timestamp.now(),
          updatedBy: uid,
        });
        importResults.updated++;
      } else {
        // Create new exam
        const newExamRef = db.collection('exams').doc();
        batch.set(newExamRef, {
          id: newExamRef.id,
          examDate: Timestamp.fromDate(examDate),
          ...(examGroup.examLink && { examLink: examGroup.examLink }),
          subjects,
          pastExams: [],
          studyMaterials: [],
          currentExam: null,
          isActive: true,
          createdAt: Timestamp.now(),
          createdBy: uid,
          updatedAt: Timestamp.now(),
          updatedBy: uid,
        });
        importResults.created++;
      }
    }

    // Commit batch
    await batch.commit();

    return NextResponse.json({
      success: true,
      ...importResults,
      totalExams: exams.length,
      warnings,
    });
  } catch (error) {
    console.error('Error importing exams:', error);
    return NextResponse.json(
      {
        error: 'IMPORT_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
