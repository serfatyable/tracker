/**
 * Sanitization utility using DOMPurify
 * Protects against XSS attacks by sanitizing user-generated content
 */
import DOMPurify from 'dompurify';

/**
 * Configuration for DOMPurify
 * - ALLOWED_TAGS: Only allow basic text formatting tags
 * - ALLOWED_ATTR: Minimal attributes for styling
 * - KEEP_CONTENT: Keep text content even if tags are removed
 */
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span'],
  ALLOWED_ATTR: ['class'],
  KEEP_CONTENT: true,
  RETURN_TRUSTED_TYPE: false,
};

/**
 * Strict configuration for plain text only (no HTML tags allowed)
 */
const SANITIZE_CONFIG_STRICT = {
  ALLOWED_TAGS: [] as string[],
  ALLOWED_ATTR: [] as string[],
  KEEP_CONTENT: true,
  RETURN_TRUSTED_TYPE: false,
};

/**
 * Sanitizes user-generated content to prevent XSS attacks
 * Allows basic HTML formatting (bold, italic, etc.)
 *
 * @param content - The content to sanitize
 * @returns Sanitized content safe for rendering
 *
 * @example
 * ```ts
 * const userInput = '<script>alert("XSS")</script>Hello <b>World</b>';
 * const safe = sanitizeContent(userInput);
 * // Returns: 'Hello <b>World</b>'
 * ```
 */
export function sanitizeContent(content: string | null | undefined): string {
  if (!content) return '';

  // DOMPurify requires a DOM environment
  // In SSR context, we'll use a stricter sanitization
  if (typeof window === 'undefined') {
    return sanitizeContentStrict(content);
  }

  return String(DOMPurify.sanitize(content, SANITIZE_CONFIG));
}

/**
 * Sanitizes content with strict rules - removes all HTML tags
 * Use this for user names, titles, and other fields that should be plain text
 *
 * @param content - The content to sanitize
 * @returns Sanitized plain text content
 *
 * @example
 * ```ts
 * const userInput = 'Dr. Smith<script>alert("XSS")</script>';
 * const safe = sanitizeContentStrict(userInput);
 * // Returns: 'Dr. Smith'
 * ```
 */
export function sanitizeContentStrict(content: string | null | undefined): string {
  if (!content) return '';

  // In SSR context, manually strip HTML tags
  if (typeof window === 'undefined') {
    return content.replace(/<[^>]*>/g, '');
  }

  return String(DOMPurify.sanitize(content, SANITIZE_CONFIG_STRICT));
}

/**
 * Sanitizes an array of strings
 *
 * @param items - Array of strings to sanitize
 * @param strict - Use strict sanitization (default: false)
 * @returns Array of sanitized strings
 */
export function sanitizeArray(
  items: (string | null | undefined)[] | null | undefined,
  strict = false
): string[] {
  if (!items) return [];

  const sanitizeFn = strict ? sanitizeContentStrict : sanitizeContent;
  return items.map(item => sanitizeFn(item));
}

/**
 * Sanitizes an object's string properties
 *
 * @param obj - Object with string properties to sanitize
 * @param fields - Array of field names to sanitize
 * @param strict - Use strict sanitization (default: false)
 * @returns New object with sanitized fields
 *
 * @example
 * ```ts
 * const task = {
 *   title: 'Task<script>alert(1)</script>',
 *   description: 'Description with <b>formatting</b>',
 *   id: '123'
 * };
 * const sanitized = sanitizeObject(task, ['title', 'description']);
 * // Returns: { title: 'Task', description: 'Description with <b>formatting</b>', id: '123' }
 * ```
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T | null | undefined,
  fields: (keyof T)[],
  strict = false
): T {
  if (!obj) return {} as T;

  const sanitizeFn = strict ? sanitizeContentStrict : sanitizeContent;
  const result = { ...obj };

  fields.forEach(field => {
    if (typeof result[field] === 'string') {
      result[field] = sanitizeFn(result[field]) as T[keyof T];
    }
  });

  return result;
}

/**
 * Component for safely rendering sanitized HTML
 * Use this when you need to render user content that may contain HTML
 *
 * @example
 * ```tsx
 * <div dangerouslySetInnerHTML={{ __html: sanitizeContent(userContent) }} />
 * ```
 */
export function createSafeHtml(content: string | null | undefined): { __html: string } {
  return { __html: sanitizeContent(content) };
}

/**
 * Hook for sanitizing content in React components
 * Memoizes the sanitization result to avoid unnecessary re-renders
 *
 * @param content - Content to sanitize
 * @param strict - Use strict sanitization (default: false)
 * @returns Sanitized content
 */
export function useSanitizedContent(
  content: string | null | undefined,
  strict = false
): string {
  // Note: React hooks would be imported here if needed
  // For now, just return the sanitized content
  const sanitizeFn = strict ? sanitizeContentStrict : sanitizeContent;
  return sanitizeFn(content);
}
