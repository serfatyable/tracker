import type { Timestamp } from 'firebase/firestore';

export type MorningMeeting = {
  id?: string;
  date: Timestamp; // 07:10 Asia/Jerusalem
  endDate: Timestamp; // 07:50 Asia/Jerusalem
  dateKey: string; // YYYY-MM-DD
  title: string;
  lecturer: string;
  organizer: string;
  link?: string;
  notes?: string;
  lecturerUserId?: string;
  lecturerEmailResolved?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type MorningMeetingsByDate = Record<string, MorningMeeting[]>;


