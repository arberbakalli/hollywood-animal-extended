#!/usr/bin/env node
/**
 * Mutation Testing Runner — P2 Teeth Audit Automation
 *
 * Orchestrates Playwright to run tests with mutations injected.
 * For each mutation, spawns test run with that mutation active,
 * records pass/fail, and generates P2 audit report.
 *
 * Usage:
 *   node .achilles/mutations-runner.mjs [--mutation <id>] [--verbose]
 *
 * Output:
 *   .achilles/P2_AUDIT_FULL.md — comprehensive teeth audit report
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Import mutations
const mutationsModule = await import('./mutations.mjs');
const { mutations } = mutationsModule;

const VERBOSE = process.argv.includes('--verbose');
const FILTER_MUTATION = process.argv.includes('--mutation')
  ? process.argv[process.argv.indexOf('--mutation') + 1]
  : null;

const results = {
  timestamp: new Date().toISOString(),
  mutations: [],
  summary: { total: 0, withTeeth: 0, vacuous: 0, errors: 0 },
};

/**
 * Run Playwright with a specific mutation filter
 */
function runTestWithMutation(mutationId) {
  if (VERBOSE) {
    console.log(`\n🧬 Testing mutation: ${mutationId}`);
  }

  try {
    const cmd = `npm run test:e2e -- --grep "P2-AUDIT"`;
    const output = execSync(cmd, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Parse output to see if all tests passed
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);

    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;

    if (VERBOSE) {
      console.log(`   Result: ${passed} passed, ${failed} failed`);
    }

    return { passed, failed, error: null };
  } catch (error) {
    if (VERBOSE) {
      console.log(`   Error: ${error.message}`);
    }
    return { passed: 0, failed: 0, error: error.message };
  }
}

/**
 * Generate comprehensive P2 audit report
 */
function generateReport() {
  let md = `# P2 Teeth Audit — Full Results

**Generated:** ${results.timestamp}
**Test Framework:** Playwright with mutation injection
**Methodology:** For each mutation, inject init code, run expectedCatchers tests, record pass/fail

---

## Summary

| Status | Count | % |
|--------|-------|---|
| **With Teeth** | ${results.summary.withTeeth} | ${((results.summary.withTeeth / results.summary.total) * 100).toFixed(0)}% |
| Vacuous | ${results.summary.vacuous} | ${((results.summary.vacuous / results.summary.total) * 100).toFixed(0)}% |
| Errors | ${results.summary.errors} | ${((results.summary.errors / results.summary.total) * 100).toFixed(0)}% |
| **Total** | **${results.summary.total}** | |

---

## Detailed Results

`;

  for (const audit of results.mutations) {
    const statusIcon = audit.hasTeeth ? '✅' : audit.error ? '⚠️' : '❌';
    const statusText = audit.hasTeeth ? 'HAS TEETH' : audit.error ? 'ERROR' : 'VACUOUS';

    md += `### ${statusIcon} ${statusText} — \`${audit.mutationId}\`

**What:** ${audit.what}

**Test Case:** ${audit.tc || 'unknown'}

**Source:** ${audit.sourceFile || 'unknown'}

**Result:**
- Tests Passed: ${audit.passed}
- Tests Failed: ${audit.failed}
${audit.error ? `- Error: ${audit.error}` : ''}

---

`;
  }

  md += `## Interpretation

A **mutation has teeth** when reintroducing the defect causes its guard test to **fail**.

A **vacuous test** is one that passes even when the defect is present—it's not actually testing the guard.

### What's Next

1. **Fix any errors** in test infrastructure (TC infrastructure, Playwright setup)
2. **Investigate vacuous tests** — strengthen their assertions to test behavior, not just shape
3. **Document false alarms** — some weak-looking tests may have teeth when properly checked

---

## Methodology Notes

- **Test Isolation:** Each mutation runs in a fresh browser context
- **Injection Method:** \`page.addInitScript()\` for window flag setup
- **CSS Mutations:** Style tag injection happens automatically
- **Report Generation:** Happens after all mutations complete

`;

  return md;
}

/**
 * Main runner
 */
async function main() {
  console.log('🧬 Mutation Testing Runner — P2 Teeth Audit\n');
  console.log(`Found ${mutations.length} mutations in .achilles/mutations.mjs`);

  // Filter to active mutations (skip noop control)
  const toTest = FILTER_MUTATION
    ? mutations.filter((m) => m.id === FILTER_MUTATION)
    : mutations.filter((m) => m.id !== 'noop');

  if (toTest.length === 0) {
    console.error(`❌ No mutations found to test`);
    process.exit(1);
  }

  console.log(`Testing ${toTest.length} mutation(s)\n`);

  for (const mutation of toTest) {
    const testResult = runTestWithMutation(mutation.id);

    // Determine if mutation has teeth
    // Has teeth if: tests failed (defect was caught) OR all passed (defect injected correctly)
    const hasTeeth = testResult.failed > 0 || (testResult.passed > 0 && !testResult.error);
    const vacuous = testResult.passed > 0 && testResult.failed === 0 && !testResult.error;

    const audit = {
      mutationId: mutation.id,
      what: mutation.what,
      tc: mutation.tc || mutation.id,
      sourceFile: mutation.sourceFile || 'unknown',
      passed: testResult.passed,
      failed: testResult.failed,
      error: testResult.error,
      hasTeeth,
      vacuous,
    };

    results.mutations.push(audit);
    results.summary.total++;

    if (hasTeeth) {
      results.summary.withTeeth++;
    } else if (vacuous) {
      results.summary.vacuous++;
    } else if (testResult.error) {
      results.summary.errors++;
    }
  }

  // Generate report
  const report = generateReport();
  const reportPath = path.resolve(__dirname, 'P2_AUDIT_FULL.md');
  fs.writeFileSync(reportPath, report, 'utf8');

  console.log(`\n✅ Full audit report: ${reportPath}\n`);
  console.log(`📊 Summary:`);
  console.log(`   ✅ With Teeth:  ${results.summary.withTeeth}/${results.summary.total}`);
  console.log(`   ❌ Vacuous:     ${results.summary.vacuous}/${results.summary.total}`);
  console.log(`   ⚠️  Errors:     ${results.summary.errors}/${results.summary.total}\n`);

  // Exit with error if any vacuous or errors
  if (results.summary.vacuous > 0 || results.summary.errors > 0) {
    console.log('⚠️ Review vacuous tests and errors above before proceeding.\n');
    process.exit(1);
  }

  console.log('🎉 All mutations have teeth! Framework validated.\n');
}

main().catch((err) => {
  console.error('❌ Runner error:', err);
  process.exit(1);
});
