import {
  STATUSES, createApplication, isFollowUpDue, isOpen, withStatus, withFollowUpSent, sortApplications, daysSinceContact,
} from './core.js';
import { load, save } from './store.js';
import { FREE_TEMPLATES, fillTemplate, suggestedTemplateId } from './templates.js';
import { toISODate, formatDate, describeAgo } from './dates.js';

const $ = (id) => document.getElementById(id);

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of children) if (c != null) node.append(c);
  return node;
}

const loaded = load(window.localStorage);
let state = loaded.state;
let filter = 'All';
let toastTimer = null;

const today = () => toISODate();

function announce(message) {
  const live = $('live');
  live.textContent = '';
  // Small delay so screen readers notice repeated messages.
  setTimeout(() => { live.textContent = message; }, 30);
}

function persist() {
  const ok = save(window.localStorage, state);
  const notice = $('storage-notice');
  notice.hidden = ok;
  if (!ok) {
    notice.textContent = 'Your browser is blocking storage, so changes may be lost when you close this tab. ' +
      'Try turning off private browsing, or allow site data for this page.';
  }
  return ok;
}

function showToast(message, actionLabel, onAction) {
  const toast = $('toast');
  clearTimeout(toastTimer);
  toast.replaceChildren(el('span', { text: message }));
  if (actionLabel) {
    toast.append(el('button', {
      type: 'button', class: 'btn',
      onclick: () => { hideToast(); onAction(); },
      text: actionLabel,
    }));
  }
  toast.hidden = false;
  toastTimer = setTimeout(hideToast, 8000);
}

function hideToast() {
  clearTimeout(toastTimer);
  $('toast').hidden = true;
}

/* ---------- Rendering ---------- */

function renderFilters() {
  const box = $('filters');
  const options = ['All', ...STATUSES];
  box.replaceChildren(...options.map((name) => {
    const count = name === 'All' ? state.apps.length : state.apps.filter((a) => a.status === name).length;
    return el('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(filter === name),
      onclick: () => { filter = name; render(); },
      text: `${name} (${count})`,
    });
  }));
}

function renderCard(app, now) {
  const due = isFollowUpDue(app, now);
  const since = daysSinceContact(app, now);

  const select = el('select', {
    id: `status-${app.id}`,
    onchange: (e) => changeStatus(app.id, e.target.value),
  }, ...STATUSES.map((s) => el('option', { value: s, text: s, selected: s === app.status })));

  const top = el('div', { class: 'card-top' },
    el('div', {},
      el('h3', { text: app.company }),
      el('p', { class: 'card-role', text: app.role }),
    ),
    due ? el('span', { class: 'pill', text: 'Follow-up due' }) : null,
  );

  const metaText = isOpen(app)
    ? `Applied ${formatDate(app.dateApplied)} · last contact ${describeAgo(since)}`
    : `Applied ${formatDate(app.dateApplied)} · closed ${app.closedOn ? formatDate(app.closedOn) : ''}`.trim();

  const actions = el('div', { class: 'card-actions' },
    el('div', { class: 'status-field' },
      el('label', { for: `status-${app.id}`, text: 'Status' }),
      select,
    ),
    isOpen(app) ? el('button', {
      type: 'button', id: `fu-${app.id}`, class: due ? 'btn btn-primary' : 'btn',
      'aria-label': `Follow up with ${app.company}`,
      onclick: () => openFollowUp(app.id),
      text: 'Follow up',
    }) : null,
    el('button', {
      type: 'button', class: 'btn btn-quiet',
      'aria-label': `Remove ${app.company}, ${app.role}`,
      onclick: () => removeApplication(app.id),
      text: 'Remove',
    }),
  );

  return el('li', { class: 'card', 'data-closed': String(!isOpen(app)) },
    top, el('p', { class: 'card-meta', text: metaText }), actions);
}

function render() {
  const now = today();
  renderFilters();
  const visible = sortApplications(state.apps, now)
    .filter((a) => filter === 'All' || a.status === filter);

  $('app-list').replaceChildren(...visible.map((a) => renderCard(a, now)));

  const total = state.apps.length;
  $('list-count').textContent = total ? `${total} in total` : '';

  const empty = $('empty');
  empty.hidden = visible.length > 0;
  if (!visible.length) {
    empty.textContent = total
      ? `Nothing marked ${filter} right now.`
      : 'Nothing here yet. Add your first application whenever you’re ready.';
  }
}

/* ---------- Actions ---------- */

function changeStatus(id, status) {
  const now = today();
  state = { ...state, apps: state.apps.map((a) => (a.id === id ? withStatus(a, status, now) : a)) };
  persist();
  render();
  const app = state.apps.find((a) => a.id === id);
  announce(`${app.company} moved to ${status}.`);
  const select = $(`status-${id}`);
  if (select) select.focus();
}

function removeApplication(id) {
  const index = state.apps.findIndex((a) => a.id === id);
  if (index < 0) return;
  const removed = state.apps[index];
  state = { ...state, apps: state.apps.filter((a) => a.id !== id) };
  persist();
  render();
  showToast(`Removed ${removed.company}.`, 'Undo', () => {
    const apps = [...state.apps];
    apps.splice(Math.min(index, apps.length), 0, removed);
    state = { ...state, apps };
    persist();
    render();
    announce(`${removed.company} restored.`);
  });
}


/* ---------- Follow-up dialog ---------- */

