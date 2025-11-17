import type { z } from 'zod';

/**
 * Validation Helpers
 *
 * Utility functions for validating data against Zod schemas and formatting errors.
 */

/**
 * Validates data against a Zod schema and returns validation errors
 * formatted for i18n translation keys.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Object with error messages keyed by field name, or null if valid
 *
 * @example
 * const errors = validateWithSchema(signInSchema, { email: '', password: '' });
 * if (errors) {
 *   // errors = { email: 'errors.required', password: 'errors.required' }
 *   setFormErrors(errors);
 * }
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): Record<string, string> | null {
  const result = schema.safeParse(data);

  if (result.success) {
    return null;
  }

  const errors: Record<string, string> = {};

  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  }

  return errors;
}

/**
 * Validates data against a Zod schema and throws an error if invalid.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Parsed and validated data
 * @throws Error with validation details if data is invalid
 *
 * @example
 * const validData = validateOrThrow(signUpSchema, formData);
 * // validData is now typed and validated
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Validates data against a Zod schema and returns a Result type.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Result object with success flag and either data or errors
 *
 * @example
 * const result = validateSafe(signInSchema, formData);
 * if (result.success) {
 *   const { email, password } = result.data;
 * } else {
 *   setErrors(result.errors);
 * }
 */
export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
):
  | { success: true; data: T }
  | { success: false; errors: Record<string, string>; formattedError: string } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  const errorMessages: string[] = [];

  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    errors[path] = issue.message;
    errorMessages.push(`${path}: ${issue.message}`);
  }

  return {
    success: false,
    errors,
    formattedError: errorMessages.join('; '),
  };
}

/**
 * Type-safe wrapper for form data validation.
 * Returns both validation errors and a boolean indicating validity.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Tuple of [errors, isValid]
 *
 * @example
 * const [errors, isValid] = validateForm(signUpSchema, formData);
 * if (!isValid) {
 *   setFormErrors(errors);
 *   return;
 * }
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): [Record<string, string>, false] | [null, true] {
  const errors = validateWithSchema(schema, data);

  if (errors) {
    return [errors, false];
  }

  return [null, true];
}

/**
 * Validates API request body and returns NextResponse with error if invalid.
 * Use this in API route handlers for consistent error responses.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated data or null if invalid
 *
 * @example
 * // In API route:
 * const body = await req.json();
 * const result = validateSafe(createPetitionSchema, body);
 * if (!result.success) {
 *   return NextResponse.json({ error: result.formattedError }, { status: 400 });
 * }
 * // Use result.data with type safety
 */
export function validateApiRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string; status: number } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errorMessages: string[] = [];
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    errorMessages.push(path ? `${path}: ${issue.message}` : issue.message);
  }

  return {
    success: false,
    error: errorMessages.join('; '),
    status: 400,
  };
}

/**
 * Parses unknown data with a schema, returning undefined if parsing fails.
 * Useful for optional/nullable fields.
 *
 * @param schema - Zod schema to parse with
 * @param data - Data to parse
 * @returns Parsed data or undefined
 *
 * @example
 * const user = parseOptional(userProfileSchema, snapshot.data());
 * if (user) {
 *   // user is typed and validated
 * }
 */
export function parseOptional<T>(schema: z.ZodSchema<T>, data: unknown): T | undefined {
  const result = schema.safeParse(data);
  return result.success ? result.data : undefined;
}
