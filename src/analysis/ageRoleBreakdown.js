// Age & Gender Appeal Panel Handler
// Create stub immediately so appShell.js does not error before setup runs.
if (!window.HACAnalysisAgeRoleBreakdown) {
    window.HACAnalysisAgeRoleBreakdown = {
        setupAgeRoleBreakdownListeners: () => {}
    };
}

window.HACAnalysisAgeRoleBreakdown = (function() {
    'use strict';

    const AGE_GROUPS = ['YOUNG', 'MID', 'OLD'];
    const AGE_LABELS = {
        YOUNG: 'Young',
        MID: 'Mid',
        OLD: 'Old'
    };

    let ageRoleData = null;
    let genderSpecificData = null;
    let listenersBound = false;
    let observer = null;
    const genderState = {};

    async function loadAgeRoleData() {
        if (ageRoleData && genderSpecificData) return { ageRoleData, genderSpecificData };
        try {
            const [basicResponse, genderResponse] = await Promise.all([
                fetch('data/age-role-compatibility.json'),
                fetch('data/TagsToAgeCompatibilityData.json')
            ]);
            ageRoleData = await basicResponse.json();
            genderSpecificData = await genderResponse.json();
            return { ageRoleData, genderSpecificData };
        } catch (error) {
            console.warn('Could not load age/role compatibility data:', error);
            return { ageRoleData: null, genderSpecificData: null };
        }
    }

    function getSelectedRoles() {
        const roles = [];

        // Only the script's own roles. The excluded list holds bans, which are by
        // definition not in the script; there is no separate "locked" context.
        const contextSelectors = {
            protagonist: ['#inputs-protagonist-generator'],
            antagonist: ['#inputs-antagonist-generator'],
            supporting: ['#inputs-supporting-character-generator']
        };

        // Check protagonist across all contexts
        contextSelectors.protagonist.forEach(selector => {
            const select = document.querySelector(`${selector} .tag-selector`);
            if (select?.value) {
                roles.push({
                    type: 'protagonist',
                    id: select.value,
                    displayName: select.options[select.selectedIndex].text
                });
            }
        });

        // Check antagonist across all contexts
        contextSelectors.antagonist.forEach(selector => {
            const select = document.querySelector(`${selector} .tag-selector`);
            if (select?.value) {
                roles.push({
                    type: 'antagonist',
                    id: select.value,
                    displayName: select.options[select.selectedIndex].text
                });
            }
        });

        // Check supporting characters across all contexts (can be multiple per context)
        contextSelectors.supporting.forEach(selector => {
            document.querySelectorAll(`${selector} .tag-selector`).forEach(select => {
                if (!select.value) return;
                roles.push({
                    type: 'supporting',
                    id: select.value.replace('SUPPORTINGCHARACTER_', 'SUPPORTING_CHARACTER_'),
                    displayName: select.options[select.selectedIndex].text
                });
            });
        });

        return roles;
    }

    function setGender(roleId, gender) {
        genderState[roleId] = gender;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function normalizeRatingClass(rating) {
        return String(rating || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    function getValidGenders(roleId, data) {
        if (!data?.ageRoleData) return ['M', 'F'];

        const bucket = roleId.includes('PROTAGONIST')
            ? 'protagonists'
            : roleId.includes('ANTAGONIST')
                ? 'antagonists'
                : 'supportingCharacters';
        const roleData = data.ageRoleData[bucket]?.[roleId];

        if (roleData?.locked_gender) {
            return [roleData.locked_gender];
        }
        return ['M', 'F'];
    }

    function createGenderButton(roleId, gender, currentGender, validGenders) {
        if (!validGenders.includes(gender)) return null;

        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = gender === 'M' ? '\u2642' : '\u2640';
        button.className = `gender-btn gender-btn--${gender === 'M' ? 'male' : 'female'}`;
        button.classList.toggle('active', currentGender === gender);
        button.setAttribute('aria-label', `${gender === 'M' ? 'Male' : 'Female'} audience appeal`);
        button.addEventListener('click', event => {
            event.stopPropagation();
            setGender(roleId, gender);
            updateAgeRoleBreakdown();
        });
        return button;
    }

    function createGenderToggle(roleId, data) {
        const validGenders = getValidGenders(roleId, data);
        const currentGender = genderState[roleId] || validGenders[0] || 'M';
        const container = document.createElement('div');
        container.className = 'gender-toggle';
        if (validGenders.length === 1) {
            container.classList.add('gender-toggle--fixed');
            container.title = 'This role has a fixed gender';
            genderState[roleId] = validGenders[0];
        }

        const maleBtn = createGenderButton(roleId, 'M', currentGender, validGenders);
        const femaleBtn = createGenderButton(roleId, 'F', currentGender, validGenders);
        if (maleBtn) container.appendChild(maleBtn);
        if (femaleBtn) container.appendChild(femaleBtn);
        return container;
    }

    function getRatingValue(data, roleId, ageGroup, gender) {
        if (data.genderSpecificData?.[roleId]) {
            const key = `${ageGroup}_${gender}`;
            const numericRating = data.genderSpecificData[roleId][key];
            if (numericRating !== undefined) {
                if (numericRating >= 3.5) return 'Good';
                if (numericRating >= 2.5) return 'Neutral';
                return 'Bad';
            }
        }

        const bucket = roleId.includes('PROTAGONIST')
            ? 'protagonists'
            : roleId.includes('ANTAGONIST')
                ? 'antagonists'
                : 'supportingCharacters';
        const roleData = data.ageRoleData?.[bucket]?.[roleId];
        return roleData?.ratings?.[ageGroup] || roleData?.[ageGroup] || '-';
    }

    function buildAgeTable(roles, data) {
        if (roles.length === 0) {
            return '<p class="age-role-empty-state">Select at least one role to see age appeal.</p>';
        }

        let html = '<div class="age-role-grid" role="table" aria-label="Age and gender appeal ratings">';
        html += '<div class="age-role-grid-header" role="row">';
        html += '<div class="age-role-header-cell age-role-cell-role" role="columnheader">Role</div>';
        AGE_GROUPS.forEach(ageGroup => {
            html += `<div class="age-role-header-cell age-role-cell-rating" role="columnheader">${AGE_LABELS[ageGroup]}</div>`;
        });
        html += '<div class="age-role-header-cell age-role-cell-gender" role="columnheader">Gender</div>';
        html += '</div>';

        roles.forEach(role => {
            const validGenders = getValidGenders(role.id, data);
            const gender = genderState[role.id] || validGenders[0] || 'M';

            html += `<div class="age-role-row age-role-row--${role.type}" role="row">`;
            html += `<div class="age-role-role-name age-role-cell-role" role="cell">${escapeHtml(role.displayName)}</div>`;
            AGE_GROUPS.forEach(ageGroup => {
                const rating = getRatingValue(data, role.id, ageGroup, gender);
                html += `<div class="age-role-rating age-role-rating--${normalizeRatingClass(rating)} age-role-cell-rating" role="cell">${escapeHtml(rating)}</div>`;
            });
            html += `<div id="gender-toggle-${role.type}-${role.id}" class="age-role-gender-slot age-role-cell-gender" role="cell"></div>`;
            html += '</div>';
        });

        html += '</div>';
        return html;
    }

    async function updateAgeRoleBreakdown() {
        const data = await loadAgeRoleData();
        if (!data.ageRoleData) {
            hideAgeRolePanel();
            return;
        }

        const roles = getSelectedRoles();
        if (roles.length === 0) {
            showAgeRolePanel([], data);
            return;
        }

        showAgeRolePanel(roles, data);
    }

    function buildAgeRangesTable(data) {
        if (!data?.ageRoleData?.ageGroups) return '';

        const ageGroups = data.ageRoleData.ageGroups;
        let html = '<div class="age-ranges-reference">';
        html += '<div class="age-ranges-reference-header">';
        html += '<span class="age-ranges-reference-title">Age Ranges</span>';
        html += '<span class="age-ranges-reference-note">Game audience brackets by gender</span>';
        html += '</div>';
        html += '<div class="age-ranges-grid" role="table" aria-label="Age ranges by gender">';
        html += '<div class="age-ranges-grid-header" role="row">';
        html += '<span class="age-ranges-cell age-ranges-cell--gender" role="columnheader">Gender</span>';
        AGE_GROUPS.forEach(ageGroup => {
            html += `<span class="age-ranges-cell age-ranges-cell--group" role="columnheader">${AGE_LABELS[ageGroup]}</span>`;
        });
        html += '</div>';
        ['male', 'female'].forEach(gender => {
            html += '<div class="age-ranges-grid-row" role="row">';
            html += `<span class="age-ranges-cell age-ranges-cell--gender" role="cell">${gender === 'male' ? 'Male' : 'Female'}</span>`;
            AGE_GROUPS.forEach(ageGroup => {
                html += `<span class="age-ranges-cell age-ranges-cell--value" role="cell">${escapeHtml(ageGroups[ageGroup][gender])}</span>`;
            });
            html += '</div>';
        });
        html += '</div>';
        html += '</div>';
        return html;
    }

    function showAgeRolePanel(roles, data) {
        const panel = document.getElementById('ageRoleBreakdownPanel');
        const roleLabel = document.getElementById('ageRoleSelectedRole');
        const tableContainer = document.getElementById('ageRoleTableContainer');
        const insight = document.getElementById('ageRoleInsight');
        if (!panel || !tableContainer) return;

        panel.classList.remove('hidden');
        panel.hidden = false;

        if (roleLabel) {
            const roleNames = roles.map(role => role.displayName).join(', ');
            roleLabel.textContent = roles.length > 0
                ? `Appeal by age group for ${roleNames}.`
                : 'Select at least one role to see age appeal.';
        }

        tableContainer.innerHTML = buildAgeTable(roles, data);

        if (insight) {
            insight.innerHTML = buildAgeRangesTable(data);
        }

        roles.forEach(role => {
            const toggleContainer = document.getElementById(`gender-toggle-${role.type}-${role.id}`);
            if (toggleContainer) {
                toggleContainer.appendChild(createGenderToggle(role.id, data));
            }
        });
    }

    function hideAgeRolePanel() {
        const panel = document.getElementById('ageRoleBreakdownPanel');
        if (!panel) return;
        panel.classList.add('hidden');
        panel.hidden = true;
    }

    function setupAgeRoleBreakdownListeners() {
        if (listenersBound) {
            return;
        }

        document.addEventListener('change', event => {
            if (event.target.classList.contains('tag-selector')) {
                updateAgeRoleBreakdown();
            }
        });

        observer = new MutationObserver(() => updateAgeRoleBreakdown());
        ['locked-content', 'excluded-content'].forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                observer.observe(container, { childList: true, subtree: true });
            }
        });

        listenersBound = true;
        updateAgeRoleBreakdown();
    }

    return {
        setupAgeRoleBreakdownListeners,
        update: updateAgeRoleBreakdown,
        hidePanel: hideAgeRolePanel,
        loadAgeRoleData
    };
})();
