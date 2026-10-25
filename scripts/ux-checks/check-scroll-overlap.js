#!/usr/bin/env node
/**
 * check-scroll-overlap.js
 *
 * Catches a recurring React Native footgun found in this app's codebase:
 * a `<ScrollView>` inside a height-clamped container (e.g. a bottom-sheet
 * Modal with `maxHeight: 'NN%'`) that sits before a sibling sticky
 * footer (action buttons, CTA bars, etc.) but is missing an explicit
 * `style={{ flex: 1 }}` (or a styles.xxx reference containing `flex: 1`).
 *
 * Without `flex: 1`, Yoga doesn't bound the ScrollView within the clamped
 * parent height, so it fails to scroll properly and long content gets
 * clipped/hidden behind the sticky footer. This exact bug shipped in
 * app/occupations.tsx (watchlist "hidden behind the below buttons") and
 * the same pattern was found (and fixed) in app/watchlist.tsx and
 * components/PaywallModal.tsx.
 *
 * Approach (heuristic, not a full JSX/AST parser):
 *  1. Find every StyleSheet.create() entry whose body contains a
 *     percentage `maxHeight` (e.g. `maxHeight: '85%'`) -- these are our
 *     "sheet container" style names.
 *  2. Find every JSX element in the file that references one of those
 *     style names (via style={styles.NAME} or style={[styles.NAME, ...]}).
 *  3. Within a reasonable window after that element's opening tag, look
 *     for <ScrollView> tags and check whether each one resolves to
 *     flex: 1 (inline or via its own styles.xxx entry).
 *
 * Exit code 0 = clean (or only low-risk findings).
 * Exit code 1 = found HIGH-risk ScrollView(s) (sticky footer sibling detected).
 * Run via `node scripts/ux-checks/check-scroll-overlap.js` or in CI.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SCAN_DIRS = ['app', 'components'];
const IGNORE_DIRS = new Set(['node_modules', '.expo', 'android', 'ios']);

function collectFiles(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, out);
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function extractStyleBodies(source) {
  const styles = {};
  const createMatch = source.match(/StyleSheet\.create\(\{([\s\S]*)\}\s*\)\s*;?\s*$/m);
  const body = createMatch ? createMatch[1] : source;
  const re = /(\w+)\s*:\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g;
  let m;
  while ((m = re.exec(body))) {
    styles[m[1]] = m[2];
  }
  return styles;
}

function styleHasFlex1(styleExpr, styleBodies) {
  if (/flex\s*:\s*1\b/.test(styleExpr)) return true;
  const names = styleExpr.match(/styles\.(\w+)/g) || [];
  for (const n of names) {
    const key = n.replace('styles.', '');
    if (styleBodies[key] && /flex\s*:\s*1\b/.test(styleBodies[key])) return true;
  }
  return false;
}

function checkFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  if (!source.includes('ScrollView')) return [];

  const styleBodies = extractStyleBodies(source);

  // Step 1: which style keys are percentage-height sheet containers?
  const sheetStyleNames = Object.keys(styleBodies).filter((name) =>
    /maxHeight\s*:\s*'\d+%'/.test(styleBodies[name])
  );
  if (sheetStyleNames.length === 0) return [];

  const problems = [];
  const WINDOW = 8000; // chars to look ahead for the ScrollView(s) inside this sheet

  for (const sheetName of sheetStyleNames) {
    // Step 2: find JSX usages of this style name (style={styles.sheetName} or inside an array/object).
    const usageRe = new RegExp('styles\\.' + sheetName + '\\b', 'g');
    let usageMatch;
    while ((usageMatch = usageRe.exec(source))) {
      const usageIndex = usageMatch.index;
      const windowEnd = Math.min(source.length, usageIndex + WINDOW);
      const windowSrc = source.slice(usageIndex, windowEnd);

      const scrollViewRe = /<ScrollView\b([^>]*)>/g;
      let svMatch;
      while ((svMatch = scrollViewRe.exec(windowSrc))) {
        const attrs = svMatch[1];
        const styleAttrMatch = attrs.match(/style=\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/);
        const styleExpr = styleAttrMatch ? styleAttrMatch[1] : '';

        // Sticky footers can be far away in large files (modals can be 1000+
        // lines), so search the whole rest of the file, not just the window.
        const afterSv = source.slice(usageIndex + svMatch.index);
        const hasStickyFooterSibling = /modalStickyFooter|stickyFooter|actionBar|StickyFooter/.test(afterSv);

        if (!styleExpr || !styleHasFlex1(styleExpr, styleBodies)) {
          const line = source.slice(0, usageIndex + svMatch.index).split('\n').length;
          problems.push({
            file: path.relative(ROOT, filePath),
            line,
            riskLevel: hasStickyFooterSibling ? 'HIGH (sticky footer sibling detected)' : 'low (defensive only)',
          });
        }
      }
    }
  }

  // De-dupe (same ScrollView can match multiple sheet-style usages if nested).
  const seen = new Set();
  return problems.filter((p) => {
    const key = p.file + ':' + p.line;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function main() {
  const files = [];
  for (const dir of SCAN_DIRS) {
    const full = path.join(ROOT, dir);
    if (fs.existsSync(full)) collectFiles(full, files);
  }

  const allProblems = [];
  for (const file of files) {
    allProblems.push(...checkFile(file));
  }

  if (allProblems.length === 0) {
    console.log('check-scroll-overlap: no ScrollView-missing-flex:1 risks found near percentage-height sheets.');
    process.exit(0);
  }

  console.log('check-scroll-overlap: found ' + allProblems.length + ' ScrollView(s) that may need style={{ flex: 1 }}:\n');
  for (const p of allProblems) {
    console.log('  ' + p.file + ':' + p.line + ' - risk: ' + p.riskLevel);
  }
  console.log(
    "\nWhy this matters: a ScrollView inside a maxHeight-clamped sheet (e.g. a bottom-sheet Modal) " +
      "without flex: 1 won't be bounded correctly by Yoga, so long content can get clipped or hidden " +
      "behind a sibling sticky footer. Add style={{ flex: 1 }} (or merge flex: 1 into the ScrollView's " +
      "style) to fix. See app/occupations.tsx for the original fix."
  );

  const highRisk = allProblems.filter((p) => p.riskLevel.indexOf('HIGH') === 0);
  process.exit(highRisk.length > 0 ? 1 : 0);
}

main();
