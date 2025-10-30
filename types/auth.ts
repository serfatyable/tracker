export type Role = 'resident' | 'tutor' | 'admin';

export type UserSettings = {
  language: 'en' | 'he';
  theme?: 'light' | 'dark' | 'system';
  notifications?: {
    inApp: boolean;
    email: boolean;
  };
  morningMeetings?: {
    icsToken?: string;
    reminderOptIn?: boolean;
  };
};

export type BaseUserProfile = {
  uid: string;
  fullName?: string;
  fullNameHe?: string; // Optional Hebrew display name for matching Excel rosters
  email?: string | null;
  role: Role;
  status: 'pending' | 'active' | 'disabled';
  settings: UserSettings;
  createdAt?: Date;
};

export type ResidentProfile = BaseUserProfile & {
  role: 'resident';
  residencyStartDate: string; // YYYY-MM-DD
  studyprogramtype: '4-year' | '6-year'; // Medical school program type
  completedRotationIds?: string[]; // IDs of rotations already completed
  currentRotationId?: string; // ID of current rotation
};

export type TutorProfile = BaseUserProfile & { role: 'tutor' };
export type AdminProfile = BaseUserProfile & { role: 'admin' };

export type UserProfile = ResidentProfile | TutorProfile | AdminProfile;
