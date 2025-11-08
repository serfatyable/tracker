import type { User } from 'firebase/auth';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
  deleteUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

import type {
  Role,
  UserProfile,
  ResidentProfile,
  TutorProfile,
  AdminProfile,
} from '../../types/auth';

import { getFirebaseApp } from './client';

function getAuthDb() {
  const app = getFirebaseApp();
  return { auth: getAuth(app), db: getFirestore(app) };
}

export async function signIn(email: string, password: string) {
  const { auth } = getAuthDb();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfileExists(cred.user);
  return cred.user;
}

export async function signUp(params: {
  fullName: string;
  fullNameHe?: string;
  email: string;
  password: string;
  role: Role;
  language: 'en' | 'he';
  residencyStartDate?: string; // YYYY-MM-DD when role is resident
  studyprogramtype?: '4-year' | '6-year'; // Medical school program type
  completedRotationIds?: string[]; // IDs of completed rotations
  currentRotationId?: string; // ID of current rotation
}) {
  const { auth, db } = getAuthDb();
  const {
    email,
    password,
    fullName,
    fullNameHe,
    role,
    language,
    residencyStartDate,
    studyprogramtype,
    completedRotationIds,
    currentRotationId,
  } = params;
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  let userDoc: UserProfile;
  if (role === 'resident') {
    const normalizedCurrentRotationId = currentRotationId?.trim() ? currentRotationId : null;
    const requestedCompleted = Array.from(
      new Set((completedRotationIds || []).filter((id) => id && id.trim() !== '')),
    );
    if (normalizedCurrentRotationId && !requestedCompleted.includes(normalizedCurrentRotationId)) {
      requestedCompleted.push(normalizedCurrentRotationId);
    }

    const residentDoc: ResidentProfile = {
      uid: cred.user.uid,
      fullName,
      fullNameHe,
      email,
      role: 'resident',
      status: 'pending',
      settings: { language },
      createdAt: serverTimestamp() as unknown as Date,
      residencyStartDate: residencyStartDate || '',
      studyprogramtype: studyprogramtype || '6-year',
      completedRotationIds: [],
      currentRotationId: undefined,
      rotationSelectionRequest: {
        status: 'pending',
        requestedCompletedRotationIds: requestedCompleted,
        requestedCurrentRotationId: normalizedCurrentRotationId,
        submittedAt: serverTimestamp() as unknown as Date,
        resolvedAt: null,
      },
    };
    userDoc = residentDoc;
  } else if (role === 'tutor') {
    const tutorDoc: TutorProfile = {
      uid: cred.user.uid,
      fullName,
      fullNameHe,
      email,
      role: 'tutor',
      status: 'pending',
      settings: { language },
      createdAt: serverTimestamp() as unknown as Date,
    };
    userDoc = tutorDoc;
  } else {
    const adminDoc: AdminProfile = {
      uid: cred.user.uid,
      fullName,
      fullNameHe,
      email,
      role: 'admin',
      status: 'pending',
      settings: { language },
      createdAt: serverTimestamp() as unknown as Date,
    };
    userDoc = adminDoc;
  }

  await setDoc(doc(db, 'users', cred.user.uid), userDoc as any, { merge: true });
  return cred.user;
}

export async function signOut() {
  const { auth } = getAuthDb();
  await fbSignOut(auth);
}

export async function signOutAndRedirect() {
  try {
    await signOut();
  } finally {
    try {
      localStorage.removeItem('i18n_lang');
    } catch {
      /* noop */
    }
    try {
      // expire cookie
      if (typeof document !== 'undefined') {
        document.cookie = 'i18n_lang=; Max-Age=0; path=/; SameSite=Lax';
      }
    } catch {
      /* noop */
    }
    if (typeof window !== 'undefined') {
      // soft redirect
      window.location.replace('/auth');
      // hard assert after a short delay
      setTimeout(async () => {
        try {
          const { getAuth } = await import('firebase/auth');
          const auth = getAuth();
          if (auth.currentUser) window.location.href = '/auth';
        } catch {
          window.location.href = '/auth';
        }
      }, 300);
    }
  }
}

async function ensureUserProfileExists(user: User) {
  const { db } = getAuthDb();
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      role: 'resident',
      status: 'pending',
      settings: { language: 'en' },
      createdAt: serverTimestamp(),
    });
  }
}

