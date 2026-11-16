import './setup.js';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resetStorage } from './setup.js';
import { habitsApi, todayKey } from '../src/features/habits/habitsApi.js';

beforeEach(resetStorage);

test('todayKey có dạng yyyy-MM-dd theo giờ địa phương', () => {
  assert.equal(todayKey(new Date(2026, 10, 5)), '2026-11-05');
});

test('chưa đăng nhập: thói quen lưu cục bộ, cộng dồn và độc lập theo ngày', async () => {
  const d1 = await habitsApi.add({ waterMl: 250 }, '2026-11-16');
  assert.equal(d1.source, 'local');
  assert.equal(d1.waterMl, 250);
  const d2 = await habitsApi.add({ waterMl: 250, movementMinutes: 10 }, '2026-11-16');
  assert.deepEqual([d2.waterMl, d2.movementMinutes], [500, 10]);
  assert.equal((await habitsApi.getDay('2026-11-17')).waterMl, 0);
});

test('trừ quá mức không xuống dưới 0, cộng quá mức bị chặn ở tối đa', async () => {
  await habitsApi.add({ waterMl: 100 }, '2026-11-16');
  assert.equal((await habitsApi.add({ waterMl: -9999 }, '2026-11-16')).waterMl, 0);
  assert.equal((await habitsApi.add({ waterMl: 99999 }, '2026-11-16')).waterMl, 10000);
});

test('trả kèm mục tiêu mặc định 2000 ml và 30 phút', async () => {
  const d = await habitsApi.getDay('2026-11-16');
  assert.deepEqual([d.waterGoalMl, d.movementGoalMinutes], [2000, 30]);
});

test('có thêm thói quen giấc ngủ (mục tiêu 480 phút) và thiền (10 phút)', async () => {
  const d = await habitsApi.add({ sleepMinutes: 30, mindfulMinutes: 5 }, '2026-11-16');
  assert.deepEqual([d.sleepMinutes, d.mindfulMinutes], [30, 5]);
  assert.deepEqual([d.sleepGoalMinutes, d.mindfulGoalMinutes], [480, 10]);
  assert.equal((await habitsApi.add({ sleepMinutes: -999 }, '2026-11-16')).sleepMinutes, 0);
});

test('chuỗi thói quen chỉ có khi đăng nhập thật (chưa đăng nhập trả null)', async () => {
  assert.equal(await habitsApi.getStreak('2026-11-16'), null);
});
