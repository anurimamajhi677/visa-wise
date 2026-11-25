import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, checks, timeline, docsFor } from '../src/lib/analyze.js';

const today = new Date('2026-11-25T10:00:00Z');
const base = {
  destination: 'France', departDate: '2027-03-10', returnDate: '2027-03-20',
  passport: { issued: '2020-01-15', expires: '2030-01-14', blankPages: 6 },
  employment: 'salaried', balance: 300000, budget: 150000, history: 'major',
};
const get = (list, id) => list.find((c) => c.id === id);

test('good trip passes the hard rules', () => {
  const c = checks(base, today);
  for (const id of ['stay', 'timing', 'passportValid', 'passportAge', 'passportPages', 'funds', 'history']) {
    assert.equal(get(c, id).status, 'pass', id);
  }
});

test('passport must last 3 months after return', () => {
  const c = checks({ ...base, passport: { ...base.passport, expires: '2027-05-01' } }, today);
  assert.equal(get(c, 'passportValid').status, 'fail');
  assert.match(get(c, 'passportValid').detail, /2027-06-20/);
});

test('passport older than 10 years and too few pages fail', () => {
  const c = checks({ ...base, passport: { issued: '2015-06-01', expires: '2030-01-01', blankPages: 1 } }, today);
  assert.equal(get(c, 'passportAge').status, 'fail');
  assert.equal(get(c, 'passportPages').status, 'fail');
});

test('timing: too late, too early, tight', () => {
  assert.equal(get(checks({ ...base, departDate: '2026-12-01', returnDate: '2026-12-05' }, today), 'timing').status, 'fail');
  assert.equal(get(checks({ ...base, departDate: '2027-07-01', returnDate: '2027-07-10' }, today), 'timing').status, 'warn');
  assert.equal(get(checks({ ...base, departDate: '2027-01-05', returnDate: '2027-01-12' }, today), 'timing').status, 'warn');
});

test('stay over 90 days fails', () => {
  assert.equal(get(checks({ ...base, returnDate: '2027-06-20' }, today), 'stay').status, 'fail');
});

test('funds ratio bands', () => {
  assert.equal(get(checks({ ...base, balance: 160000 }, today), 'funds').status, 'warn');
  assert.equal(get(checks({ ...base, balance: 100000 }, today), 'funds').status, 'fail');
});

test('documents depend on employment', () => {
  const ids = (e) => docsFor(e).map((d) => d.id);
  assert.ok(ids('salaried').includes('leave'));
  assert.ok(!ids('student').includes('leave'));
  assert.ok(ids('student').includes('sponsor'));
  assert.ok(ids('self').includes('business'));
});

test('timeline dates count back from departure', () => {
  const t = timeline(base, today);
  const d = Object.fromEntries(t.map((i) => [i.id, i.date]));
  assert.equal(d.earliest, '2026-09-10');
  assert.equal(d.latest, '2027-02-23');
  assert.equal(d.book, '2027-01-09');
});

test('readiness rises with documents ready, blockers listed first', () => {
  const none = analyze({ ...base, docs: {} }, today);
  const all = analyze({ ...base, docs: Object.fromEntries(docsFor('salaried').map((x) => [x.id, 'yes'])) }, today);
  assert.equal(all.readiness, 100);
  const bad = analyze({ ...base, passport: { ...base.passport, blankPages: 0 }, docs: { form: 'no' } }, today);
  assert.ok(bad.readiness < all.readiness);
  assert.equal(bad.fixes[0].id, 'passportPages');
  assert.ok(bad.readiness <= 40, 'a red flag caps readiness at 40%');
  assert.equal(none.docs.every((x) => x.status === 'unknown'), true);
});
