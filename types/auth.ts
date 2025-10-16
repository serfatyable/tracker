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
  email?: string | null;
  role: Role;
  status: 'pending' | 'active' | 'disabled';
  settings: UserSettings;
  createdAt?: Date;
};

export type ResidentProfile = BaseUserProfile & {
  role: 'resident';
  residencyStartDate: string; // YYYY-MM-DD
};

export type TutorProfile = BaseUserProfile & { role: 'tutor' };
export type AdminProfile = BaseUserProfile & { role: 'admin' };

export type UserProfile = ResidentProfile | TutorProfile | AdminProfile;
