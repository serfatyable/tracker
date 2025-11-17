import { z } from 'zod';

import { rotationPetitionTypeSchema, rotationPetitionStatusSchema } from './rotation';

/**
 * API Request/Response Validation Schemas
 *
 * These schemas validate incoming API requests and responses.
 */

// ==== Rotation Petitions API ====

// POST /api/rotation-petitions - Create petition
export const createRotationPetitionRequestSchema = z.object({
  rotationId: z.string().min(1, 'Rotation ID is required.'),
  type: rotationPetitionTypeSchema,
  reason: z.string().optional().default(''),
});

export type CreateRotationPetitionRequest = z.infer<typeof createRotationPetitionRequestSchema>;

// PATCH /api/rotation-petitions - Update petition (approve/deny)
export const updateRotationPetitionRequestSchema = z.object({
  petitionId: z.string().min(1, 'Petition ID is required.'),
  action: z.enum(['approve', 'deny']),
});

export type UpdateRotationPetitionRequest = z.infer<typeof updateRotationPetitionRequestSchema>;

// GET /api/rotation-petitions - Query params
export const listRotationPetitionsQuerySchema = z.object({
  status: rotationPetitionStatusSchema.optional(),
  residentId: z.string().optional(),
  limit: z.coerce.number().int().positive().max(1000).optional(),
});

export type ListRotationPetitionsQuery = z.infer<typeof listRotationPetitionsQuerySchema>;

// ==== Account Deletion API ====

// DELETE /api/account/delete - No body, uses Authorization header
export const deleteAccountRequestSchema = z.object({});

export type DeleteAccountRequest = z.infer<typeof deleteAccountRequestSchema>;

// ==== Import APIs ====

// Common import options
const importOptionsSchema = z.object({
  overwrite: z.boolean().optional().default(false),
  dryRun: z.boolean().optional().default(false),
});

// POST /api/on-call/import
export const importOnCallRequestSchema = z.object({
  file: z.instanceof(File).refine((file) => {
    return (
      file.type === 'text/csv' ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.xlsx')
    );
  }, 'File must be CSV or XLSX'),
  options: importOptionsSchema.optional(),
});

export type ImportOnCallRequest = z.infer<typeof importOnCallRequestSchema>;

// POST /api/morning-meetings/import
export const importMorningMeetingsRequestSchema = z.object({
  file: z.instanceof(File).refine((file) => {
    return (
      file.type === 'text/csv' ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.xlsx')
    );
  }, 'File must be CSV or XLSX'),
  options: importOptionsSchema.optional(),
});

export type ImportMorningMeetingsRequest = z.infer<typeof importMorningMeetingsRequestSchema>;

// POST /api/exams/import
export const importExamsRequestSchema = z.object({
  file: z.instanceof(File).refine((file) => {
    return (
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.name.endsWith('.xlsx')
    );
  }, 'File must be XLSX'),
  options: importOptionsSchema.optional(),
});

export type ImportExamsRequest = z.infer<typeof importExamsRequestSchema>;

// ==== On-Call Backfill API ====

// POST /api/on-call/backfill
export const onCallBackfillRequestSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
});

export type OnCallBackfillRequest = z.infer<typeof onCallBackfillRequestSchema>;

// ==== Telemetry API ====

// POST /api/telemetry/web-vitals
export const webVitalsRequestSchema = z.object({
  id: z.string(),
  name: z.enum(['CLS', 'FCP', 'FID', 'LCP', 'TTFB', 'INP']),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  delta: z.number().optional(),
  navigationType: z.string().optional(),
});

export type WebVitalsRequest = z.infer<typeof webVitalsRequestSchema>;

// ==== ICS Token Generation ====

// POST /api/ics/morning-meetings
export const generateIcsTokenRequestSchema = z.object({
  type: z.enum(['morning-meetings', 'on-call', 'exams']),
});

export type GenerateIcsTokenRequest = z.infer<typeof generateIcsTokenRequestSchema>;

// ==== Admin User Sync ====

// POST /api/admin/users/sync
export const syncUsersRequestSchema = z.object({
  userIds: z.array(z.string()).optional(),
  syncAll: z.boolean().optional().default(false),
});

export type SyncUsersRequest = z.infer<typeof syncUsersRequestSchema>;

// ==== Admin Fix Rotation Activations ====

// POST /api/admin/fix-rotation-activations
export const fixRotationActivationsRequestSchema = z.object({
  dryRun: z.boolean().optional().default(false),
});

export type FixRotationActivationsRequest = z.infer<typeof fixRotationActivationsRequestSchema>;
