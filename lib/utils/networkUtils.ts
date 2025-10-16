/**
 * Network utility functions for handling timeouts, retries, and degraded connections
 */

import { logRetry } from './logger';

export type NetworkOperationOptions = {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Number of retry attempts (default: 3) */
  retries?: number;
  /** Base delay for exponential backoff in ms (default: 150) */
  baseDelay?: number;
  /** Operation name for better error messages */
  operationName?: string;
};

/**
 * Wraps a promise with timeout and retry logic
 */
export async function withTimeoutAndRetry<T>(
  operation: () => Promise<T>,
  options: NetworkOperationOptions = {},
): Promise<T> {
  const {
    timeout = 30000, // 30 seconds
    retries = 3,
    baseDelay = 150,
    operationName = 'operation',
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Wrap the operation with a timeout
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`${operationName} timed out after ${timeout}ms`)),
            timeout,
          ),
        ),
      ]);

      return result;
    } catch (error) {
      lastError = error;

      // Don't retry on the last attempt
      if (attempt === retries - 1) {
        break;
      }

      // Exponential backoff: 150ms, 300ms, 600ms, etc.
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));

      logRetry(operationName, attempt + 1, retries);
    }
  }

  // All retries failed
  throw lastError instanceof Error
    ? new Error(`${operationName} failed after ${retries} attempts: ${lastError.message}`)
    : new Error(`${operationName} failed after ${retries} attempts`);
}

/**
 * Creates a timeout wrapper for a promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName = 'operation',
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
}

/**
 * Checks if an error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('fetch') ||
    message.includes('offline') ||
    error.name === 'NetworkError' ||
    error.name === 'TypeError' // Fetch API throws TypeError for network issues
  );
}

/**
 * Creates user-friendly error messages for network issues
 */
export function getNetworkErrorMessage(
  error: unknown,
  fallbackMessage = 'Network error occurred',
): string {
  if (!(error instanceof Error)) return fallbackMessage;

  if (error.message.includes('timeout')) {
    return 'The request timed out. Please check your connection and try again.';
  }

  if (error.message.includes('offline') || error.message.includes('network')) {
    return 'You appear to be offline. Please check your internet connection.';
  }

  if (error.message.includes('failed to fetch')) {
    return 'Unable to connect to the server. Please try again.';
  }

  return fallbackMessage;
}

/**
 * Delays execution (useful for testing and backoff)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
