#!/usr/bin/env node
/**
 * send-test-notification.js
 *
 * Manual test harness for MigrateAU notifications.
 *
 *   node send-test-notification.js --feed                 # writes 1 doc to Firestore (in-app feed)
 *   node send-test-notification.js --push                 # sends FCM push to a topic
 *   node send-test-notification.js --feed --push          # both
 *
 * Options:
 *   --topic=<name>    FCM topic for --push  (default: au_migration)
 *   --state=<CODE>    Tag notification with state, e.g. NSW (also picks state_NSW topic)
 *   --title="..."     Override title
 *   --body="..."      Override body
 *   --url="..."       Optional deep-link / web URL stored on the doc
 *   --route="/path"   In-app route to open on tap (data payload)
 *   --category=<cat>  Category icon key (default: update)
 *
 * Auth:
 *   Uses Application Default Credentials. Run once:
 *     gcloud auth application-default login
 *     gcloud config set project swift-shore-238707
 *   OR set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON.
 */

const admin = require('firebase-admin');

// ─── Parse args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));
const opts = Object.fromEntries(
  args
    .filter(a => a.includes('='))
    .map(a => {
      const [k, ...v] = a.replace(/^--/, '').split('=');
      return [k, v.join('=')];
    }),
);

const doFeed = flags.has('--feed');
const doPush = flags.has('--push');

if (!doFeed && !doPush) {
  console.error('Specify --feed and/or --push. See header for usage.');
  process.exit(1);
}

const state = opts.state || null;
const topic = opts.topic || (state ? `state_${state}` : 'au_migration');
const title = opts.title || `[TEST] ${state ? state + ' ' : ''}Migration update`;
const body =
  opts.body ||
  'This is a test notification from send-test-notification.js. If you can see it, the pipeline works.';
const url = opts.url || '';
const route = opts.route || '/(tabs)/notifications';
const category = opts.category || 'update';

// ─── Init Admin ──────────────────────────────────────────────────────────────
admin.initializeApp({
  projectId: process.env.GCLOUD_PROJECT || 'swift-shore-238707',
});

const db = admin.firestore();
const messaging = admin.messaging();

// ─── Run ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    if (doFeed) {
      const doc = {
        title,
        body,
        url,
        category,
        topic,
        state: state || null,
        timestamp: new Date().toISOString(),
        read: false,
      };
      const ref = await db.collection('notifications').add(doc);
      console.log(`✅ Feed doc written → notifications/${ref.id}`);
      console.log('   ', JSON.stringify(doc));
    }

    if (doPush) {
      const message = {
        topic,
        notification: { title, body },
        data: {
          route,
          category,
          ...(url ? { url } : {}),
          ...(state ? { state } : {}),
        },
        android: { priority: 'high' },
        apns: {
          payload: { aps: { sound: 'default', 'content-available': 1 } },
        },
      };
      const id = await messaging.send(message);
      console.log(`✅ Push sent to topic "${topic}" → messageId=${id}`);
      console.log(
        '   Device must be subscribed (initNotifications runs on app start).',
      );
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err.message || err);
    if (err.errorInfo) console.error('   ', err.errorInfo);
    process.exit(1);
  }
})();
