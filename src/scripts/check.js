import { analyze, DOCUMENTS } from '../lib/analyze.js';
import { SOURCES, RULES } from '../lib/rules.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nice = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* blocked */ } },
};

function srcLink(key) {
  const s = SOURCES[key];
  if (!s) return '';
  return s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>` : esc(s.name);
}

// ---------- Form ----------
function read(form) {
  const f = new FormData(form);
  const num = (k) => (f.get(k) === '' || f.get(k) == null ? undefined : Math.max(0, Number(f.get(k))));
  const docs = {};
  for (const d of DOCUMENTS) { const v = f.get(`doc_${d.id}`); if (v) docs[d.id] = v; }
  return {
    destination: f.get('destination') || '',
    departDate: f.get('departDate') || '',
    returnDate: f.get('returnDate') || '',
    passport: { issued: f.get('issued') || '', expires: f.get('expires') || '', blankPages: f.get('blankPages') ?? '' },
    employment: f.get('employment') || 'salaried',
    history: f.get('history') || '',
    refused: f.get('refused') === 'on',
    balance: num('balance'),
    budget: num('budget'),
    docs,
  };
}

function fill(form, v) {
  if (!v) return;
  const set = (n, x) => { if (form.elements[n] && x != null) form.elements[n].value = x; };
  ['destination', 'departDate', 'returnDate', 'employment', 'history', 'balance', 'budget'].forEach((k) => set(k, v[k]));
  set('issued', v.passport?.issued); set('expires', v.passport?.expires); set('blankPages', v.passport?.blankPages);
  form.elements.refused.checked = !!v.refused;
  for (const [id, val] of Object.entries(v.docs || {})) {
    const el = form.querySelector(`input[name="doc_${CSS.escape(id)}"][value="${CSS.escape(val)}"]`);
    if (el) el.checked = true;
  }
}

function showDocsFor(form) {
  const e = form.elements.employment.value;
  form.querySelectorAll('.doc').forEach((el) => {
    const who = el.dataset.who.split(',');
    el.hidden = !(who.includes('all') || who.includes(e));
  });
}

// ---------- Results ----------
const tone = (p) => (p == null ? '' : p >= 80 ? '' : p >= 50 ? 'warn' : 'fail');
function verdict(r) {
  if (r.blockers.length) return 'Fix the red flags before you apply.';
  if (r.readiness >= 90) return 'Looks ready. Double-check your visa centre’s checklist.';
  if (r.readiness >= 70) return 'Nearly there. A few documents to finish.';
  return 'Keep going. Work through the list below.';
}

function render(input, r, prev) {
  const unverified = Object.values(RULES).some((x) => x.verified === false);
  let h = '';
  if (prev) {
    const d = (r.readiness ?? 0) - (prev.readiness ?? 0);
    h += `<div class="delta">Last check (${nice(prev.at.slice(0, 10))}): ${prev.readiness ?? '—'}% → now ${r.readiness ?? '—'}% ${d > 0 ? '🎉' : ''}</div>`;
  }

  h += `<div class="top">
    <div class="card score"><h3>Application readiness</h3>
      <div class="big">${r.readiness ?? '—'}%</div>
      <div class="bar ${tone(r.readiness)}"><i style="width:${r.readiness ?? 0}%"></i></div>
      <p>${verdict(r)}</p></div>
    <div class="card apply"><h3>Apply to</h3>
      <div class="country">${esc(r.applyTo || 'Choose a country')}</div>
      <p class="muted">${r.applyTo ? `${esc(r.applyTo)}’s consulate, through its visa centre in India.` : ''} Visa fee €${r.fee} for adults (€${RULES.feeChildEur.value} for children ${RULES.feeChildEur.ages}), plus a service fee.</p>
      <p class="src">Source: ${srcLink('eu')}</p></div>
  </div>`;

  if (r.blockers.length) {
    h += `<div class="alert"><h3>⚠️ ${r.blockers.length} red flag${r.blockers.length > 1 ? 's' : ''}</h3><ul>${r.blockers.map((b) => `<li><strong>${esc(b.label)}:</strong> ${esc(b.detail)}</li>`).join('')}</ul></div>`;
  }

  if (r.timeline.length) {
    const next = r.timeline.find((t) => !t.past);
    h += `<div class="card"><h2>Your timeline</h2><ul class="tl">${r.timeline.map((t) => `
      <li class="${t.past ? 'past' : ''} ${t === next ? 'next' : ''}">
        <span class="d">${nice(t.date)}</span>
        <span>${esc(t.label)}${t.source ? ` <span class="src">· ${t.source === 'guideline' ? 'guideline' : 'official'}</span>` : ''}</span>
        <span class="left">${t.past ? 'passed' : t.daysLeft === 0 ? 'today' : `in ${t.daysLeft} days`}</span>
      </li>`).join('')}</ul>
      <p class="note">Decisions normally take ${RULES.processingDays.value} days, up to ${RULES.processingDays.max} in some cases.</p></div>`;
  }

  const fixes = r.fixes.filter((c) => !c.doc);
  if (fixes.length) {
    h += `<div class="card"><h2>What to fix</h2><ol class="fix-list">${fixes.map((c) => `
      <li class="fix ${c.status}"><h4>${esc(c.label)} <span class="chip ${c.status}">${c.status === 'fail' ? 'Fix this' : 'Check'}</span></h4>
        <p class="muted">${esc(c.detail)}</p><p>👉 ${esc(c.fix)}</p><p class="src">Source: ${srcLink(c.source)}</p></li>`).join('')}</ol></div>`;
  }

  const ready = r.docs.filter((d) => d.status === 'pass').length;
  h += `<div class="card"><h2>Your document checklist <span class="muted" style="font-size:.9rem;font-weight:500">${ready} of ${r.docs.length} ready</span></h2>
    <ul class="checklist">${r.docs.map((d) => `<li><span class="box">${{ pass: '✅', warn: '🟡', fail: '⬜', unknown: '⬜' }[d.status]}</span>
      <span>${esc(d.label)} <span class="src">· ${srcLink(d.source)}</span></span></li>`).join('')}</ul>
    <p class="note">Consulates can ask for more documents. Always compare with the checklist on your visa centre’s website for ${esc(r.applyTo || 'your country')}.</p></div>`;

  h += `<div class="card"><h3>Save your progress</h3>
    <p class="muted">This browser remembers your answers. Come back as you finish documents and check again.</p>
    <div class="actions"><button class="btn" type="button" id="edit">Update my answers</button>
    <button class="btn secondary" type="button" id="print">Print / save checklist as PDF</button></div>
    ${unverified ? '<p class="note">Some rules are still being confirmed against the EU Visa Code. Treat this as a guide.</p>' : ''}</div>`;

  const box = $('#results');
  box.innerHTML = h;
  box.hidden = false;
  $('#edit').onclick = () => $('#visa-form').scrollIntoView({ behavior: 'smooth' });
  $('#print').onclick = () => window.print();
}

// ---------- Page ----------
export function initVisaCheck() {
  const form = $('#visa-form');
  fill(form, store.get('vr:last'));
  showDocsFor(form);
  form.elements.employment.addEventListener('change', () => showDocsFor(form));

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const err = $('#form-error');
    err.hidden = true;
    const input = read(form);
    const missing = [!input.destination && 'the country', !input.departDate && 'departure date', !input.returnDate && 'return date'].filter(Boolean);
    if (missing.length) { err.textContent = `Please add ${missing.join(', ')}.`; err.hidden = false; return; }

    const r = analyze(input);
    const hist = store.get('vr:hist') || [];
    const prev = hist.at(-1);
    hist.push({ at: r.checkedAt, readiness: r.readiness });
    store.set('vr:hist', hist.slice(-30));
    store.set('vr:last', input);
    render(input, r, prev);
    $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
