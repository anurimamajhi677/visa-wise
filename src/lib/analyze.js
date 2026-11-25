import { RULES } from './rules.js';

const DAY = 86_400_000;
const WEIGHT = { high: 3, medium: 2, low: 1 };
const VALUE = { pass: 1, warn: 0.5, fail: 0 };

// Dates are 'YYYY-MM-DD' strings, handled in UTC so they never shift with timezone.
export const toDate = (s) => (s ? new Date(s + 'T00:00:00Z') : null);
export const iso = (d) => d.toISOString().slice(0, 10);
export const addDays = (d, n) => new Date(d.getTime() + n * DAY);
export function addMonths(d, n) {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + n);
  return r;
}
const daysBetween = (a, b) => Math.round((b - a) / DAY);

// Documents the applicant ticks as "ready". Shown as the checklist.
export const DOCUMENTS = [
  { id: 'form', label: 'Visa application form, filled and signed', who: 'all', weight: 'high', source: 'eu' },
  { id: 'photo', label: 'Photo meeting ICAO standards (35×45 mm, plain light background, recent)', who: 'all', weight: 'medium', source: 'eu' },
  { id: 'insurance', label: `Travel medical insurance, at least €${RULES.insuranceMinEur.value.toLocaleString('en')} cover, valid in all Schengen countries for the whole trip`, who: 'all', weight: 'high', source: 'visaCode' },
  { id: 'flights', label: 'Return flight reservation', who: 'all', weight: 'high', source: 'eu' },
  { id: 'hotel', label: 'Accommodation proof for every night (hotel bookings or invitation)', who: 'all', weight: 'high', source: 'eu' },
  { id: 'itinerary', label: 'Day-by-day itinerary', who: 'all', weight: 'medium', source: 'vfs' },
  { id: 'cover', label: 'Cover letter explaining the trip', who: 'all', weight: 'medium', source: 'vfs' },
  { id: 'bank', label: `Bank statements for the last ${RULES.bankStatementMonths.value} months, stamped or signed by the bank`, who: 'all', weight: 'high', source: 'vfs' },
  { id: 'salary', label: `Salary slips for the last ${RULES.salarySlipMonths.value} months`, who: 'salaried', weight: 'high', source: 'vfs' },
  { id: 'leave', label: 'Leave approval / NOC from your employer', who: 'salaried', weight: 'high', source: 'vfs' },
  { id: 'business', label: 'Business proof (registration, GST certificate)', who: 'self', weight: 'high', source: 'vfs' },
  { id: 'itr', label: `Income tax returns (ITR) for the last ${RULES.itrYears.value} years`, who: 'salaried,self,retired', weight: 'medium', source: 'vfs' },
  { id: 'student', label: 'Letter from your school or college confirming enrolment and leave', who: 'student', weight: 'high', source: 'vfs' },
  { id: 'pension', label: 'Pension statements', who: 'retired', weight: 'high', source: 'vfs' },
  { id: 'sponsor', label: 'Sponsor’s letter, their bank statements and ID', who: 'student,unemployed', weight: 'high', source: 'vfs' },
];

export const docsFor = (employment) => DOCUMENTS.filter((d) => d.who === 'all' || d.who.split(',').includes(employment));

// ---------- Timeline ----------

export function timeline(input, today = new Date()) {
  const depart = toDate(input.departDate);
  if (!depart) return [];
  const now = toDate(iso(today));
  const items = [
    { id: 'earliest', date: addMonths(depart, -RULES.applyEarliestMonths.value), label: 'Earliest day you can apply', source: 'eu' },
    { id: 'book', date: addDays(depart, -RULES.bookAppointmentDays.value), label: 'Book your visa centre appointment by now', source: 'guideline' },
    { id: 'statements', date: addDays(depart, -RULES.bookAppointmentDays.value + 7), label: 'Get fresh bank statements and salary slips', source: 'guideline' },
    { id: 'latest', date: addDays(depart, -RULES.applyLatestDays.value), label: 'Last day to apply', source: 'eu' },
    { id: 'depart', date: depart, label: 'Trip starts', source: null },
  ];
  if (input.returnDate) items.push({ id: 'return', date: toDate(input.returnDate), label: 'Trip ends', source: null });
  return items
    .sort((a, b) => a.date - b.date)
    .map((i) => ({ ...i, date: iso(i.date), past: i.date < now, daysLeft: daysBetween(now, i.date) }));
}

