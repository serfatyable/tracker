import { z } from 'zod';

/**
 * User Profile Validation Schemas
 *
 * These schemas validate user profile data stored in Firestore.
 */

// User settings schema
export const userSettingsSchema = z.object({
  language: z.enum(['en', 'he']),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z
    .object({
      inApp: z.boolean(),
      email: z.boolean(),
    })
    .optional(),
  morningMeetings: z
    .object({
      icsToken: z.string().optional(),
      reminderOptIn: z.boolean().optional(),
    })
    .optional(),
  quickAccessTabs: z.array(z.string()).optional(),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

// Role schema
export const roleSchema = z.enum(['resident', 'tutor', 'admin']);

export type Role = z.infer<typeof roleSchema>;

// Status schema
export const statusSchema = z.enum(['pending', 'active', 'disabled']);

export type Status = z.infer<typeof statusSchema>;

// Rotation selection request schema
export const rotationSelectionRequestSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  requestedCompletedRotationIds: z.array(z.string()),
  requestedCurrentRotationId: z.string().nullable(),
  submittedAt: z.date().optional(),
  resolvedAt: z.date().nullable().optional(),
});

export type RotationSelectionRequest = z.infer<typeof rotationSelectionRequestSchema>;

// Base user profile schema
const baseUserProfileSchema = z.object({
  uid: z.string(),
  fullName: z.string().optional(),
  fullNameHe: z.string().optional(),
  email: z.string().email().nullable().optional(),
  role: roleSchema,
  status: statusSchema,
  settings: userSettingsSchema,
  createdAt: z.date().optional(),
});

// Resident profile schema
export const residentProfileSchema = baseUserProfileSchema.extend({
  role: z.literal('resident'),
  residencyStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  studyprogramtype: z.enum(['4-year', '6-year']),
  completedRotationIds: z.array(z.string()).optional(),
  currentRotationId: z.string().optional(),
  rotationSelectionRequest: rotationSelectionRequestSchema.nullable().optional(),
});

export type ResidentProfile = z.infer<typeof residentProfileSchema>;

// Tutor profile schema
export const tutorProfileSchema = baseUserProfileSchema.extend({
  role: z.literal('tutor'),
});

export type TutorProfile = z.infer<typeof tutorProfileSchema>;

// Admin profile schema
export const adminProfileSchema = baseUserProfileSchema.extend({
  role: z.literal('admin'),
});

export type AdminProfile = z.infer<typeof adminProfileSchema>;

// Combined user profile schema (discriminated union)
export const userProfileSchema = z.discriminatedUnion('role', [
  residentProfileSchema,
  tutorProfileSchema,
  adminProfileSchema,
]);

export type UserProfile = z.infer<typeof userProfileSchema>;

// Update user settings schemas
export const updateLanguageSchema = z.object({
  language: z.enum(['en', 'he']),
});

export const updateThemeSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
});

export const updateNotificationsSchema = z.object({
  notifications: z.object({
    inApp: z.boolean().optional(),
    email: z.boolean().optional(),
  }),
});

export const updateQuickAccessTabsSchema = z.object({
  quickAccessTabs: z.array(z.string()),
});
