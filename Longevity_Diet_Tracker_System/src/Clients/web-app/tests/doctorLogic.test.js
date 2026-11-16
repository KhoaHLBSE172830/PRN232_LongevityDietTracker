import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATUS, summarize, filterSessions, groupPatients, vnDateKey, shortId, canConfirm, canCancel, canGiveAdvice } from '../src/features/doctor/doctorLogic.js';

const NOW = new Date('2026-11-16T03:00:00Z'); // 10:00 sáng 16/11 giờ Việt Nam
const mk = (id, userId, iso, status) => ({ id, userId, scheduledAtUtc: iso, status, durationMinutes: 45 });
const SESSIONS = [
  mk('a', 'u1', '2026-11-16T07:00:00Z', STATUS.PENDING), // chiều nay
  mk('b', 'u1', '2026-11-18T02:00:00Z', STATUS.CONFIRMED),
  mk('c', 'u2', '2026-11-10T02:00:00Z', STATUS.COMPLETED),
  mk('d', 'u3', '2026-11-20T02:00:00Z', STATUS.CANCELLED),
  mk('e', 'u2', '2026-11-16T01:00:00Z', STATUS.CONFIRMED), // 08:00 sáng nay, đã qua
];

test('ngày theo giờ Việt Nam: 23:00 UTC đã sang ngày hôm sau', () => {
  assert.equal(vnDateKey('2026-11-15T23:00:00Z'), '2026-11-16');
  assert.equal(vnDateKey('2026-11-15T16:59:00Z'), '2026-11-15');
});

test('summarize đếm theo trạng thái, hội viên và lịch hôm nay', () => {
  const s = summarize(SESSIONS, NOW);
  assert.deepEqual([s.total, s.pending, s.confirmed, s.completed, s.cancelled], [5, 1, 2, 1, 1]);
  assert.equal(s.patients, 3);
  assert.equal(s.today, 2); // a và e (còn hiệu lực trong ngày)
  assert.deepEqual(s.upcoming.map((x) => x.id), ['a', 'b']); // chỉ lịch còn hiệu lực và chưa qua, theo giờ tăng dần
});

test('filterSessions lọc theo trạng thái và ngày, sắp xếp theo giờ', () => {
  assert.deepEqual(filterSessions(SESSIONS, STATUS.CONFIRMED).map((x) => x.id), ['e', 'b']);
  assert.deepEqual(filterSessions(SESSIONS, 'all', '2026-11-16').map((x) => x.id), ['e', 'a']);
  assert.equal(filterSessions(SESSIONS, 'all').length, 5);
  assert.deepEqual(filterSessions(null), []);
});

test('groupPatients gom theo hội viên, mới nhất trước, đếm buổi đang chờ', () => {
  const p = groupPatients(SESSIONS);
  assert.equal(p.length, 3);
  const u1 = p.find((x) => x.userId === 'u1');
  assert.deepEqual([u1.count, u1.active, u1.last.id], [2, 2, 'b']);
  const u3 = p.find((x) => x.userId === 'u3');
  assert.equal(u3.active, 0);
});

test('quyền thao tác theo trạng thái', () => {
  assert.equal(canConfirm({ status: STATUS.PENDING }), true);
  assert.equal(canConfirm({ status: STATUS.CONFIRMED }), false);
  assert.equal(canCancel({ status: STATUS.COMPLETED }), false);
  assert.equal(canGiveAdvice({ status: STATUS.CONFIRMED }), true);
  assert.equal(canGiveAdvice({ status: STATUS.CANCELLED }), false);
  assert.equal(shortId('12345678-aaaa'), 'Hội viên #12345678');
});
