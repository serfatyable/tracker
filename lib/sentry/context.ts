/**
 * Sentry Context Management
 *
 * Utilities for setting user context and custom data in Sentry error reports.
 * This helps with debugging by providing user information and request context.
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Set user context in Sentry
 * Should be called after successful authentication
 *
 * @param user - User information to track
 * @example
 * ```typescript
 * setSentryUser({
 *   id: 'user123',
 *   email: 'user@example.com',
 *   role: 'resident'
 * });
 * ```
 */
export function setSentryUser(user: {
  id: string;
  email?: string | null;
  fullName?: string | null;
  role?: string;
  status?: string;
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email || undefined,
    username: user.fullName || undefined,
    // Custom user properties
    role: user.role,
    status: user.status,
  });
}

/**
 * Clear user context from Sentry
 * Should be called on sign-out
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Set custom context for the current scope
 * Useful for adding request-specific data to error reports
 *
 * @param contextName - Name of the context
 * @param contextData - Data to include in the context
 *
 * @example
 * ```typescript
 * setSentryContext('import', {
 *   fileSize: 1024000,
 *   rowCount: 500,
 *   operation: 'morning-meetings-import'
 * });
 * ```
 */
export function setSentryContext(contextName: string, contextData: Record<string, any>): void {
  Sentry.setContext(contextName, contextData);
}

/**
 * Add a breadcrumb to track user actions leading up to an error
 * Breadcrumbs create a timeline of events before an error occurred
 *
 * @param message - Description of the action
 * @param category - Category of the action (navigation, user-action, api, etc.)
 * @param level - Severity level (info, warning, error)
 * @param data - Additional data about the action
 *
 * @example
 * ```typescript
 * addSentryBreadcrumb('User clicked import button', 'user-action', 'info', {
 *   fileName: 'schedule.xlsx',
 *   fileSize: 1024000
 * });
 * ```
 */
export function addSentryBreadcrumb(
  message: string,
  category: string = 'custom',
  level: 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>,
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set custom tags for filtering errors in Sentry
 * Tags can be used for searching and grouping errors
 *
 * @param tags - Key-value pairs of tags
 *
 * @example
 * ```typescript
 * setSentryTags({
 *   feature: 'import',
 *   importType: 'morning-meetings',
 *   userLanguage: 'he'
 * });
 * ```
 */
export function setSentryTags(tags: Record<string, string>): void {
  Sentry.setTags(tags);
}

/**
 * Manually capture an exception with custom context
 * Use this when you catch an error but still want to report it to Sentry
 *
 * @param error - The error to capture
 * @param context - Additional context about the error
 *
 * @example
 * ```typescript
 * try {
 *   await dangerousOperation();
 * } catch (error) {
 *   captureError(error as Error, {
 *     operation: 'data-import',
 *     recoverable: true
 *   });
 *   // Handle error gracefully
 * }
 * ```
 */
export function captureError(error: Error, context?: Record<string, any>): void {
  Sentry.captureException(error, {
    level: 'error',
    extra: context,
  });
}

/**
 * Manually capture a message (for non-exception errors or important events)
 *
 * @param message - The message to capture
 * @param level - Severity level
 * @param context - Additional context
 *
 * @example
 * ```typescript
 * captureMessage('Import completed with warnings', 'warning', {
 *   warningCount: 5,
 *   importType: 'on-call'
 * });
 * ```
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>,
): void {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}
