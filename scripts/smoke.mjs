import assert from 'node:assert';

const base = process.env.BASE_URL || 'http://localhost:3000';

async function j(path, init) {
  const res = await fetch(base + path, { ...init, headers: { ...(init?.headers||{}), 'cache-control': 'no-store' }});
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

function expectWrapper(obj, key='items') {
  assert.ok(obj && obj.data, 'Missing data wrapper');
  if (key) assert.ok(Array.isArray(obj.data[key]), `data.${key} should be array`);
}

(async () => {
  // taxonomy
  let r = await j('/api/sports');
  assert.ok(r.ok, `/api/sports failed: ${r.status}`);
  expectWrapper(r.body, 'items');

  r = await j('/api/bundles');
  assert.ok(r.ok, `/api/bundles failed: ${r.status}`);
  expectWrapper(r.body, 'items');

  r = await j('/api/fabrics/recommendations?type=jersey&sport=rugby');
  assert.ok(r.ok, `/api/fabrics/recommendations failed: ${r.status}`);
  expectWrapper(r.body, 'items');

  console.log('✅ Smoke API wrappers OK');
  process.exit(0);
})().catch((e) => {
  console.error('❌ Smoke failed:', e?.message || e);
  process.exit(1);
});
