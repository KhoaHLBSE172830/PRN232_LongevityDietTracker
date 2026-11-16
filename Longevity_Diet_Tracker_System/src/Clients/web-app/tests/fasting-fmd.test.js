import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FASTING_TYPES, typeLabel } from '../src/features/fasting/fastingApi.js';
import { kcalForDay, FIGMA_FMD_KCAL, DEFAULT_FMD_RULES } from '../src/features/fmd/fmdApi.js';

test('có đủ 5 chế độ nhịn ăn, 14:10 khớp enum backend (7)', () => {
  assert.deepEqual(FASTING_TYPES.map((t) => t.label).sort(), ['12:12', '14:10', '16:8', '18:6', '20:4']);
  assert.equal(FASTING_TYPES.find((t) => t.label === '14:10').value, 7);
  assert.equal(typeLabel(7), '14:10');
  assert.equal(typeLabel(999), 'Tùy chỉnh');
});

test('định mức kcal FMD theo Figma: 1100/780/760/760/780', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(kcalForDay), [1100, 780, 760, 760, 780]);
  assert.deepEqual(DEFAULT_FMD_RULES.map((r) => r.maxCalories), Object.values(FIGMA_FMD_KCAL));
});
