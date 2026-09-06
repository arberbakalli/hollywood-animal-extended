import { test as base, expect } from '@playwright/test';
import { baseFixture } from '@civitas-cerebrum/element-interactions';

export const test = baseFixture(base, 'tests/data/page-repository.json', {
  timeout: 30000,
  // index.html pulls Google Fonts in <head>, and Chrome blocks script execution
  // on a pending stylesheet — so app boot waited on an external CDN.
  blockedOrigins: /fonts\.(googleapis|gstatic)\.com/,
});

export { expect };
