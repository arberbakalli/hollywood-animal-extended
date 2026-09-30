(function(global) {
    "use strict";

    function setupCollapsibleSections() {
        function setCollapsibleState(toggle, expanded) {
            const targetId = toggle.getAttribute('data-toggle');
            const content = document.getElementById(targetId);
            const chevron = toggle.querySelector('.chevron');

            if (!content || !chevron) return;

            content.classList.toggle('hidden', !expanded);
            content.hidden = !expanded;
            content.setAttribute('aria-hidden', String(!expanded));
            chevron.classList.toggle('rotate-90', expanded);
            toggle.setAttribute('aria-expanded', String(expanded));
        }

        function toggleCollapsible(toggle) {
            const targetId = toggle.getAttribute('data-toggle');
            const content = document.getElementById(targetId);
            if (!content) return;

            setCollapsibleState(toggle, content.classList.contains('hidden'));
        }

        document.querySelectorAll('.collapsible-toggle[data-toggle]').forEach(toggle => {
            const targetId = toggle.getAttribute('data-toggle');
            const content = document.getElementById(targetId);
            if (content) {
                setCollapsibleState(toggle, !content.classList.contains('hidden'));
            }

            toggle.addEventListener('click', function() {
                toggleCollapsible(this);
            });
        });

        // Update excluded count whenever excluded items change
        updateExcludedCount();
        const excludedContainer = document.getElementById('selectors-container-excluded');
        if (excludedContainer) {
            const observer = new MutationObserver(() => updateExcludedCount());
            observer.observe(excludedContainer, { childList: true, subtree: true });
        }
    }

    global.HACCollapsibleSections = {
        setupCollapsibleSections
    };
})(globalThis);
