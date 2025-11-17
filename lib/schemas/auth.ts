import { z } from 'zod';

/**
 * Auth Form Validation Schemas
 *
 * These schemas validate user input for authentication flows.
 */

// Email validation schema
export const emailSchema = z
  .string()
  .min(1, 'errors.required')
  .email('errors.email')
  .trim()
  .toLowerCase();

// Password validation schema
export const passwordSchema = z
  .string()
  .min(1, 'errors.required')
  .min(8, 'errors.passwordLength');

// Date validation for residency start date (YYYY-MM-DD, must be in the past)
export const pastDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'errors.invalidDateFormat')
  .refine((val) => {
    const d = new Date(val + 'T00:00:00');
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d.getTime() <= todayStart.getTime();
  }, 'errors.dateInFuture');

// Sign-in form schema
export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type SignInInput = z.infer<typeof signInSchema>;

// Password reset schema
export const passwordResetSchema = z.object({
  email: emailSchema,
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

// Base sign-up schema (common fields)
const baseSignUpSchema = z.object({
  fullName: z.string().min(1, 'errors.required').trim(),
  fullNameHe: z.string().trim().optional(),
  email: emailSchema,
  password: passwordSchema,
  language: z.enum(['en', 'he']),
});

// Resident-specific sign-up schema
export const residentSignUpSchema = baseSignUpSchema.extend({
  role: z.literal('resident'),
  residencyStartDate: pastDateSchema,
  studyprogramtype: z.enum(['4-year', '6-year']),
  completedRotationIds: z.array(z.string()).default([]),
  currentRotationId: z.string().min(1, 'auth.atLeastOneRotationRequired'),
});

export type ResidentSignUpInput = z.infer<typeof residentSignUpSchema>;

// Tutor sign-up schema
export const tutorSignUpSchema = baseSignUpSchema.extend({
  role: z.literal('tutor'),
});

export type TutorSignUpInput = z.infer<typeof tutorSignUpSchema>;

// Admin sign-up schema
export const adminSignUpSchema = baseSignUpSchema.extend({
  role: z.literal('admin'),
});

export type AdminSignUpInput = z.infer<typeof adminSignUpSchema>;

// Combined sign-up schema (discriminated union)
export const signUpSchema = z.discriminatedUnion('role', [
  residentSignUpSchema,
  tutorSignUpSchema,
  adminSignUpSchema,
]);

export type SignUpInput = z.infer<typeof signUpSchema>;

// Update email schema (requires password for re-authentication)
export const updateEmailSchema = z.object({
  newEmail: emailSchema,
  password: passwordSchema,
});

export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;

// Update password schema
export const updatePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
});

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

// Update profile schema
export const updateProfileSchema = z.object({
  fullName: z.string().min(1, 'errors.required').trim().optional(),
  fullNameHe: z.string().trim().optional(),
  residencyStartDate: pastDateSchema.optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Delete account schema (requires password for re-authentication)
export const deleteAccountSchema = z.object({
  password: passwordSchema,
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