export async function getCurrentUserWithProfile(): Promise<{
  firebaseUser: User | null;
  profile: UserProfile | null;
}> {
  const { auth, db } = getAuthDb();
  const current = auth.currentUser;
  if (!current) return { firebaseUser: null, profile: null };
  const snap = await getDoc(doc(db, 'users', current.uid));
  return { firebaseUser: current, profile: snap.exists() ? (snap.data() as UserProfile) : null };
}

export async function updateUserLanguage(language: 'en' | 'he') {
  const { auth, db } = getAuthDb();
  const current = auth.currentUser;
  if (!current) throw new Error('Not authenticated');
  const ref = doc(db, 'users', current.uid);
  await setDoc(ref, { settings: { language } }, { merge: true });
}

export async function updateUserTheme(theme: 'light' | 'dark' | 'system') {
  const { auth, db } = getAuthDb();
  const current = auth.currentUser;
  if (!current) throw new Error('Not authenticated');
  const ref = doc(db, 'users', current.uid);
  await setDoc(ref, { settings: { theme } }, { merge: true });
}

export async function updateUserNotifications(notifications: { inApp?: boolean; email?: boolean }) {
  const { auth, db } = getAuthDb();
  const current = auth.currentUser;
  if (!current) throw new Error('Not authenticated');
  const ref = doc(db, 'users', current.uid);
  await setDoc(ref, { settings: { notifications } }, { merge: true });
}

export async function requestPasswordReset(email: string) {
  const { auth } = getAuthDb();
  await sendPasswordResetEmail(auth, email);
}

/**
 * Re-authenticate the current user with their password.
 * Required before sensitive operations like email/password changes or account deletion.
 */
export async function reauthenticateUser(password: string) {
  const { auth } = getAuthDb();
  const current = auth.currentUser;
  if (!current || !current.email) throw new Error('Not authenticated');
  const credential = EmailAuthProvider.credential(current.email, password);
  await reauthenticateWithCredential(current, credential);
}

/**
 * Update the current user's email address.
 * Requires re-authentication first.
 */
export async function updateUserEmail(newEmail: string, password: string) {
  const { auth, db } = getAuthDb();
  const current = auth.currentUser;
  if (!current) throw new Error('Not authenticated');

  // Re-authenticate first
  await reauthenticateUser(password);

  // Update email in Firebase Auth
  await updateEmail(current, newEmail);

  // Update email in Firestore
  const ref = doc(db, 'users', current.uid);
  await updateDoc(ref, {
    email: newEmail,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update the current user's password.
 * Requires re-authentication first.
 */
export async function updateUserPassword(currentPassword: string, newPassword: string) {
  const { auth } = getAuthDb();
  const current = auth.currentUser;
  if (!current) throw new Error('Not authenticated');

  // Re-authenticate first
  await reauthenticateUser(currentPassword);

  // Update password
  await updatePassword(current, newPassword);
}

/**
 * Update user profile fields (fullName, fullNameHe, residencyStartDate).
 */
export async function updateUserProfile(fields: {
  fullName?: string;
  fullNameHe?: string;
  residencyStartDate?: string;
}) {
  const { auth, db } = getAuthDb();
  const current = auth.currentUser;
  if (!current) throw new Error('Not authenticated');

  const ref = doc(db, 'users', current.uid);
  await updateDoc(ref, {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete the current user's account and all associated data.
 * Requires re-authentication first.
 * WARNING: This action is irreversible.
 */
export async function deleteUserAccount(password: string) {
  const { auth, db } = getAuthDb();
  const current = auth.currentUser;
  if (!current) throw new Error('Not authenticated');

  // Re-authenticate first
  await reauthenticateUser(password);

  const uid = current.uid;

  // Delete all user-associated data in Firestore
  const batch = writeBatch(db);

  // Delete user profile
  batch.delete(doc(db, 'users', uid));

  // Delete user's tasks
  const tasksSnapshot = await getDocs(query(collection(db, 'tasks'), where('userId', '==', uid)));
  tasksSnapshot.forEach((taskDoc) => {
    batch.delete(taskDoc.ref);
  });

  // Delete user's cases
  const casesSnapshot = await getDocs(query(collection(db, 'cases'), where('userId', '==', uid)));
  casesSnapshot.forEach((caseDoc) => {
    batch.delete(caseDoc.ref);
  });

  // Commit all deletions
  await batch.commit();

  // Delete the Firebase Auth user (this will also sign them out)
  await deleteUser(current);
}
