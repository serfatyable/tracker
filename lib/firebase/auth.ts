import type { User } from 'firebase/auth';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

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
}) {
  const { auth, db } = getAuthDb();
  const { email, password, fullName, fullNameHe, role, language, residencyStartDate } = params;
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  let userDoc: UserProfile;
  if (role === 'resident') {
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