// ---------- Checks ----------

export function checks(input, today = new Date()) {
  const out = [];
  const add = (c) => out.push(c);
  const now = toDate(iso(today));
  const depart = toDate(input.departDate);
  const ret = toDate(input.returnDate);
  const p = input.passport || {};

  // Trip dates
  if (depart && ret) {
    const days = daysBetween(depart, ret) + 1;
    add({
      id: 'stay', weight: 'high', label: 'Trip is within the 90-day limit', source: 'eu',
      status: ret < depart ? 'fail' : days <= RULES.maxStayDays.value ? 'pass' : 'fail',
      detail: ret < depart ? 'Your return date is before your departure date.' : `Your trip is ${days} days.`,
      fix: ret < depart ? 'Fix your trip dates.' : 'A tourist visa allows up to 90 days in any 180-day period. Shorten the trip or apply for a national long-stay visa.',
    });
  }

  // When to apply
  if (depart) {
    const until = daysBetween(now, depart);
    const earliest = addMonths(depart, -RULES.applyEarliestMonths.value);
    let status = 'pass', detail = `${until} days until your trip.`, fix = '';
    if (until < RULES.applyLatestDays.value) {
      status = 'fail';
      detail = `Only ${until} days until your trip. Applications must be lodged at least ${RULES.applyLatestDays.value} days before.`;
      fix = 'Move your trip later. Processing normally takes 15 days and can take up to 45.';
    } else if (now < earliest) {
      status = 'warn';
      detail = `Too early: you can apply from ${iso(earliest)} (${RULES.applyEarliestMonths.value} months before the trip).`;
      fix = 'Get your documents ready now and book an appointment for a date after the earliest apply day.';
    } else if (until < RULES.bookAppointmentDays.value) {
      status = 'warn';
      detail = `${until} days until your trip. Appointment slots in India can take weeks.`;
      fix = 'Book your visa centre appointment today and keep your flights refundable.';
    }
    add({ id: 'timing', weight: 'high', label: 'Enough time to apply', source: 'eu', status, detail, fix });
  }

  // Passport validity
  if (p.expires && ret) {
    const need = addMonths(ret, RULES.passportValidityMonths.value);
    const ok = toDate(p.expires) >= need;
    add({
      id: 'passportValid', weight: 'high', label: 'Passport valid long enough', source: 'eu',
      status: ok ? 'pass' : 'fail',
      detail: ok ? `Valid until ${p.expires}.` : `Your passport expires ${p.expires}; it must be valid until at least ${iso(need)} (3 months after you leave).`,
      fix: 'Renew your passport through Passport Seva before applying.',
    });
  }
  if (p.issued) {
    const limit = addMonths(now, -12 * RULES.passportMaxAgeYears.value);
    const ok = toDate(p.issued) >= limit;
    add({
      id: 'passportAge', weight: 'high', label: 'Passport issued within the last 10 years', source: 'visaCode',
      status: ok ? 'pass' : 'fail',
      detail: ok ? `Issued ${p.issued}.` : `Issued ${p.issued}, more than ${RULES.passportMaxAgeYears.value} years ago.`,
      fix: 'Renew your passport before applying.',
    });
  }
  if (p.blankPages != null && p.blankPages !== '') {
    const ok = Number(p.blankPages) >= RULES.passportBlankPages.value;
    add({
      id: 'passportPages', weight: 'high', label: 'At least 2 blank pages', source: 'visaCode',
      status: ok ? 'pass' : 'fail',
      detail: `${p.blankPages} blank page${Number(p.blankPages) === 1 ? '' : 's'}.`,
      fix: 'Renew your passport before applying so you have enough blank pages.',
    });
  }

  // Funds (guideline)
  if (input.balance != null && input.budget) {
    const ratio = input.balance / input.budget;
    add({
      id: 'funds', weight: 'high', label: 'Enough money for the trip', source: 'guideline',
      status: ratio >= RULES.fundsBuffer.value ? 'pass' : ratio >= 1 ? 'warn' : 'fail',
      detail: `Balance ₹${Math.round(input.balance).toLocaleString('en-IN')} vs trip budget ₹${Math.round(input.budget).toLocaleString('en-IN')} (${ratio.toFixed(1)}×).`,
      fix: 'Show a comfortable buffer over your trip cost, ideally 1.5× or more, built up over months. Avoid large sudden deposits just before applying; officers may ask where they came from. A sponsor letter can help.',
    });
  }

  // Travel history
  if (input.history) {
    const h = input.history;
    add({
      id: 'history', weight: 'medium', label: 'Travel history', source: 'guideline',
      status: h === 'schengen' || h === 'major' ? 'pass' : 'warn',
      detail: { schengen: 'You have held a Schengen visa before.', major: 'You have travelled to the US, UK, Canada, Australia or similar.', other: 'You have some international travel.', none: 'This is your first international trip.' }[h],
      fix: 'First-time travellers can still get a visa. Make your cover letter, itinerary and ties to India (job, family, property) very clear.',
    });
  }
  if (input.refused) {
    add({
      id: 'refused', weight: 'high', label: 'Previous visa refusal explained', source: 'guideline', status: 'warn',
      detail: 'You were refused a visa before.',
      fix: 'Declare the refusal honestly on the form. Fix the reason given in the refusal letter and mention what changed in your cover letter.',
    });
  }

  // Documents
  for (const d of docsFor(input.employment || 'salaried')) {
    const have = input.docs?.[d.id];
    add({
      id: 'doc-' + d.id, weight: d.weight, label: d.label, source: d.source, doc: true,
      status: have === 'yes' ? 'pass' : have === 'partly' ? 'warn' : have === 'no' ? 'fail' : 'unknown',
      detail: have === 'yes' ? 'Ready.' : have === 'partly' ? 'In progress.' : have === 'no' ? 'Not ready yet.' : 'Not answered.',
      fix: 'Prepare this document before your appointment.',
    });
  }
  return out;
}

// ---------- Put it together ----------

export function analyze(input, today = new Date()) {
  const list = checks(input, today);
  let got = 0, max = 0;
  for (const c of list) {
    if (c.status === 'unknown') continue;
    max += WEIGHT[c.weight];
    got += WEIGHT[c.weight] * VALUE[c.status];
  }
  const fixes = list
    .filter((c) => c.status === 'fail' || c.status === 'warn')
    .sort((a, b) => (Number(!!a.doc) - Number(!!b.doc)) || (WEIGHT[b.weight] - WEIGHT[a.weight]) || ((a.status === 'fail' ? 0 : 1) - (b.status === 'fail' ? 0 : 1)));
  const blockers = list.filter((c) => c.status === 'fail' && !c.doc);
  let readiness = max ? Math.round((got / max) * 100) : null;
  // A red flag (expired passport, too late, over 90 days) stops the application, whatever else is ready.
  if (blockers.length && readiness != null) readiness = Math.min(readiness, 40);
  return {
    readiness,
    blockers,
    fixes,
    checks: list,
    docs: list.filter((c) => c.doc),
    timeline: timeline(input, today),
    applyTo: input.destination || null,
    fee: RULES.feeAdultEur.value,
    checkedAt: new Date().toISOString(),
  };
}
