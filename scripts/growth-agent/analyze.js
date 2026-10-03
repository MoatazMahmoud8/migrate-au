#!/usr/bin/env node
/**
 * MigrateAU Growth Agent — pure logic module.
 *
 * Reads pre-computed metrics (installs, MAU, DAU, published notifications,
 * paid conversion, refunds, feedback topics) and produces:
 *   1. A prioritised list of growth recommendations.
 *   2. A queue of `pending_approval` drafts (social copy, store copy) that
 *      an admin has to explicitly approve before anything reaches users.
 *
 * The module never publishes anything and never spends money. It is designed
 * to be safe to run on a GitHub Actions cron.
 */

function rate(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0;
}

function percent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function analyze(metrics = {}, feedback = []) {
  const storeConversion = rate(metrics.installs || 0, metrics.storeVisitors || 0);
  const purchaseConversion = rate(metrics.paidUsers || 0, metrics.installs || 0);
  const refundRate = rate(metrics.refunds || 0, metrics.paidUsers || 0);
  const notificationsPerWeek = metrics.publishedNotifications7d || 0;
  const digestOptInRate = rate(metrics.weeklyDigestOptIn || 0, metrics.installs || 1);
  const recommendations = [];

  if ((metrics.storeVisitors || 0) > 0 && storeConversion < 0.25) {
    recommendations.push({
      priority: 'high',
      area: 'store-listing',
      action: 'Test benefit-led first 3 screenshots (points calculator preview + Alerts feed + Sources trust screen) against current listing.',
      successMetric: 'Store visitor → install conversion',
    });
  }

  if ((metrics.installs || 0) > 0 && purchaseConversion < 0.03) {
    recommendations.push({
      priority: 'high',
      area: 'monetization',
      action: 'Trigger a paywall preview after the first successful points calculation (the highest-intent moment).',
      successMetric: 'Install → paid conversion',
    });
  }

  if ((metrics.mau || 0) > 0 && rate(metrics.dau || 0, metrics.mau || 0) < 0.15) {
    recommendations.push({
      priority: 'medium',
      area: 'retention',
      action: 'Promote the Today home behind the newNavigation flag and enable Weekly Digest opt-in on first launch.',
      successMetric: 'DAU/MAU ratio',
    });
  }

  if ((metrics.paidUsers || 0) > 0 && refundRate > 0.08) {
    recommendations.push({
      priority: 'high',
      area: 'offer-quality',
      action: 'Add a "what Premium unlocks" list on the paywall (state alerts, unlimited Aria, PDF exports) before checkout.',
      successMetric: 'Refund rate',
    });
  }

  if (notificationsPerWeek === 0) {
    recommendations.push({
      priority: 'high',
      area: 'content-supply',
      action: 'Investigate scraper health — zero official notifications approved in the last 7 days. Check /admin/content pending queue and scraper.yml runs.',
      successMetric: 'Approved notifications / week',
    });
  } else if (notificationsPerWeek < 3) {
    recommendations.push({
      priority: 'medium',
      area: 'content-supply',
      action: 'Add more official state gov nomination pages to the allowlist so Alerts inbox has 3+ items per week.',
      successMetric: 'Approved notifications / week',
    });
  }

  if (digestOptInRate < 0.10 && (metrics.installs || 0) > 100) {
    recommendations.push({
      priority: 'medium',
      area: 'retention',
      action: 'Surface the Weekly Digest opt-in earlier — in onboarding step 3 with the benefit "one summary email per week, no spam".',
      successMetric: 'Weekly digest opt-in rate',
    });
  }

  // Top feedback topics
  const topicCounts = (Array.isArray(feedback) ? feedback : []).reduce((counts, item) => {
    const topic = (item && item.topic) || 'uncategorized';
    counts[topic] = (counts[topic] || 0) + 1;
    return counts;
  }, {});
  const topTopics = Object.entries(topicCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);

  if (topTopics.length > 0) {
    recommendations.push({
      priority: 'medium',
      area: 'user-feedback',
      action: `Address the most reported topic: ${topTopics[0][0]} (${topTopics[0][1]} reports).`,
      successMetric: 'Repeated feedback reports',
    });
  }

  return { storeConversion, purchaseConversion, refundRate, notificationsPerWeek, digestOptInRate, recommendations, topTopics };
}

function buildDrafts(analysis, metrics = {}) {
  const focus = analysis.topTopics?.[0]?.[0] || 'points calculator';
  const drafts = [];

  drafts.push({
    channel: 'social',
    status: 'pending_approval',
    title: `Points-check challenge (${focus})`,
    body: `Quick 2-minute points check for Australian PR: age, English, work, state bonuses — all in one screen. Free in MigrateAU.`,
    successMetric: 'Store visitor → install conversion',
  });

  if ((metrics.publishedNotifications7d || 0) > 0) {
    drafts.push({
      channel: 'store-experiment',
      status: 'pending_approval',
      title: 'Benefit-led promotional text',
      body: 'Track every official Australian migration update: SkillSelect rounds, state nominations, visa fees and processing times. Curated from Home Affairs and 8 state programs.',
      successMetric: 'Store visitor → install conversion',
    });
  }

  drafts.push({
    channel: 'in-app-message',
    status: 'pending_approval',
    title: 'Weekly digest invitation',
    body: 'Get one summary push per week with the top official migration changes. Tap Profile → Weekly digest to opt in.',
    successMetric: 'Weekly digest opt-in rate',
  });

  return drafts;
}

function buildReport(runDate, metrics, analysis, drafts) {
  const storeConversion = (metrics.storeVisitors || 0) > 0 ? percent(analysis.storeConversion) : 'Not provided';
  const purchaseConversion = (metrics.installs || 0) > 0 ? percent(analysis.purchaseConversion) : 'Not provided';
  const dauMau = (metrics.mau || 0) > 0 ? percent(rate(metrics.dau || 0, metrics.mau || 0)) : 'Not provided';
  const refundRate = (metrics.paidUsers || 0) > 0 ? percent(analysis.refundRate) : 'Not provided';
  const revenue = Number.isFinite(metrics.revenueAud) ? `AUD ${metrics.revenueAud.toFixed(2)}` : 'Not provided';
  const notifs = `${analysis.notificationsPerWeek} approved / last 7 days`;
  const digest = (metrics.installs || 0) > 0 ? percent(analysis.digestOptInRate) : 'Not provided';

  const lines = [
    `# MigrateAU Growth Agent Report — ${runDate}`,
    '',
    '## Performance',
    '',
    `- Store conversion: ${storeConversion}`,
    `- Purchase conversion: ${purchaseConversion}`,
    `- DAU / MAU: ${dauMau}`,
    `- Refund rate: ${refundRate}`,
    `- Revenue: ${revenue}`,
    `- Approved notifications: ${notifs}`,
    `- Weekly digest opt-in: ${digest}`,
    '',
    '## Recommended experiments',
    '',
    ...(analysis.recommendations.length === 0
      ? ['- Nothing above threshold — keep shipping content and re-run next week.']
      : analysis.recommendations.map(
          (item) => `- **${item.priority.toUpperCase()} · ${item.area}:** ${item.action} _(Metric: ${item.successMetric})_`
        )),
    '',
    '## Approval queue',
    '',
    `Generated ${drafts.length} drafts. Nothing was published and no money was spent — approve in the admin dashboard first.`,
    '',
  ];

  return `${lines.join('\n')}\n`;
}

module.exports = { analyze, buildDrafts, buildReport, rate, percent };
