import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupEnv } from './helpers.js';

setupEnv();
const { mergeVariables } = await import('../src/engine/templateEngine.js');

test('plain, default, and nested-default placeholders', () => {
  const t = 'A={{A}} B={{B|dflt}} T={{TERMS|Net {{DAYS|30}}}} X={{X|see {{Y}} here}}';
  assert.equal(mergeVariables(t, { A: '1' }).text, 'A=1 B=dflt T=Net 30 X=see {{Y}} here');
  assert.deepEqual(mergeVariables(t, { A: '1' }).unresolved, ['Y']);
  assert.equal(mergeVariables(t, { A: '1', DAYS: '45' }).text.includes('Net 45'), true);
  assert.equal(mergeVariables(t, { A: '1', TERMS: 'COD' }).text.includes('T=COD'), true);
});

test('fill mode turns unresolved into a visible blank; supplied values are never re-expanded', () => {
  const r = mergeVariables('{{NAME}} / {{OTHER}}', { NAME: '{{OTHER}}' }, true);
  assert.equal(r.text, '{{OTHER}} / [OTHER: ________]');
  assert.deepEqual(r.unresolved, ['OTHER']);
});

test('malformed braces stay literal and do not hang', () => {
  assert.equal(mergeVariables('{{ nope }} {{lower}} {{A|open', {}).text, '{{ nope }} {{lower}} {{A|open');
});
