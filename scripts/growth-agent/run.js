#!/usr/bin/env node
/**
 * MigrateAU Growth Agent runner.
 *
 * Modes:
 *   node run.js                      → read Firestore, produce report + drafts, write to admin_growth_drafts
 *   node run.js --dry-run            → same as above, but skip Firestore writes
 *   node run.js --metrics file.json  → read local metrics + feedback JSON (no Firestore)
 *
 * Env for the Firestore mode:
 *   FIREBASE_SERVICE_ACCOUNT   raw JSON string (matches scraper.yml pattern)
 */
const fs = require('fs');
const path = require('path');

const { analyze, buildDrafts, buildReport } = require('./analyze');

const OUTPUT_DIR = path.join(__dirname, 'output');

function parseArgs(argv) {
  const opts = { dryRun: false, metrics: null, date: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--metrics') opts.metrics = argv[++i];
    else if (a === '--date') opts.date = argv[++i];
    else if (a === '--help') opts.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return opts;
}

async function loadMetricsFromFirestore() {
  const admin = require('firebase-admin');
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var missing');
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
  const db = admin.firestore();

  // Rolling window: last 7 days.
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Published notifications last 7 days.
  let publishedNotifications7d = 0;
  try {
    const snap = await db
      .collection('notifications')
      .where('timestamp', '>=', since.toISOString())
      .get();
    publishedNotifications7d = snap.size;
  } catch (err) {
    console.warn('[growth-agent] published notifications count failed:', err.message);
  }

  // Weekly digest opt-in — count users where profile subcollection weeklyDigest = true.
  // Users collection shape varies; we count subscription docs instead.
  let weeklyDigestOptIn = 0;
  try {
    const snap = await db.collection('users').where('weeklyDigest', '==', true).get();
    weeklyDigestOptIn = snap.size;
  } catch (err) {
    console.warn('[growth-agent] weeklyDigest count failed:', err.message);
  }

  // Approximate MAU/DAU/installs from users collection if available.
  let mau = 0;
  let dau = 0;
  let installs = 0;
  try {
    const snap = await db.collection('users').get();
    installs = snap.size;
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    snap.forEach((doc) => {
      const data = doc.data();
      const last = data.lastActiveAt || data.updatedAt || data.createdAt;
      const ts = typeof last === 'string' ? new Date(last).getTime() : (last && last.toMillis ? last.toMillis() : 0);
      if (ts >= dayAgo) dau += 1;
      if (ts >= monthAgo) mau += 1;
    });
  } catch (err) {
    console.warn('[growth-agent] users count failed:', err.message);
  }

  // Feedback: read admin_feedback collection if it exists.
  let feedback = [];
  try {
    const snap = await db.collection('admin_feedback').orderBy('createdAt', 'desc').limit(50).get();
    feedback = snap.docs.map((d) => d.data());
  } catch (err) {
    console.warn('[growth-agent] feedback fetch failed:', err.message);
  }

  return {
    admin,
    db,
    metrics: {
      installs,
      mau,
      dau,
      storeVisitors: 0,       // filled by store integration later
      paidUsers: 0,           // filled by RevenueCat webhook later
      refunds: 0,             // ditto
      revenueAud: 0,          // ditto
      publishedNotifications7d,
      weeklyDigestOptIn,
    },
    feedback,
  };
}

async function persistDrafts(db, admin, runDate, drafts) {
  const batch = db.batch();
  const col = db.collection('admin_growth_drafts');
  drafts.forEach((draft, idx) => {
    const id = `${runDate}_${idx}`;
    batch.set(col.doc(id), {
      ...draft,
      runDate,
      createdAt: new Date().toISOString(),
      status: 'pending_approval',
    });
  });
  await batch.commit();
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log('Usage: node run.js [--dry-run] [--metrics local.json] [--date YYYY-MM-DD]');
    return;
  }
  const runDate = opts.date || new Date().toISOString().slice(0, 10);

  let metrics;
  let feedback;
  let admin;
  let db;

  if (opts.metrics) {
    const raw = JSON.parse(fs.readFileSync(opts.metrics, 'utf8'));
    metrics = raw.metrics || raw;
    feedback = raw.feedback || [];
  } else {
    const res = await loadMetricsFromFirestore();
    metrics = res.metrics;
    feedback = res.feedback;
    admin = res.admin;
    db = res.db;
  }

  const analysis = analyze(metrics, feedback);
  const drafts = buildDrafts(analysis, metrics);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, `${runDate}-report.md`), buildReport(runDate, metrics, analysis, drafts));
  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${runDate}-approval-queue.json`),
    `${JSON.stringify({ generatedAt: runDate, metrics, drafts }, null, 2)}\n`
  );

  if (db && !opts.dryRun) {
    try {
      await persistDrafts(db, admin, runDate, drafts);
      console.log(`[growth-agent] persisted ${drafts.length} drafts to admin_growth_drafts`);
    } catch (err) {
      console.error('[growth-agent] draft persist failed:', err.message);
      process.exitCode = 1;
    }
  } else {
    console.log('[growth-agent] dry run — skipped Firestore writes');
  }

  console.log(`[growth-agent] report written: growth-agent/output/${runDate}-report.md`);
  console.log(`[growth-agent] recommendations: ${analysis.recommendations.length}, drafts: ${drafts.length}`);
}

main().catch((err) => {
  console.error('growth-agent failed:', err);
  process.exit(1);
});
