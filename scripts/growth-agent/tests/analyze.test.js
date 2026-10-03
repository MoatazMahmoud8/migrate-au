const test = require('node:test');
const assert = require('node:assert/strict');
const { analyze, buildDrafts, buildReport } = require('../analyze');

test('flags low store conversion as high priority', () => {
  const r = analyze({ storeVisitors: 1000, installs: 100 }, []);
  const hit = r.recommendations.find((x) => x.area === 'store-listing');
  assert.ok(hit, 'should recommend store-listing test');
  assert.equal(hit.priority, 'high');
});

test('flags low purchase conversion as high priority', () => {
  const r = analyze({ installs: 500, paidUsers: 5 }, []);
  const hit = r.recommendations.find((x) => x.area === 'monetization');
  assert.ok(hit);
  assert.equal(hit.priority, 'high');
});

test('flags weak DAU/MAU retention', () => {
  const r = analyze({ mau: 1000, dau: 50 }, []);
  const hit = r.recommendations.find((x) => x.area === 'retention');
  assert.ok(hit);
});

test('flags high refund rate', () => {
  const r = analyze({ paidUsers: 100, refunds: 15 }, []);
  const hit = r.recommendations.find((x) => x.area === 'offer-quality');
  assert.ok(hit);
  assert.equal(hit.priority, 'high');
});

test('flags zero notifications as high priority content-supply gap', () => {
  const r = analyze({ publishedNotifications7d: 0 }, []);
  const hit = r.recommendations.find((x) => x.area === 'content-supply');
  assert.ok(hit);
  assert.equal(hit.priority, 'high');
});

test('surfaces top feedback topic', () => {
  const r = analyze(
    { publishedNotifications7d: 5 },
    [{ topic: 'points calculator' }, { topic: 'points calculator' }, { topic: 'occupations' }]
  );
  assert.equal(r.topTopics[0][0], 'points calculator');
  const hit = r.recommendations.find((x) => x.area === 'user-feedback');
  assert.ok(hit);
});

test('buildDrafts returns 3 pending_approval drafts', () => {
  const analysis = analyze({ storeVisitors: 100, installs: 30, publishedNotifications7d: 5 }, []);
  const drafts = buildDrafts(analysis, { publishedNotifications7d: 5 });
  assert.equal(drafts.length, 3);
  for (const d of drafts) assert.equal(d.status, 'pending_approval');
});

test('buildReport contains report sections', () => {
  const metrics = { storeVisitors: 100, installs: 30, publishedNotifications7d: 5 };
  const analysis = analyze(metrics, []);
  const drafts = buildDrafts(analysis, metrics);
  const md = buildReport('2026-09-28', metrics, analysis, drafts);
  assert.match(md, /## Performance/);
  assert.match(md, /## Recommended experiments/);
  assert.match(md, /## Approval queue/);
  assert.match(md, /Nothing was published/);
});
