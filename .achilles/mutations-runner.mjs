#!/usr/bin/env node
/**
 * Mutation Testing Runner — P2 Teeth Audit Automation
 *
 * Reads mutations.mjs, injects each mutation into the test environment,
 * runs its expectedCatchers tests, and reports whether each test has teeth
 * (fails when the defect is present).
 *
 * Implementation: Wraps Playwright CLI with environment-based mutation injection.
 * The test environment reads MUTATION_INIT env var and evaluates it in beforeEach.
 *
 * Usage:
 *   node .achilles/mutations-runner.mjs [--verbose] [--mutation <id>]
 *
 * Output:
 *   .achilles/P2_AUDIT_RESULTS.md — full teeth audit report
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Import mutations from mutations.mjs
const mutationsModule = await import('./mutations.mjs');
const { mutations, specs } = mutationsModule;

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
 * Run a single test with a mutation injected via environment variable.
 * The test harness reads MUTATION_INIT and evaluates it in beforeEach.
 * Returns { testId, passed, captured }
 */
function runTestWithMutation(mutation, testId) {
  if (VERBOSE) {
    console.log(`    Running test: ${testId}`);
  }

  // Encode the mutation init code for safe environment variable passing
  const mutationInit = mutation.init || '';

  try {
    // Set the mutation environment and run just this test
    const cmd = `MUTATION_INIT="${mutationInit.replace(/"/g, '\\"')}" npm run test:e2e -- --grep "${testId}" --reporter json`;

    const output = execSync(cmd, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Parse JSON output from Playwright
    const report = JSON.parse(output);
    const passed = report.stats?.failures === 0;

    return { testId, passed, captured: output };
  } catch (error) {
    // Non-zero exit = test failed (which is what we want for mutations with teeth)
    const output = error.stdout || error.message || '';

    // Try to parse JSON output anyway
    try {
      const report = JSON.parse(output);
      const passed = report.stats?.failures === 0;
      return { testId, passed, captured: output };
    } catch (_) {
      // If we can't parse, exit code 1 usually means tests failed
      return {
        testId,
        passed: error.status !== 0, // non-zero = test failed = mutation has teeth
        captured: output,
      };
    }
  }
}

/**
 * Audit a single mutation by running all its expectedCatchers tests.
 * Returns { mutationId, tests: [...], hasTeeth: boolean }
 */
async function auditMutation(mutation) {
  if (VERBOSE) {
    console.log(`\n📋 Auditing mutation: ${mutation.id}`);
    console.log(`   What: ${mutation.what}`);
    console.log(`   Tests: ${mutation.expectedCatchers?.join(', ') || 'none'}`);
  }

  const testResults = [];
  const expectedCatchers = mutation.expectedCatchers || [];

  for (const testId of expectedCatchers) {
    const result = await runTestWithMutation(mutation, testId);
    testResults.push(result);

    if (VERBOSE) {
      const status = result.passed === false ? '❌ RED' : result.passed === true ? '✅ PASS' : '⚠️  ERROR';
      console.log(`   ${status} ${testId}`);
    }
  }

  // A mutation has teeth if ALL its expectedCatchers tests fail (went red)
  const allFailed = testResults.every((r) => r.passed === false);
  const anyError = testResults.some((r) => r.error);

  return {
    mutationId: mutation.id,
    what: mutation.what,
    tc: mutation.tc || mutation.id,
    sourceFile: mutation.sourceFile || 'unknown',
    tests: testResults,
    hasTeeth: allFailed && !anyError,
    vacuous: !allFailed && testResults.every((r) => r.passed === true),
    error: anyError,
  };
}

/**
 * Generate P2 audit markdown report
 */
function generateReport(auditResults) {
  let md = `# P2 Mutation Teeth Audit Report

**Generated:** ${results.timestamp}

## Summary

| Status | Count | % |
|--------|-------|---|
| With Teeth | ${results.summary.withTeeth} | ${((results.summary.withTeeth / results.summary.total) * 100).toFixed(0)}% |
| Vacuous | ${results.summary.vacuous} | ${((results.summary.vacuous / results.summary.total) * 100).toFixed(0)}% |
| Errors | ${results.summary.errors} | ${((results.summary.errors / results.summary.total) * 100).toFixed(0)}% |
| **Total** | **${results.summary.total}** | |

---

## Detailed Results

`;

  for (const audit of auditResults) {
    const status = audit.hasTeeth
      ? '✅ **HAS TEETH**'
      : audit.error
        ? '⚠️ **ERROR**'
        : audit.vacuous
          ? '❌ **VACUOUS**'
          : '⚠️ **INCONCLUSIVE**';

    md += `### ${status} — ${audit.mutationId}

**What:** ${audit.what}

**Test Case:** ${audit.tc}

**Source:** ${audit.sourceFile}

**Tests:**
`;

    for (const test of audit.tests) {
      const testStatus = test.passed === false ? '❌ RED' : test.passed === true ? '✅ PASS' : '⚠️ ERROR';
      md += `- ${testStatus} \`${test.testId}\`\n`;
      if (test.error) {
        md += `  Error: ${test.error}\n`;
      }
    }

    md += '\n';
  }

  md += `---

## Recommendations

`;

  const vacuous = auditResults.filter((a) => a.vacuous);
  const errors = auditResults.filter((a) => a.error);

  if (vacuous.length > 0) {
    md += `### Vacuous Mutations (${vacuous.length})\n\n`;
    md += `These mutations did NOT cause their expectedCatchers tests to fail.\n`;
    md += `Either the guard is not wired correctly, or the test is not actually testing the guard.\n\n`;
    for (const v of vacuous) {
      md += `- **${v.mutationId}** (${v.tc}): Check ${v.sourceFile}\n`;
    }
    md += '\n';
  }

  if (errors.length > 0) {
    md += `### Test Execution Errors (${errors.length})\n\n`;
    md += `These mutations encountered errors during test execution.\n`;
    md += `Verify test infrastructure and Playwright configuration.\n\n`;
    for (const e of errors) {
      md += `- **${e.mutationId}**: ${e.tests[0]?.error || 'unknown'}\n`;
    }
    md += '\n';
  }

  const withTeeth = auditResults.filter((a) => a.hasTeeth);
  if (withTeeth.length > 0) {
    md += `### Proven Guards (${withTeeth.length})\n\n`;
    for (const w of withTeeth) {
      md += `- **${w.mutationId}** (${w.tc}): ${w.tests.map((t) => t.testId).join(', ')}\n`;
    }
  }

  return md;
}

/**
 * Main entry point
 */
async function main() {
  console.log('🧬 Mutation Testing Runner — P2 Teeth Audit\n');
  console.log(`Found ${mutations.length} mutations in .achilles/mutations.mjs`);
  console.log(`Test specs: ${specs.join(', ')}\n`);

  // Filter to just one mutation if --mutation flag provided
  const toAudit = FILTER_MUTATION
    ? mutations.filter((m) => m.id === FILTER_MUTATION)
    : mutations.filter((m) => m.id !== 'noop');

  if (toAudit.length === 0) {
    console.error(`❌ No mutations found to audit (filter: ${FILTER_MUTATION || 'all non-noop'})`);
    process.exit(1);
  }

  console.log(`Auditing ${toAudit.length} mutation(s)...\n`);

  const auditResults = [];

  for (const mutation of toAudit) {
    const audit = await auditMutation(mutation);
    auditResults.push(audit);
    results.mutations.push(audit);
    results.summary.total++;

    if (audit.hasTeeth) {
      results.summary.withTeeth++;
    } else if (audit.vacuous) {
      results.summary.vacuous++;
    } else if (audit.error) {
      results.summary.errors++;
    }
  }

  // Generate report
  const report = generateReport(auditResults);
  const reportPath = path.resolve(__dirname, 'P2_AUDIT_RESULTS.md');

  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`\n✅ Report written to: ${reportPath}`);

  // Print summary
  console.log(`\n📊 Summary:`);
  console.log(`  ✅ With Teeth:  ${results.summary.withTeeth}/${results.summary.total}`);
  console.log(`  ❌ Vacuous:     ${results.summary.vacuous}/${results.summary.total}`);
  console.log(`  ⚠️  Errors:     ${results.summary.errors}/${results.summary.total}`);

  // Exit with error if any vacuous or errors
  if (results.summary.vacuous > 0 || results.summary.errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Runner error:', err);
  process.exit(1);
});
