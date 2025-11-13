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

/**
 * Station assignment entry - represents a user assigned to a station
 */
export type StationAssignment = {
  userId: string;
  userDisplayName: string;
};

/**
 * Collection of station assignments for a given day
 */
export type StationsMap = Partial<Record<StationKey, StationAssignment>>;

export type OnCallDay = {
  id?: string; // same as dateKey
  dateKey: string; // YYYY-MM-DD
  date: Timestamp; // start of day (Asia/Jerusalem) stored as UTC midnight
  stations: StationsMap;
  createdAt?: Timestamp;
};

/**
 * Client-side representation of an on-call shift (used in UI)
 */
export type OnCallShift = {
  date: Date;
  dateKey: string;
  stationKey: StationKey;
  userDisplayName: string;
  userId: string;
};

/**
 * Statistics about on-call shifts for a user
 */
export type OnCallStats = {
  totalShifts: number;
  mostCommonStation: StationKey | null;
  stationCounts: Partial<Record<StationKey, number>>;
  upcomingShifts: number;
};

/**
 * Date range for querying on-call data
 */
export type DateRange = {
  startKey: string;
  endKey: string;
};
