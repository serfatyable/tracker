import type { Timestamp } from 'firebase/firestore';

export type StationKey =
  | 'or_main'
  | 'labor_delivery'
  | 'icu'
  | 'or_gyne'
  | 'pacu'
  | 'on_call_manager'
  | 'senior_or'
  | 'senior_or_half'
  | 'ortho_shatzi'
  | 'ortho_trauma'
  | 'ortho_joint'
  | 'surgery'
  | 'urology'
  | 'spine'
  | 'vascular_thoracic'
  | 'pain_service'
  | 'spine_injections'
  | 'weekly_day_off';

export type OnCallAssignment = {
  id?: string;
  dateKey: string; // YYYY-MM-DD (Asia/Jerusalem date for the shift)
  stationKey: StationKey;
  userId: string;
  userDisplayName: string;
  startAt: Timestamp; // Stored UTC
  endAt: Timestamp; // Stored UTC
  createdAt?: Timestamp;
  createdBy?: string; // uid
};

export type OnCallDay = {
  id?: string; // same as dateKey
  dateKey: string; // YYYY-MM-DD
  date: Timestamp; // start of day (Asia/Jerusalem) stored as UTC midnight
  stations: Partial<Record<StationKey, { userId: string; userDisplayName: string }>>;
  createdAt?: Timestamp;
};
