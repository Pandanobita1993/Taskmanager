import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { matchesClientSearch } from '../src/lib/clientSearch.ts';
const qa = path.join(os.tmpdir(), 'anan-recurrence-qa');
const require = createRequire(path.join(qa, 'package.json'));
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
const React = require('react');
const { createRoot } = require('react-dom/client');
const { act } = React;
const h = React.createElement;
const output = path.join(qa, 'client-select-test.cjs');
require('esbuild').buildSync({ entryPoints: [fileURLToPath(new URL('../src/components/ClientSelect.tsx', import.meta.url))], outfile: output, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react/jsx-runtime'] });
const ClientSelect = require(output).default;
assert.ok(matchesClientSearch('Công ty Đại Phát 0012345', 'dai phat'));
assert.ok(matchesClientSearch('Công ty Đại Phát 0012345', 'PHAT 0012'));
assert.ok(matchesClientSearch('Công ty Đại Phát', '  ĐẠI   '));
assert.equal(matchesClientSearch('Công ty Đại Phát', 'khac'), false);
const changes = [];
function Harness({ disabled = false } = {}) {
  const [value, setValue] = React.useState('a');
  return h('form', {}, h('label', {}, 'Khách hàng *', h(ClientSelect, { required: true, value, disabled, onChange: e => { changes.push(e.target.value); setValue(e.target.value); } },
    h('option', {value: ''}, 'Chọn khách'),
    h('option', {value: 'a', 'data-search': '0012345'}, 'Công ty Đại Phát'),
    h('option', {value: 'b', 'data-search': '0098765'}, 'Công ty Bình Minh'))));
}
const root = createRoot(document.getElementById('root'));
await act(async () => root.render(h(Harness)));
const select = () => document.querySelector('select');
const input = () => document.querySelector('input');
async function search(text) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input(), text);
    input().dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
}
await search('binh');
assert.deepEqual([...select().options].filter(o => !o.hidden).map(o => o.value), ['', 'b']);
assert.equal(select().value, 'a', 'Searching must not silently change the selected customer');
assert.deepEqual(changes, []);
assert.equal(document.querySelector('label').control, select(), 'Original label must still name the select');
await search('987');
assert.equal(select().options.namedItem('b'), null);
assert.ok([...select().options].some(o => o.value === 'b' && !o.hidden));
await act(async () => { select().value = 'b'; select().dispatchEvent(new dom.window.Event('change', {bubbles: true})); });
assert.deepEqual(changes, ['b']); assert.equal(input().value, ''); assert.equal(select().value, 'b');
await search('khong co'); assert.ok(document.body.textContent.includes('Không tìm thấy')); assert.equal(select().value, 'b');
await act(async () => { input().dispatchEvent(new dom.window.KeyboardEvent('keydown', {key: 'Enter', bubbles: true, cancelable: true})); });
assert.equal(document.activeElement, select());
await search('');
await act(async () => { select().value = ''; select().dispatchEvent(new dom.window.Event('change', {bubbles: true})); });
assert.equal(select().checkValidity(), false, 'Required selection must still be enforced');
await act(async () => root.render(h(Harness, {disabled: true})));
assert.equal(select().disabled, true); assert.equal(input(), null);
await act(async () => root.unmount()); dom.window.close();
console.log('PASS: Vietnamese search, partial tax code, retained selection, no implicit change, label association, no matches, Enter focus, required and disabled states.');