const fu = {
  dialog: $('followup-dialog'),
  message: $('fu-message'),
  name: $('fu-name'),
  status: $('fu-status'),
  box: $('fu-templates'),
  appId: null,
  templateId: null,
  edited: false, // true once the user changes the message by hand
};

function currentFollowUpApp() {
  return state.apps.find((a) => a.id === fu.appId);
}

function fillMessage() {
  fu.edited = false;
  const app = currentFollowUpApp();
  const template = FREE_TEMPLATES.find((t) => t.id === fu.templateId);
  if (!app || !template) return;
  fu.message.value = fillTemplate(template, {
    company: app.company, role: app.role, date: formatDate(app.dateApplied), name: fu.name.value,
  });
}

function buildTemplateOptions() {
  fu.box.replaceChildren(...FREE_TEMPLATES.map((t) => {
    const input = el('input', {
      type: 'radio', name: 'fu-template', value: t.id, id: `tpl-${t.id}`,
      checked: t.id === fu.templateId,
      onchange: () => { fu.templateId = t.id; fillMessage(); fu.status.textContent = ''; },
    });
    return el('label', { class: 'template-option', for: `tpl-${t.id}` },
      input,
      el('span', { class: 't-label', text: t.label }),
      el('span', { class: 't-hint', text: t.hint }),
    );
  }));
}

function openFollowUp(id) {
  const app = state.apps.find((a) => a.id === id);
  if (!app) return;
  fu.appId = id;
  fu.templateId = suggestedTemplateId(app);
  fu.name.value = state.settings.name || '';
  fu.status.textContent = '';
  $('fu-sub').textContent = `${app.role} at ${app.company}`;
  buildTemplateOptions();
  fillMessage();
  fu.dialog.showModal();
}

function closeFollowUp() {
  if (fu.dialog.open) fu.dialog.close();
}

async function copyMessage() {
  const text = fu.message.value;
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    // Fallback for browsers without clipboard permission.
    fu.message.focus();
    fu.message.select();
    try { ok = document.execCommand('copy'); } catch { ok = false; }
  }
  fu.status.textContent = ok
    ? 'Copied. Paste it into your email or message.'
    : 'Couldn’t copy automatically. The text is selected, so press Ctrl+C (or Cmd+C).';
}

function saveName() {
  const name = fu.name.value.trim();
  if (name !== state.settings.name) {
    state = { ...state, settings: { ...state.settings, name } };
    persist();
  }
}

function markSent() {
  const app = currentFollowUpApp();
  if (!app) return;
  saveName();
  const now = today();
  state = { ...state, apps: state.apps.map((a) => (a.id === app.id ? withFollowUpSent(a, now) : a)) };
  persist();
  closeFollowUp();
  render();
  announce(`Marked as sent to ${app.company}. We’ll remind you again in a week.`);
  showToast(`Marked as sent to ${app.company}. Well done for reaching out.`);
  const btn = $(`fu-${app.id}`);
  if (btn) btn.focus();
}

function setupFollowUp() {
  $('fu-close').addEventListener('click', closeFollowUp);
  $('fu-copy').addEventListener('click', copyMessage);
  $('fu-sent').addEventListener('click', markSent);
  $('fu-form').addEventListener('submit', (e) => e.preventDefault());
  fu.message.addEventListener('input', () => { fu.edited = true; });
  // Typing a name updates the sign-off, unless the user already edited the text.
  fu.name.addEventListener('input', () => { if (!fu.edited) fillMessage(); });
  fu.name.addEventListener('change', saveName);
  fu.dialog.addEventListener('close', () => {
    const btn = fu.appId && $(`fu-${fu.appId}`);
    if (btn && document.activeElement === document.body) btn.focus();
  });
  // Click on the backdrop closes the dialog.
  fu.dialog.addEventListener('click', (e) => {
    if (e.target !== fu.dialog) return;
    const r = fu.dialog.getBoundingClientRect();
    const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (outside) closeFollowUp();
  });
}

/* ---------- Form ---------- */

const FIELDS = ['company', 'role', 'dateApplied'];

function showErrors(errors) {
  for (const name of FIELDS) {
    const input = $(name);
    const msg = $(`${name}-error`);
    const text = errors[name];
    msg.hidden = !text;
    msg.textContent = text || '';
    if (text) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
}

function setupForm() {
  const form = $('add-form');
  const dateInput = $('dateApplied');
  dateInput.value = today();
  dateInput.max = today();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const result = createApplication({
      company: $('company').value,
      role: $('role').value,
      dateApplied: dateInput.value,
    }, today());

    if (!result.ok) {
      showErrors(result.errors);
      const first = FIELDS.find((n) => result.errors[n]);
      $(first).focus();
      return;
    }
    showErrors({});
    state = { ...state, apps: [...state.apps, result.app] };
    persist();
    form.reset();
    dateInput.value = today();
    dateInput.max = today();
    filter = 'All';
    render();
    announce(`Added ${result.app.company}. Nicely done.`);
    $('company').focus();
  });
}

if (loaded.recovered) {
  const notice = $('storage-notice');
  notice.hidden = false;
  notice.textContent = 'We couldn’t read your saved data, so we started fresh. The old data was kept aside in your browser and was not deleted.';
}
if (!loaded.persisted) {
  const notice = $('storage-notice');
  notice.hidden = false;
  notice.textContent = 'Your browser is blocking storage, so changes may be lost when you close this tab. ' +
    'Try turning off private browsing, or allow site data for this page.';
}
setupForm();
setupFollowUp();
render();
// Refresh "due" badges if the tab stays open past midnight.
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
