import type { Timestamp } from 'firebase/firestore';

export type MorningMeeting = {
  id?: string;
  date: Timestamp; // 07:10 Asia/Jerusalem
  endDate: Timestamp; // 07:50 Asia/Jerusalem
  dateKey: string; // YYYY-MM-DD
  dayOfWeek: string; // Hebrew day: א, ב, ג, ד, ה, ו
  title: string;
  lecturer?: string; // Optional - may not be assigned yet
  moderator?: string; // Optional - may not be assigned yet
  organizer?: string; // Optional - may not be assigned yet
  link?: string;
  notes?: string;
  lecturerUserId?: string;
  lecturerEmailResolved?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type MorningMeetingsByDate = Record<string, MorningMeeting[]>;
