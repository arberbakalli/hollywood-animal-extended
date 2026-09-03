export class TabManager {
    static TABS = Object.freeze({
        GENERATOR: 'generator',
        SYNERGY: 'synergy',
        ADVERTISERS: 'advertisers',
    });

    /**
     * @param {import('./EventBus.js').EventBus} eventBus
     * @param {string} [initialTab]
     */
    constructor(eventBus, initialTab = TabManager.TABS.SYNERGY) {
        this._bus = eventBus;
        this._current = initialTab;
    }

    switchTo(tabName) {
        if (!Object.values(TabManager.TABS).includes(tabName)) {
            console.warn(`TabManager: unknown tab "${tabName}"`);
            return;
        }

        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));

        // Match button by data-tab attribute (set in index.html)
        const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (btn) btn.classList.add('active');

        const content = document.getElementById(`tab-${tabName}`);
        if (content) content.classList.remove('hidden');

        this._current = tabName;
        this._bus.emit('tab:changed', { tab: tabName });
    }

    get current() {
        return this._current;
    }
}
