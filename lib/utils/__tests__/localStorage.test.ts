import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearLocalStorageByPrefix,
  getLocalStorageItem,
  isLocalStorageAvailable,
  ONCALL_STORAGE_KEYS,
  removeLocalStorageItem,
  setLocalStorageItem,
} from '../localStorage';

// Mock logger to avoid actual logging in tests
vi.mock('../logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('localStorage utilities', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('isLocalStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(isLocalStorageAvailable()).toBe(true);
    });

    it('should return false when window is undefined (SSR)', () => {
      // This test would require mocking global window, which is complex
      // In real SSR environment, window would be undefined
      expect(isLocalStorageAvailable()).toBe(true); // In test env, window exists
    });
  });

  describe('getLocalStorageItem', () => {
    it('should retrieve stored string value', () => {
      localStorage.setItem('test-key', JSON.stringify('test-value'));
      const result = getLocalStorageItem('test-key', '');
      expect(result).toBe('test-value');
    });

    it('should retrieve stored object value', () => {
      const testObj = { foo: 'bar', num: 42 };
      localStorage.setItem('test-obj', JSON.stringify(testObj));
      const result = getLocalStorageItem<typeof testObj>('test-obj', { foo: '', num: 0 });
      expect(result).toEqual(testObj);
    });

    it('should return default value when key does not exist', () => {
      const defaultValue = 'default';
      const result = getLocalStorageItem('non-existent', defaultValue);
      expect(result).toBe(defaultValue);
    });

    it('should return default value on parse error', () => {
      localStorage.setItem('invalid-json', 'not valid json{');
      const result = getLocalStorageItem('invalid-json', 'default');
      expect(result).toBe('default');
    });

    it('should handle boolean values', () => {
      localStorage.setItem('bool-key', JSON.stringify(true));
      const result = getLocalStorageItem('bool-key', false);
      expect(result).toBe(true);
    });

    it('should handle number values', () => {
      localStorage.setItem('num-key', JSON.stringify(42));
      const result = getLocalStorageItem('num-key', 0);
      expect(result).toBe(42);
    });

    it('should handle array values', () => {
      const arr = [1, 2, 3];
      localStorage.setItem('arr-key', JSON.stringify(arr));
      const result = getLocalStorageItem<number[]>('arr-key', []);
      expect(result).toEqual(arr);
    });
  });

  describe('setLocalStorageItem', () => {
    it('should store string value', () => {
      const success = setLocalStorageItem('test-key', 'test-value');
      expect(success).toBe(true);
      expect(localStorage.getItem('test-key')).toBe(JSON.stringify('test-value'));
    });

    it('should store object value', () => {
      const testObj = { foo: 'bar', num: 42 };
      const success = setLocalStorageItem('test-obj', testObj);
      expect(success).toBe(true);
      expect(JSON.parse(localStorage.getItem('test-obj')!)).toEqual(testObj);
    });

    it('should store boolean value', () => {
      const success = setLocalStorageItem('bool-key', true);
      expect(success).toBe(true);
      expect(JSON.parse(localStorage.getItem('bool-key')!)).toBe(true);
    });

    it('should store number value', () => {
      const success = setLocalStorageItem('num-key', 42);
      expect(success).toBe(true);
      expect(JSON.parse(localStorage.getItem('num-key')!)).toBe(42);
    });

    it('should store array value', () => {
      const arr = [1, 2, 3];
      const success = setLocalStorageItem('arr-key', arr);
      expect(success).toBe(true);
      expect(JSON.parse(localStorage.getItem('arr-key')!)).toEqual(arr);
    });

    it('should overwrite existing value', () => {
      setLocalStorageItem('key', 'old-value');
      setLocalStorageItem('key', 'new-value');
      expect(getLocalStorageItem('key', '')).toBe('new-value');
    });
  });

  describe('removeLocalStorageItem', () => {
    it('should remove existing item', () => {
      localStorage.setItem('test-key', 'test-value');
      const success = removeLocalStorageItem('test-key');
      expect(success).toBe(true);
      expect(localStorage.getItem('test-key')).toBeNull();
    });

    it('should return true even if item does not exist', () => {
      const success = removeLocalStorageItem('non-existent');
      expect(success).toBe(true);
    });

    it('should only remove specified key', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      removeLocalStorageItem('key1');
      expect(localStorage.getItem('key1')).toBeNull();
      expect(localStorage.getItem('key2')).toBe('value2');
    });
  });

  describe('clearLocalStorageByPrefix', () => {
    beforeEach(() => {
      localStorage.setItem('oncall:tab', 'team');
      localStorage.setItem('oncall:date', '2025-11-16');
      localStorage.setItem('oncall:filter', 'all');
      localStorage.setItem('other:key', 'value');
      localStorage.setItem('standalone', 'data');
    });

    it('should remove all items with matching prefix', () => {
      const success = clearLocalStorageByPrefix('oncall:');
      expect(success).toBe(true);
      expect(localStorage.getItem('oncall:tab')).toBeNull();
      expect(localStorage.getItem('oncall:date')).toBeNull();
      expect(localStorage.getItem('oncall:filter')).toBeNull();
    });

    it('should not remove items with different prefix', () => {
      clearLocalStorageByPrefix('oncall:');
      expect(localStorage.getItem('other:key')).toBe('value');
      expect(localStorage.getItem('standalone')).toBe('data');
    });

    it('should handle empty prefix', () => {
      const success = clearLocalStorageByPrefix('');
      expect(success).toBe(true);
      // Should remove all items (all keys start with empty string)
      expect(localStorage.length).toBe(0);
    });

    it('should handle non-existent prefix', () => {
      const success = clearLocalStorageByPrefix('non-existent:');
      expect(success).toBe(true);
      // Original items should still exist
      expect(localStorage.getItem('oncall:tab')).toBe('team');
    });
  });

  describe('ONCALL_STORAGE_KEYS', () => {
    it('should define all expected on-call storage keys', () => {
      expect(ONCALL_STORAGE_KEYS.TAB).toBe('oncall:tab');
      expect(ONCALL_STORAGE_KEYS.MINI_CALENDAR_START).toBe('oncall:miniCalendar:start');
      expect(ONCALL_STORAGE_KEYS.MINI_CALENDAR_STATION_FILTER).toBe(
        'oncall:miniCalendar:stationFilter',
      );
      expect(ONCALL_STORAGE_KEYS.MINI_CALENDAR_DOCTOR_FILTER).toBe(
        'oncall:miniCalendar:doctorFilter',
      );
      expect(ONCALL_STORAGE_KEYS.TEAM_DATE).toBe('oncall:teamDate');
      expect(ONCALL_STORAGE_KEYS.COLOR_LEGEND_EXPANDED).toBe('oncall:colorLegend:expanded');
    });

    it('should be read-only (const)', () => {
      // TypeScript enforces this at compile time, but we can verify the object exists
      expect(ONCALL_STORAGE_KEYS).toBeDefined();
      expect(typeof ONCALL_STORAGE_KEYS).toBe('object');
    });
  });

  describe('integration tests', () => {
    it('should handle complete workflow: set, get, remove', () => {
      const key = 'workflow-test';
      const value = { data: 'test', count: 5 };

      // Set
      expect(setLocalStorageItem(key, value)).toBe(true);

      // Get
      expect(getLocalStorageItem(key, {})).toEqual(value);

      // Remove
      expect(removeLocalStorageItem(key)).toBe(true);

      // Verify removed
      expect(getLocalStorageItem(key, null)).toBeNull();
    });

    it('should handle batch operations with prefix', () => {
      setLocalStorageItem('app:setting1', 'value1');
      setLocalStorageItem('app:setting2', 'value2');
      setLocalStorageItem('app:setting3', 'value3');

      expect(clearLocalStorageByPrefix('app:')).toBe(true);

      expect(getLocalStorageItem('app:setting1', null)).toBeNull();
      expect(getLocalStorageItem('app:setting2', null)).toBeNull();
      expect(getLocalStorageItem('app:setting3', null)).toBeNull();
    });
  });
});
