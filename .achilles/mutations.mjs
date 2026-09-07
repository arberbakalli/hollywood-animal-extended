export const specs = ['tests/e2e/colman-graves.spec.js'];
export const startPath = '/';
export const control = '#app-shell';
export const viewport = { width: 1280, height: 900 };

export const mutations = [
  {
    id: 'noop',
    what: 'harness control - no mutation injected',
  },
  {
    id: 'graves-exclusion-notice-visible',
    ac: 'TC03-000007',
    what: 'Colman Graves exclusion notice is visible even while marked hidden',
    init: `
      (() => {
        const apply = () => {
          const parent = document.head || document.documentElement;
          if (!parent) return setTimeout(apply, 0);
          const style = document.createElement('style');
          style.setAttribute('data-achilles-mutation', 'graves-exclusion-notice-visible');
          style.textContent = '#graves-exclusion-notice.hidden { display: flex !important; }';
          parent.appendChild(style);
        };
        apply();
      })();
    `,
    expectedCatchers: ['TC03-000007'],
    appliedWhen: 'getComputedStyle(document.querySelector("#graves-exclusion-notice")).display==="flex"',
  },
];
