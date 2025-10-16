// This is a placeholder test to assert our intent at a unit level.
// Full Firestore emulator security tests would run with @firebase/rules-unit-testing,
// but for smoke in this repo we just assert the helper names exist in rules text.
import fs from 'node:fs';
import path from 'node:path';

import { describe, it, expect } from 'vitest';

describe('Firestore rules gate helpers', () => {
  it('contain approved gating helpers and usage', () => {
    const rules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');
    expect(rules).toContain('function isAdminApproved()');
    expect(rules).toContain('function isTutorApproved()');
    expect(rules).toContain('isTutorOrAdminApproved()');
    expect(rules).toContain('allow create, update, delete: if isAdminApproved()');
  });
});
