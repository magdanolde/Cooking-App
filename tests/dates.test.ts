import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekStart, addDays, weekDays, weekLabel, dayLabel, isIsoDate, todayIso, fromIsoDate } from '../src/lib/dates';

test('weeks start on Monday', () => {
  assert.equal(weekStart(fromIsoDate('2026-11-22')), '2026-11-16'); // Sunday
  assert.equal(weekStart(fromIsoDate('2026-11-23')), '2026-11-23'); // Monday
  assert.equal(weekStart(fromIsoDate('2026-11-29')), '2026-11-23');
  assert.deepEqual(weekDays('2026-11-23').slice(-1), ['2026-11-29']);
  assert.equal(addDays('2026-12-28', 7), '2027-01-04');
});

test('labels', () => {
  assert.equal(weekLabel('2026-11-23'), '23 – 29 November');
  assert.equal(weekLabel('2026-11-30'), '30 November – 6 December');
  assert.deepEqual(dayLabel('2026-11-23'), { day: 'Monday', short: 'Mon', date: '23 Nov' });
});

test('date validation and time zones', () => {
  assert.equal(isIsoDate('2026-11-23'), true);
  assert.equal(isIsoDate('2026-02-30'), false);
  assert.equal(isIsoDate('23.11.2026'), false);
  // 23:30 UTC on Sunday is already Monday in Berlin
  assert.equal(todayIso('Europe/Berlin', new Date('2026-11-22T23:30:00Z')), '2026-11-23');
});
