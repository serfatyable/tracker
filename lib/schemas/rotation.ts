import { z } from 'zod';

/**
 * Rotation and Rotation-Related Validation Schemas
 *
 * These schemas validate rotation data, rotation nodes, and rotation petitions.
 */

// Rotation status schema
export const rotationStatusSchema = z.enum(['active', 'inactive', 'finished']);

export type RotationStatus = z.infer<typeof rotationStatusSchema>;

// Rotation source schema
export const rotationSourceSchema = z.enum(['manual', 'import']);

export type RotationSource = z.infer<typeof rotationSourceSchema>;

// Rotation schema
export const rotationSchema = z.object({
  id: z.string(),
  name: z.string(),
  name_en: z.string().optional(),
  name_he: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  isCore: z.boolean().optional(),
  ownerTutorIds: z.array(z.string()).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(), // Hex color
  description: z.string().optional(),
  status: rotationStatusSchema.optional(),
  source: rotationSourceSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

export type Rotation = z.infer<typeof rotationSchema>;

// Rotation node type schema
export const rotationNodeTypeSchema = z.enum([
  'category',
  'subject',
  'topic',
  'subTopic',
  'subSubTopic',
  'leaf',
]);

export type RotationNodeType = z.infer<typeof rotationNodeTypeSchema>;

// Rotation node link schema
export const rotationNodeLinkSchema = z.object({
  label: z.string().optional(),
  label_en: z.string().optional(),
  label_he: z.string().optional(),
  href: z.string().url(),
});

// Rotation node schema
export const rotationNodeSchema = z.object({
  id: z.string(),
  rotationId: z.string(),
  parentId: z.string().nullable(),
  type: rotationNodeTypeSchema,
  name: z.string(),
  name_en: z.string().optional(),
  name_he: z.string().optional(),
  order: z.number().int().nonnegative(),
  requiredCount: z.number().int().nonnegative().optional(),
  links: z.array(rotationNodeLinkSchema).optional(),
  mcqUrl: z.string().url().optional(),
  resources: z.string().optional(),
  notes_en: z.string().max(500).optional(),
  notes_he: z.string().max(500).optional(),
});

export type RotationNode = z.infer<typeof rotationNodeSchema>;

// Rotation petition type schema
export const rotationPetitionTypeSchema = z.enum(['activate', 'finish']);

export type RotationPetitionType = z.infer<typeof rotationPetitionTypeSchema>;

// Rotation petition status schema
export const rotationPetitionStatusSchema = z.enum(['pending', 'approved', 'denied']);

export type RotationPetitionStatus = z.infer<typeof rotationPetitionStatusSchema>;

// Rotation petition schema
export const rotationPetitionSchema = z.object({
  id: z.string(),
  residentId: z.string(),
  rotationId: z.string(),
  type: rotationPetitionTypeSchema,
  status: rotationPetitionStatusSchema,
  requestedAt: z.date(),
  resolvedAt: z.date().optional(),
  resolvedBy: z.string().optional(),
  reason: z.string().optional(),
});

export type RotationPetition = z.infer<typeof rotationPetitionSchema>;

// Rotation petition with details schema
export const rotationPetitionWithDetailsSchema = rotationPetitionSchema.extend({
  residentName: z.string(),
  rotationName: z.string(),
});

export type RotationPetitionWithDetails = z.infer<typeof rotationPetitionWithDetailsSchema>;

// Assignment status schema
export const assignmentStatusSchema = z.enum(['inactive', 'active', 'finished']);

export type AssignmentStatus = z.infer<typeof assignmentStatusSchema>;

// Assignment schema
export const assignmentSchema = z.object({
  id: z.string(),
  residentId: z.string(),
  rotationId: z.string(),
  tutorIds: z.array(z.string()),
  startedAt: z.date().nullable(),
  endedAt: z.date().nullable(),
  status: assignmentStatusSchema,
  isGlobal: z.boolean().optional(),
});

export type Assignment = z.infer<typeof assignmentSchema>;

// Assignment with details schema
export const assignmentWithDetailsSchema = assignmentSchema.extend({
  residentName: z.string().optional(),
  tutorNames: z.array(z.string()).optional(),
  rotationName: z.string().optional(),
});

export type AssignmentWithDetails = z.infer<typeof assignmentWithDetailsSchema>;
