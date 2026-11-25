// Schengen short-stay (tourist) visa rules for applicants from India.
// Every rule carries its source. `verified` = read on the official page on
// `checked`. Unverified rules MUST be checked on the official source before launch.

export const SOURCES = {
  eu: {
    name: 'European Commission – Applying for a Schengen visa',
    url: 'https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy/applying-schengen-visa_en',
  },
  visaCode: {
    name: 'EU Visa Code – Regulation (EC) No 810/2009',
    url: 'https://eur-lex.europa.eu/eli/reg/2009/810/oj',
  },
  vfs: {
    name: 'Your destination’s visa centre checklist (VFS Global / BLS India)',
    url: 'https://visa.vfsglobal.com/ind/en',
  },
  guideline: { name: 'VisaWise guideline (not an official rule)', url: '' },
};

export const RULES = {
  passportValidityMonths: { value: 3, source: 'eu', verified: true, checked: '2026-11-25' }, // after leaving Schengen
  passportMaxAgeYears: { value: 10, source: 'visaCode', verified: false }, // Art. 12
  passportBlankPages: { value: 2, source: 'visaCode', verified: false }, // Art. 12
  applyEarliestMonths: { value: 6, source: 'eu', verified: true, checked: '2026-11-25' },
  applyLatestDays: { value: 15, source: 'eu', verified: true, checked: '2026-11-25' },
  maxStayDays: { value: 90, source: 'eu', verified: true, checked: '2026-11-25' }, // in any 180 days
  processingDays: { value: 15, max: 45, source: 'eu', verified: true, checked: '2026-11-25' },
  feeAdultEur: { value: 90, source: 'eu', verified: true, checked: '2026-11-25' },
  feeChildEur: { value: 45, ages: '6–12', source: 'eu', verified: true, checked: '2026-11-25' },
  insuranceMinEur: { value: 30000, source: 'visaCode', verified: false }, // Art. 15
  // Guidelines: common practice for Indian applicants, not law.
  bookAppointmentDays: { value: 60, source: 'guideline' }, // appointment slots in India can take weeks
  bankStatementMonths: { value: 3, source: 'vfs' },
  salarySlipMonths: { value: 3, source: 'vfs' },
  itrYears: { value: 2, source: 'vfs' },
  fundsBuffer: { value: 1.5, source: 'guideline' }, // balance vs trip budget
};

export const SCHENGEN_COUNTRIES = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Czechia', 'Denmark', 'Estonia', 'Finland', 'France',
  'Germany', 'Greece', 'Hungary', 'Iceland', 'Italy', 'Latvia', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Malta', 'Netherlands', 'Norway', 'Poland', 'Portugal', 'Romania', 'Slovakia',
  'Slovenia', 'Spain', 'Sweden', 'Switzerland',
];
