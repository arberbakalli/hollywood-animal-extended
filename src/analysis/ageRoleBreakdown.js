(function(global) {
    "use strict";

    let ageRoleData = null;
    const genderState = {}; // Track selected gender per role type: { protagonist: 'M', antagonist: 'M', supporting: 'M' }

    const ROLE_COLORS = {
        'protagonist': '#55EA83',
        'antagonist': '#A1B1FF',
        'supporting': '#8BEAFF'
    };

    async function loadAgeRoleData() {
        if (ageRoleData) return ageRoleData;
        try {
            const response = await fetch('data/age-role-compatibility.json');
            ageRoleData = await response.json();
            return ageRoleData;
        } catch (error) {
            console.warn('Could not load age/role compatibility data:', error);
            return null;
        }
    }

    function getSelectedRoles() {
        const roles = [];

        // Protagonist
        const protagonistSelect = document.querySelector(
            '#inputs-protagonist-generator .tag-selector:not([value=""])'
        );
        if (protagonistSelect && protagonistSelect.value) {
            roles.push({ type: 'protagonist', id: protagonistSelect.value, displayName: protagonistSelect.options[protagonistSelect.selectedIndex].text });
        }

        // Antagonist
        const antagonistSelect = document.querySelector(
            '#inputs-antagonist-generator .tag-selector:not([value=""])'
        );
        if (antagonistSelect && antagonistSelect.value) {
            roles.push({ type: 'antagonist', id: antagonistSelect.value, displayName: antagonistSelect.options[antagonistSelect.selectedIndex].text });
        }

        // Supporting Characters
        const supportingSelects = document.querySelectorAll(
            '#inputs-supporting-character-generator .tag-selector'
        );
        supportingSelects.forEach(select => {
            if (select.value) {
                roles.push({ type: 'supporting', id: select.value, displayName: select.options[select.selectedIndex].text });
            }
        });

        return roles;
    }

    function createGenderToggle(roleType) {
        const container = document.createElement('div');
        container.className = 'gender-toggle';
        container.style.cssText = 'display: flex; gap: 6px;';

        const currentGender = genderState[roleType] || 'M';

        // Male button
        const maleBtn = document.createElement('button');
        maleBtn.innerHTML = '♂';
        maleBtn.className = `gender-btn ${currentGender === 'M' ? 'active' : ''}`;
        maleBtn.style.cssText = `
            padding: 4px 10px;
            border: 1px solid ${currentGender === 'M' ? '#55EA83' : '#555'};
            background: ${currentGender === 'M' ? 'rgba(85, 234, 131, 0.15)' : 'transparent'};
            color: ${currentGender === 'M' ? '#55EA83' : '#888'};
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        `;
        maleBtn.onclick = (e) => {
            e.stopPropagation();
            setGender(roleType, 'M');
            updateAgeRoleBreakdown();
        };

        // Female button
        const femaleBtn = document.createElement('button');
        femaleBtn.innerHTML = '♀';
        femaleBtn.className = `gender-btn ${currentGender === 'F' ? 'active' : ''}`;
        femaleBtn.style.cssText = `
            padding: 4px 10px;
            border: 1px solid ${currentGender === 'F' ? '#A1B1FF' : '#555'};
            background: ${currentGender === 'F' ? 'rgba(161, 177, 255, 0.15)' : 'transparent'};
            color: ${currentGender === 'F' ? '#A1B1FF' : '#888'};
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        `;
        femaleBtn.onclick = (e) => {
            e.stopPropagation();
            setGender(roleType, 'F');
            updateAgeRoleBreakdown();
        };

        container.appendChild(maleBtn);
        container.appendChild(femaleBtn);
        return container;
    }

    function setGender(roleType, gender) {
        genderState[roleType] = gender;
    }

    function getGender(roleType) {
        return genderState[roleType] || 'M';
    }

    function buildAgeTable(roles, ageGroups) {
        if (roles.length === 0) {
            return '<p style="color: #999; text-align: center; padding: 20px;">Select at least one role to see age appeal</p>';
        }

        const ROLE_BG_COLORS = {
            'protagonist': 'rgba(80, 128, 88, 0.3)',
            'antagonist': 'rgba(88, 64, 144, 0.3)',
            'supporting': 'rgba(88, 128, 152, 0.3)'
        };

        const ROLE_BORDER_COLORS = {
            'protagonist': '#508058',
            'antagonist': '#584090',
            'supporting': '#588098'
        };

        let html = '<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">';

        roles.forEach(role => {
            const roleType = role.type;
            const genderKey = `${roleType === 'protagonist' ? 'protagonists' : roleType === 'antagonist' ? 'antagonists' : 'supportingCharacters'}`;
            const roleData = ageGroups[genderKey]?.[role.id];

            if (roleData) {
                const roleColor = ROLE_COLORS[roleType];
                const bgColor = ROLE_BG_COLORS[roleType];
                const borderColor = ROLE_BORDER_COLORS[roleType];

                html += `<div style="display: flex; align-items: center; padding: 12px 15px; background: ${bgColor}; border-left: 3px solid ${borderColor}; border-radius: 4px; gap: 15px;">`;

                // Role name
                html += `<div style="flex: 0 0 120px; color: #e0e0e0; font-weight: 500;">${role.displayName}</div>`;

                // Age ratings
                ['YOUNG', 'MID', 'OLD'].forEach(ageGroup => {
                    const rating = roleData[ageGroup];
                    const ratingText = rating || '—';
                    html += `<div style="flex: 1; text-align: center; color: ${roleColor}; font-weight: 500; font-size: 14px;">${ratingText}</div>`;
                });

                // Gender toggle container (on the right)
                html += `<div id="gender-toggle-${roleType}-${role.id}" style="flex: 0 0 auto;"></div>`;

                html += '</div>';
            }
        });

        html += '</div>';

        return html;
    }

    async function updateAgeRoleBreakdown() {
        const data = await loadAgeRoleData();
        if (!data) {
            hideAgeRolePanel();
            return;
        }

        const roles = getSelectedRoles();
        if (roles.length === 0) {
            hideAgeRolePanel();
            return;
        }

        showAgeRolePanel(roles, data);
    }

    function showAgeRolePanel(roles, data) {
        const panel = document.getElementById('ageRoleBreakdownPanel');
        if (!panel) return;

        panel.style.display = 'flex';

        const contentDiv = document.getElementById('age-role-content');
        if (!contentDiv) return;

        // Header
        let headerHtml = '<p style="margin: 0 0 15px 0; color: #999; font-size: 14px;">Select gender to view age appeal ratings:</p>';

        const tableHtml = buildAgeTable(roles, data);

        contentDiv.innerHTML = headerHtml + tableHtml;

        // Append gender toggle buttons to each role row
        roles.forEach(role => {
            const toggleContainer = document.getElementById(`gender-toggle-${role.type}-${role.id}`);
            if (toggleContainer) {
                toggleContainer.appendChild(createGenderToggle(role.type));
            }
        });
    }

    function hideAgeRolePanel() {
        const panel = document.getElementById('ageRoleBreakdownPanel');
        if (panel) panel.style.display = 'none';
    }

    async function initAgeRoleBreakdown() {
        // Initialize gender state with defaults
        genderState['protagonist'] = 'M';
        genderState['antagonist'] = 'M';
        genderState['supporting'] = 'M';

        await updateAgeRoleBreakdown();

        // Listen for role changes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('tag-selector')) {
                updateAgeRoleBreakdown();
            }
        });

        // Listen for role additions/removals
        const observer = new MutationObserver(() => {
            updateAgeRoleBreakdown();
        });

        const lockedContent = document.getElementById('locked-content');
        const excludedContent = document.getElementById('excluded-content');

        if (lockedContent) {
            observer.observe(lockedContent, { childList: true, subtree: true });
        }
        if (excludedContent) {
            observer.observe(excludedContent, { childList: true, subtree: true });
        }
    }

    // Expose to global scope
    global.HACRoleAge = {
        init: initAgeRoleBreakdown,
        update: updateAgeRoleBreakdown,
        hidePanel: hideAgeRolePanel
    };

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAgeRoleBreakdown);
    } else {
        initAgeRoleBreakdown();
    }

})(window);
