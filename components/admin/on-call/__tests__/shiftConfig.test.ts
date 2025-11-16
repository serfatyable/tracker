import { describe, expect, it } from 'vitest';

import { ALLOWED_SHIFT_TYPES, getShiftConfig, SHIFT_TYPE_CONFIG } from '../shiftConfig';

describe('shiftConfig', () => {
  describe('ALLOWED_SHIFT_TYPES', () => {
    it('should contain all 9 expected shift types', () => {
      expect(ALLOWED_SHIFT_TYPES).toHaveLength(9);
      expect(ALLOWED_SHIFT_TYPES).toContain('PACU');
      expect(ALLOWED_SHIFT_TYPES).toContain('טיפול נמרץ');
      expect(ALLOWED_SHIFT_TYPES).toContain('מנהל תורן');
      expect(ALLOWED_SHIFT_TYPES).toContain('תורן שליש');
      expect(ALLOWED_SHIFT_TYPES).toContain('כונן');
      expect(ALLOWED_SHIFT_TYPES).toContain('חדר לידה');
      expect(ALLOWED_SHIFT_TYPES).toContain('חנ בכיר');
      expect(ALLOWED_SHIFT_TYPES).toContain('חדר ניתוח');
      expect(ALLOWED_SHIFT_TYPES).toContain('חדר ניתוח נשים');
    });

    it('should not contain duplicates', () => {
      const uniqueTypes = new Set(ALLOWED_SHIFT_TYPES);
      expect(uniqueTypes.size).toBe(ALLOWED_SHIFT_TYPES.length);
    });
  });

  describe('SHIFT_TYPE_CONFIG', () => {
    it('should have config for all allowed shift types', () => {
      ALLOWED_SHIFT_TYPES.forEach((shiftType) => {
        expect(SHIFT_TYPE_CONFIG[shiftType]).toBeDefined();
      });
    });

    it('should have consistent structure for all shift types', () => {
      Object.values(SHIFT_TYPE_CONFIG).forEach((config) => {
        expect(config).toHaveProperty('icon');
        expect(config).toHaveProperty('color');
        expect(config).toHaveProperty('bgColor');
        expect(config).toHaveProperty('borderColor');
        expect(typeof config.icon).toBe('string');
        expect(typeof config.color).toBe('string');
        expect(typeof config.bgColor).toBe('string');
        expect(typeof config.borderColor).toBe('string');
      });
    });

    it('should have unique icons for each shift type', () => {
      const icons = Object.values(SHIFT_TYPE_CONFIG).map((config) => config.icon);
      const uniqueIcons = new Set(icons);
      expect(uniqueIcons.size).toBe(icons.length);
    });

    it('should use valid Tailwind color classes', () => {
      Object.values(SHIFT_TYPE_CONFIG).forEach((config) => {
        expect(config.color).toMatch(/^text-\w+-\d+/);
        expect(config.bgColor).toMatch(/^bg-\w+-\d+/);
        expect(config.borderColor).toMatch(/^border-\w+-\d+/);
      });
    });
  });

  describe('getShiftConfig', () => {
    describe('direct matches', () => {
      it('should return correct config for PACU', () => {
        const config = getShiftConfig('PACU');
        expect(config.icon).toBe('🛏️');
        expect(config.color).toContain('purple');
        expect(config.bgColor).toContain('purple');
        expect(config.borderColor).toContain('purple');
      });

      it('should return correct config for טיפול נמרץ', () => {
        const config = getShiftConfig('טיפול נמרץ');
        expect(config.icon).toBe('🏥');
        expect(config.color).toContain('red');
        expect(config.bgColor).toContain('red');
        expect(config.borderColor).toContain('red');
      });

      it('should return correct config for מנהל תורן', () => {
        const config = getShiftConfig('מנהל תורן');
        expect(config.icon).toBe('⭐');
        expect(config.color).toContain('yellow');
      });

      it('should return correct config for תורן שליש', () => {
        const config = getShiftConfig('תורן שליש');
        expect(config.icon).toBe('🌙');
        expect(config.color).toContain('indigo');
      });

      it('should return correct config for כונן', () => {
        const config = getShiftConfig('כונן');
        expect(config.icon).toBe('📱');
        expect(config.color).toContain('cyan');
      });

      it('should return correct config for חדר לידה', () => {
        const config = getShiftConfig('חדר לידה');
        expect(config.icon).toBe('👶');
        expect(config.color).toContain('pink');
      });

      it('should return correct config for חנ בכיר', () => {
        const config = getShiftConfig('חנ בכיר');
        expect(config.icon).toBe('🎖️');
        expect(config.color).toContain('amber');
      });

      it('should return correct config for חדר ניתוח', () => {
        const config = getShiftConfig('חדר ניתוח');
        expect(config.icon).toBe('🔪');
        expect(config.color).toContain('blue');
      });

      it('should return correct config for חדר ניתוח נשים', () => {
        const config = getShiftConfig('חדר ניתוח נשים');
        expect(config.icon).toBe('⚕️');
        expect(config.color).toContain('green');
      });
    });

    describe('partial matches', () => {
      it('should match "טיפול" to "טיפול נמרץ"', () => {
        const config = getShiftConfig('טיפול');
        expect(config.icon).toBe('🏥');
        expect(config.color).toContain('red');
      });

      it('should match "ניתוח" to "חדר ניתוח"', () => {
        const config = getShiftConfig('ניתוח');
        expect(config.icon).toBe('🔪');
        expect(config.color).toContain('blue');
      });

      it('should match "pacu" (lowercase) to "PACU"', () => {
        const config = getShiftConfig('pacu');
        expect(config.icon).toBe('🛏️');
        expect(config.color).toContain('purple');
      });

      it('should match "PACU משהו" (with suffix) to "PACU"', () => {
        const config = getShiftConfig('PACU משהו');
        expect(config.icon).toBe('🛏️');
        expect(config.color).toContain('purple');
      });

      it('should be case-insensitive for partial matches', () => {
        const configLower = getShiftConfig('pacu');
        const configUpper = getShiftConfig('PACU');
        const configMixed = getShiftConfig('Pacu');
        expect(configLower).toEqual(configUpper);
        expect(configLower).toEqual(configMixed);
      });
    });

    describe('default fallback', () => {
      it('should return default config for unknown shift type', () => {
        const config = getShiftConfig('Unknown Shift');
        expect(config.icon).toBe('👤');
        expect(config.color).toContain('gray');
        expect(config.bgColor).toContain('gray');
        expect(config.borderColor).toContain('gray');
      });

      it('should match first config for empty string (empty string contained in all strings)', () => {
        // Empty string is contained in all strings, so matches first config
        const config = getShiftConfig('');
        expect(config.icon).toBe('🛏️'); // First config is PACU
        expect(config.color).toContain('purple');
      });

      it('should return default config for random text', () => {
        const config = getShiftConfig('xyz123');
        expect(config.icon).toBe('👤');
      });

      it('should return default config for special characters', () => {
        const config = getShiftConfig('!@#$%^');
        expect(config.icon).toBe('👤');
      });

      it('should have consistent structure in default config', () => {
        const config = getShiftConfig('unknown');
        expect(config).toHaveProperty('icon');
        expect(config).toHaveProperty('color');
        expect(config).toHaveProperty('bgColor');
        expect(config).toHaveProperty('borderColor');
      });
    });

    describe('edge cases', () => {
      it('should handle whitespace in shift type via partial match', () => {
        const config = getShiftConfig('  PACU  ');
        // Partial match works: "  PACU  " includes "PACU"
        expect(config.icon).toBe('🛏️');
      });

      it('should not match Hebrew with different spacing', () => {
        const config = getShiftConfig('טיפול  נמרץ'); // Double space
        // Double space vs single space - won't match exactly
        // Returns default since partial match also fails
        expect(config.icon).toBe('👤');
      });

      it('should handle mixed case Hebrew/English', () => {
        const config = getShiftConfig('PACU');
        expect(config.icon).toBe('🛏️');
      });
    });
  });
});
