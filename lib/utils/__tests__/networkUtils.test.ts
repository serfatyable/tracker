import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  delay,
  getNetworkErrorMessage,
  isNetworkError,
  withTimeout,
  withTimeoutAndRetry,
} from '../networkUtils';

// Mock logger to avoid actual logging in tests
vi.mock('../logger', () => ({
  logRetry: vi.fn(),
}));

describe('networkUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('delay', () => {
    it('should delay execution by specified milliseconds', async () => {
      const promise = delay(1000);
      vi.advanceTimersByTime(1000);
      await promise;
      expect(true).toBe(true); // If we reach here, delay worked
    });

    it('should resolve after exact timeout', async () => {
      const promise = delay(500);
      vi.advanceTimersByTime(500);
      await promise;
      // Timer should have advanced
      expect(true).toBe(true);
    });
  });

  describe('isNetworkError', () => {
    it('should return true for network-related error messages', () => {
      expect(isNetworkError(new Error('Network request failed'))).toBe(true);
      expect(isNetworkError(new Error('Connection timeout'))).toBe(true);
      expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
      expect(isNetworkError(new Error('You are offline'))).toBe(true);
    });

    it('should return true for NetworkError type', () => {
      const error = new Error('Something went wrong');
      error.name = 'NetworkError';
      expect(isNetworkError(error)).toBe(true);
    });

    it('should return true for TypeError (fetch API)', () => {
      const error = new TypeError('Failed to fetch');
      expect(isNetworkError(error)).toBe(true);
    });

    it('should return false for non-network errors', () => {
      expect(isNetworkError(new Error('Invalid input'))).toBe(false);
      expect(isNetworkError(new Error('Validation failed'))).toBe(false);
    });

    it('should return false for non-Error objects', () => {
      expect(isNetworkError('string error')).toBe(false);
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
      expect(isNetworkError(123)).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isNetworkError(new Error('NETWORK ERROR'))).toBe(true);
      expect(isNetworkError(new Error('Connection TIMEOUT'))).toBe(true);
    });
  });

  describe('getNetworkErrorMessage', () => {
    it('should return timeout message for timeout errors', () => {
      const error = new Error('Operation timeout');
      const message = getNetworkErrorMessage(error);
      expect(message).toContain('timed out');
      expect(message).toContain('check your connection');
    });

    it('should return offline message for offline errors', () => {
      const error = new Error('User is offline');
      const message = getNetworkErrorMessage(error);
      expect(message).toContain('offline');
      expect(message).toContain('internet connection');
    });

    it('should return connection message for fetch errors', () => {
      const error = new Error('failed to fetch resource');
      const message = getNetworkErrorMessage(error);
      expect(message).toContain('Unable to connect');
      expect(message).toContain('server');
    });

    it('should return fallback for unknown errors', () => {
      const error = new Error('Unknown error');
      const message = getNetworkErrorMessage(error);
      expect(message).toBe('Network error occurred');
    });

    it('should return fallback for non-Error objects', () => {
      const message = getNetworkErrorMessage('string error');
      expect(message).toBe('Network error occurred');
    });

    it('should use custom fallback message', () => {
      const customFallback = 'Custom error message';
      const message = getNetworkErrorMessage(new Error('Unknown'), customFallback);
      expect(message).toBe(customFallback);
    });
  });

  describe('withTimeout', () => {
    it('should resolve if promise completes before timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 1000);
      expect(result).toBe('success');
    });

    it('should reject if promise exceeds timeout', async () => {
      const slowPromise = new Promise((resolve) => {
        setTimeout(() => resolve('too late'), 2000);
      });

      const timeoutPromise = withTimeout(slowPromise, 1000, 'test-operation');

      // Advance timers to trigger timeout
      vi.advanceTimersByTime(1000);

      await expect(timeoutPromise).rejects.toThrow('test-operation timed out after 1000ms');
    });

    it('should use default operation name', async () => {
      const slowPromise = new Promise((resolve) => {
        setTimeout(() => resolve('too late'), 2000);
      });

      const timeoutPromise = withTimeout(slowPromise, 1000);
      vi.advanceTimersByTime(1000);

      await expect(timeoutPromise).rejects.toThrow('operation timed out');
    });
  });

  describe('withTimeoutAndRetry', () => {
    it('should return result on first successful attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const result = await withTimeoutAndRetry(operation, { timeout: 1000, retries: 3 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValue('success');

      const promise = withTimeoutAndRetry(operation, {
        timeout: 1000,
        retries: 3,
        baseDelay: 100,
      });

      // Advance timers for delays between retries
      await vi.advanceTimersByTimeAsync(100); // First retry delay
      await vi.advanceTimersByTimeAsync(200); // Second retry delay (exponential backoff)

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw after all retries exhausted', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent failure'));

      const promise = withTimeoutAndRetry(operation, {
        timeout: 1000,
        retries: 3,
        baseDelay: 100,
        operationName: 'test-op',
      });

      // Advance timers for all retry delays
      await vi.advanceTimersByTimeAsync(100); // First retry
      await vi.advanceTimersByTimeAsync(200); // Second retry
      await vi.advanceTimersByTimeAsync(400); // Third retry (won't happen but advance anyway)

      await expect(promise).rejects.toThrow('test-op failed after 3 attempts');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff for retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failed'));
      const baseDelay = 100;

      const promise = withTimeoutAndRetry(operation, {
        timeout: 1000,
        retries: 3,
        baseDelay,
      });

      // First retry: baseDelay * 2^0 = 100ms
      await vi.advanceTimersByTimeAsync(100);
      expect(operation).toHaveBeenCalledTimes(2);

      // Second retry: baseDelay * 2^1 = 200ms
      await vi.advanceTimersByTimeAsync(200);
      expect(operation).toHaveBeenCalledTimes(3);

      await expect(promise).rejects.toThrow();
    });

    it('should timeout individual operations', async () => {
      const slowOperation = () =>
        new Promise((resolve) => {
          setTimeout(() => resolve('too slow'), 5000);
        });

      const promise = withTimeoutAndRetry(slowOperation, {
        timeout: 1000,
        retries: 2,
        baseDelay: 100,
        operationName: 'slow-op',
      });

      // Trigger timeout on first attempt
      vi.advanceTimersByTime(1000);
      await vi.advanceTimersByTimeAsync(0);

      // Advance for retry delay
      await vi.advanceTimersByTimeAsync(100);

      // Trigger timeout on second attempt
      vi.advanceTimersByTime(1000);
      await vi.advanceTimersByTimeAsync(0);

      await expect(promise).rejects.toThrow('slow-op failed after 2 attempts');
    });

    it('should use default options', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const result = await withTimeoutAndRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should preserve original error message in final error', async () => {
      const originalError = new Error('Original failure reason');
      const operation = vi.fn().mockRejectedValue(originalError);

      const promise = withTimeoutAndRetry(operation, {
        timeout: 1000,
        retries: 2,
        baseDelay: 50,
        operationName: 'my-operation',
      });

      await vi.advanceTimersByTimeAsync(50);
      await vi.advanceTimersByTimeAsync(100);

      await expect(promise).rejects.toThrow('my-operation failed after 2 attempts');
      await expect(promise).rejects.toThrow('Original failure reason');
    });
  });
});
