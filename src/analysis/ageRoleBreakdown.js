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
        container.style.cssText = 'display: flex; gap: 8px; margin-left: auto;';

        const currentGender = genderState[roleType] || 'M';

        // Male button
        const maleBtn = document.createElement('button');
        maleBtn.innerHTML = '♂';
        maleBtn.className = `gender-btn ${currentGender === 'M' ? 'active' : ''}`;
        maleBtn.style.cssText = `
            padding: 6px 12px;
            border: 1px solid ${currentGender === 'M' ? '#55EA83' : '#666'};
            background: ${currentGender === 'M' ? 'rgba(85, 234, 131, 0.2)' : 'transparent'};
            color: ${currentGender === 'M' ? '#55EA83' : '#999'};
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
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
            padding: 6px 12px;
            border: 1px solid ${currentGender === 'F' ? '#A1B1FF' : '#666'};
            background: ${currentGender === 'F' ? 'rgba(161, 177, 255, 0.2)' : 'transparent'};
            color: ${currentGender === 'F' ? '#A1B1FF' : '#999'};
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
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

        let html = '<div style="overflow-x: auto;">';
        html += '<table class="age-appeal-table" style="width: 100%; border-collapse: collapse; margin-top: 15px;">';
        html += '<thead><tr style="border-bottom: 2px solid #333;">';
        html += '<th style="padding: 10px; text-align: left; color: #ccc;">Role</th>';
        html += '<th style="padding: 10px; text-align: center; color: #ccc;">Young</th>';
        html += '<th style="padding: 10px; text-align: center; color: #ccc;">Mid</th>';
        html += '<th style="padding: 10px; text-align: center; color: #ccc;">Old</th>';
        html += '</tr></thead><tbody>';

        roles.forEach((role, idx) => {
            const roleType = role.type;
            const gender = getGender(roleType);
            const genderKey = `${roleType === 'protagonist' ? 'protagonists' : roleType === 'antagonist' ? 'antagonists' : 'supportingCharacters'}`;
            const roleData = ageGroups[genderKey]?.[role.id];

            if (roleData) {
                const bgColor = idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';
                const roleColor = ROLE_COLORS[roleType];
                html += `<tr style="border-bottom: 1px solid #333; background: ${bgColor};">`;
                html += `<td style="padding: 10px; color: #ccc;">${role.displayName}</td>`;

                ['YOUNG', 'MID', 'OLD'].forEach(ageGroup => {
                    const rating = roleData[ageGroup];
                    const ratingText = rating || '—';
                    html += `<td style="padding: 10px; text-align: center; color: ${roleColor}; font-weight: 500;">${ratingText}</td>`;
                });

                html += '</tr>';
            }
        });

        html += '</tbody></table>';
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

        // Add gender toggles for each role type
        let headerHtml = '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 15px;">';
        headerHtml += '<p style="margin: 0; color: #999; font-size: 14px;">Select gender to view age appeal ratings:</p>';
        headerHtml += '<div style="display: flex; gap: 20px;">';

        // Add toggle for protagonist if selected
        if (roles.some(r => r.type === 'protagonist')) {
            headerHtml += '<div style="display: flex; align-items: center; gap: 8px;">';
            headerHtml += '<span style="color: #55EA83; font-size: 12px; font-weight: bold;">Protagonist</span>';
            headerHtml += '<div id="gender-toggle-protagonist"></div>';
            headerHtml += '</div>';
        }

        // Add toggle for antagonist if selected
        if (roles.some(r => r.type === 'antagonist')) {
            headerHtml += '<div style="display: flex; align-items: center; gap: 8px;">';
            headerHtml += '<span style="color: #A1B1FF; font-size: 12px; font-weight: bold;">Antagonist</span>';
            headerHtml += '<div id="gender-toggle-antagonist"></div>';
            headerHtml += '</div>';
        }

        // Add toggle for supporting if selected
        if (roles.some(r => r.type === 'supporting')) {
            headerHtml += '<div style="display: flex; align-items: center; gap: 8px;">';
            headerHtml += '<span style="color: #8BEAFF; font-size: 12px; font-weight: bold;">Supporting</span>';
            headerHtml += '<div id="gender-toggle-supporting"></div>';
            headerHtml += '</div>';
        }

        headerHtml += '</div></div>';

        const tableHtml = buildAgeTable(roles, data);

        contentDiv.innerHTML = headerHtml + tableHtml;

        // Append gender toggle buttons
        if (roles.some(r => r.type === 'protagonist')) {
            const protoToggleContainer = document.getElementById('gender-toggle-protagonist');
            if (protoToggleContainer) {
                protoToggleContainer.appendChild(createGenderToggle('protagonist'));
            }
        }

        if (roles.some(r => r.type === 'antagonist')) {
            const antToggleContainer = document.getElementById('gender-toggle-antagonist');
            if (antToggleContainer) {
                antToggleContainer.appendChild(createGenderToggle('antagonist'));
            }
        }

        if (roles.some(r => r.type === 'supporting')) {
            const suppToggleContainer = document.getElementById('gender-toggle-supporting');
            if (suppToggleContainer) {
                suppToggleContainer.appendChild(createGenderToggle('supporting'));
            }
        }
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
