import { doc, getFirestore, serverTimestamp, updateDoc } from 'firebase/firestore';

import { getFirebaseApp } from '../firebase/client';

export async function updateMorningMeetingReminderOptIn(
  userId: string,
  enabled: boolean,
): Promise<void> {
  const app = getFirebaseApp();
  const db = getFirestore(app);
  const ref = doc(db, 'users', userId);
  await updateDoc(ref, {
    'settings.morningMeetings.reminderOptIn': enabled,
    updatedAt: serverTimestamp(),
  } as any);
}
