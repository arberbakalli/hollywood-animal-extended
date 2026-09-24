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
  {
    id: 'graves-story-elements-lower-bound-broken',
    tc: 'TC03-000004',
    what: 'Remove story-element lower bound check (< 5 elements) in Graves evaluation',
    sourceFile: 'src/evaluation/gravesAudience.js',
    mutation: 'line 57: remove the storyElements.length < 5 check',
    expectedCatchers: ['TC03-000004'],
  },
  {
    id: 'graves-story-elements-upper-bound-broken',
    tc: 'TC03-000036',
    what: 'Remove story-element upper bound check (> 10 elements) in Graves evaluation',
    sourceFile: 'src/evaluation/gravesAudience.js',
    mutation: 'line 62: remove the storyElements.length > 10 check',
    expectedCatchers: ['TC03-000036'],
  },
  {
    id: 'targeted-ads-budget-broken',
    tc: 'TC05-000019',
    what: 'Count raw tags instead of story elements in Build for Target budget check',
    sourceFile: 'src/marketing/targetedAds.js',
    mutation: 'line 84: change storyElementTags to selectedTags in budget comparison',
    expectedCatchers: ['TC05-000019'],
  },
  {
    id: 'exclusion-filter-broken',
    tc: 'TC05-000020',
    what: 'Remove exclusion filter in targeted-ads combination generation',
    sourceFile: 'src/marketing/targetedAds.js',
    mutation: 'line 139: remove !excludedIds.has(t.id) from filter',
    expectedCatchers: ['TC05-000020'],
  },
];
