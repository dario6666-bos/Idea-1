import test from 'node:test';
import assert from 'node:assert/strict';
import { FREE_TEMPLATES, fillTemplate, suggestedTemplateId, NAME_PLACEHOLDER } from '../js/templates.js';

const vars = { company: 'Acme', role: 'Designer', date: 'Sep 22, 2026', name: 'Sam Lee' };

test('there are exactly 3 free templates with unique ids', () => {
  assert.equal(FREE_TEMPLATES.length, 3);
  assert.equal(new Set(FREE_TEMPLATES.map((t) => t.id)).size, 3);
});

test('every template fills completely, with no leftover placeholders', () => {
  for (const t of FREE_TEMPLATES) {
    const text = fillTemplate(t, vars);
    assert.match(text, /^Subject: /);
    assert.ok(text.includes('Acme') && text.includes('Designer') && text.includes('Sam Lee'), t.id);
    assert.doesNotMatch(text, /\{(company|role|date|name)\}/, t.id);
  }
});

test('missing name falls back to a visible placeholder', () => {
  const text = fillTemplate(FREE_TEMPLATES[0], { ...vars, name: '  ' });
  assert.ok(text.includes(NAME_PLACEHOLDER));
});

test('values containing placeholders are not expanded twice', () => {
  const text = fillTemplate(FREE_TEMPLATES[1], { ...vars, company: '{role} Inc', role: 'Chef' });
  assert.ok(text.includes('Chef at {role} Inc'));
});

test('no guilt or pressure wording in templates', () => {
  const all = FREE_TEMPLATES.map((t) => t.subject + t.body).join(' ').toLowerCase();
  for (const word of ['still waiting', 'no response', 'ignored', 'overdue', 'late', 'urgent']) {
    assert.ok(!all.includes(word), word);
  }
});

test('interview cards suggest the thank-you template', () => {
  assert.equal(suggestedTemplateId({ status: 'Interview' }), 'thanks');
  assert.equal(suggestedTemplateId({ status: 'Applied' }), 'friendly');
});
